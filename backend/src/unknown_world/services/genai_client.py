"""Unknown World - GenAI 클라이언트 래퍼.

이 모듈은 API 키 인증 기반의 google-genai 클라이언트를 제공합니다.
환경변수로 실제 모델과 mock 모드를 전환할 수 있습니다.

인증 방식 (U-080 핫픽스: Vertex AI 제거):
    - GOOGLE_API_KEY 환경변수로 API 키 인증 (필수)
    - https://aistudio.google.com/apikey 에서 발급

모드 전환 (페어링 질문 Q1 결정: Option A):
    - 환경변수 UW_MODE=mock → MockGenAIClient (테스트/개발용)
    - 환경변수 UW_MODE=real → 실제 Gemini API 호출 (기본값)

보안 규칙:
    - API 키는 환경변수로만 관리 (RULE-007)
    - 프롬프트 원문/비밀정보 로깅 금지 (RULE-007/008)
    - 로그에는 라벨/버전/정책 메타만 노출

참조:
    - vibe/tech-stack.md (google-genai==1.56.0)
    - vibe/unit-plans/U-080[Mvp].md (Vertex AI 제거)
    - .cursor/rules/20-backend-orchestrator.mdc
    - .cursor/rules/00-core-critical.mdc (RULE-007/010)
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncGenerator
from dataclasses import dataclass, field
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from unknown_world.config.models import ModelLabel, get_model_id

if TYPE_CHECKING:
    from google.genai import Client
    from google.genai.types import GenerateContentConfig

# =============================================================================
# 로거 설정 (프롬프트/비밀정보 노출 금지)
# =============================================================================

logger = logging.getLogger(__name__)


class GenAIMode(StrEnum):
    """GenAI 클라이언트 동작 모드.

    환경변수 UW_MODE로 제어합니다.
    """

    MOCK = "mock"
    """테스트/개발용 모의 모드 - 실제 API 호출 없음"""

    REAL = "real"
    """실제 Vertex AI 호출 모드 (기본값)"""


# =============================================================================
# 환경변수 키 상수
# =============================================================================

ENV_UW_MODE = "UW_MODE"
"""동작 모드 환경변수 (mock|real)"""

ENV_GOOGLE_API_KEY = "GOOGLE_API_KEY"
"""Gemini API 키 환경변수 (필수)"""


# =============================================================================
# 요청/응답 데이터 클래스
# =============================================================================


@dataclass
class GenerateRequest:
    """텍스트 생성 요청.

    Attributes:
        prompt: 생성 프롬프트 (주의: 로깅 금지)
        model_label: 모델 라벨 (FAST, QUALITY 등)
        max_tokens: 최대 토큰 수 (선택)
        temperature: 온도 설정 (선택, 0.0~1.0)
        response_mime_type: 응답 MIME 타입 (예: "application/json")
        response_schema: 응답 JSON 스키마 (dict 또는 Pydantic 모델 타입)
    """

    prompt: str
    model_label: ModelLabel = ModelLabel.FAST
    max_tokens: int | None = None
    temperature: float | None = None
    response_mime_type: str | None = None
    response_schema: Any | None = None


@dataclass
class GenerateResponse:
    """텍스트 생성 응답.

    Attributes:
        text: 생성된 텍스트
        model_label: 사용된 모델 라벨
        finish_reason: 종료 이유 (stop, length 등)
        usage: 토큰 사용량 정보 (선택)
    """

    text: str
    model_label: ModelLabel
    finish_reason: str = "stop"
    usage: dict[str, int] = field(default_factory=lambda: {})


# =============================================================================
# Mock 클라이언트 구현
# =============================================================================


class MockGenAIClient:
    """테스트/개발용 모의 GenAI 클라이언트.

    실제 API를 호출하지 않고 고정된 응답을 반환합니다.
    자격 증명 미설정 시 자동으로 이 클라이언트가 사용됩니다.
    """

    def __init__(self) -> None:
        """MockGenAIClient를 초기화합니다."""
        logger.info(
            "[GenAI] Mock 모드로 초기화됨 (실제 API 호출 없음)",
            extra={"mode": GenAIMode.MOCK},
        )

    @property
    def mode(self) -> GenAIMode:
        """현재 동작 모드."""
        return GenAIMode.MOCK

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        """모의 텍스트를 생성합니다.

        Args:
            request: 생성 요청

        Returns:
            고정된 모의 응답
        """
        # 로그에는 메타 정보만 기록 (프롬프트 원문 금지 - RULE-007/008)
        logger.debug(
            "[GenAI] Mock 생성 요청",
            extra={
                "model_label": request.model_label,
                "max_tokens": request.max_tokens,
            },
        )

        return GenerateResponse(
            text=f"[Mock Response] 이것은 {request.model_label} 모델의 모의 응답입니다.",
            model_label=request.model_label,
            finish_reason="stop",
            usage={"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        )

    async def generate_stream(self, request: GenerateRequest) -> AsyncGenerator[str]:
        """모의 텍스트를 스트리밍으로 생성합니다.

        Args:
            request: 생성 요청

        Yields:
            고정된 모의 텍스트 청크
        """
        logger.debug(
            "[GenAI] Mock 스트리밍 요청",
            extra={"model_label": request.model_label},
        )

        chunks = [
            "[Mock] ",
            "이것은 ",
            f"{request.model_label} ",
            "모델의 ",
            "스트리밍 ",
            "모의 응답입니다.",
        ]
        for chunk in chunks:
            yield chunk

    def is_available(self) -> bool:
        """Mock 클라이언트는 항상 사용 가능합니다."""
        return True


# =============================================================================
# 실제 GenAI 클라이언트 구현
# =============================================================================


class GenAIClient:
    """API 키 기반 실제 GenAI 클라이언트.

    google-genai SDK를 사용하여 Gemini 모델을 호출합니다.
    GOOGLE_API_KEY 환경변수로 API 키 인증을 수행합니다.

    U-080 핫픽스: Vertex AI 서비스 계정 인증 완전 제거, API 키 전용
    """

    def __init__(
        self,
        api_key: str | None = None,
    ) -> None:
        """GenAIClient를 초기화합니다.

        Args:
            api_key: Gemini API 키 (환경변수 GOOGLE_API_KEY 사용 가능)

        Raises:
            RuntimeError: API 키가 설정되지 않은 경우
        """
        self._api_key = api_key or os.environ.get(ENV_GOOGLE_API_KEY)
        self._client: Client | None = None
        self._available = False

        self._initialize_client()

    def _initialize_client(self) -> None:
        """google-genai 클라이언트를 초기화합니다."""
        try:
            if not self._api_key:
                logger.warning(
                    "[GenAI] GOOGLE_API_KEY 환경변수가 설정되지 않음 - Mock 모드로 전환 권장",
                )
                self._available = False
                return

            from google.genai import Client

            # API 키 모드로 클라이언트 초기화 (Vertex AI 제거)
            # vertexai=False (기본값)로 API 키 인증 사용
            self._client = Client(api_key=self._api_key)
            self._available = True

            # 로그에는 초기화 성공 여부만 기록 (API 키 노출 금지 - RULE-007)
            logger.info(
                "[GenAI] API 키 클라이언트 초기화 완료",
                extra={
                    "mode": GenAIMode.REAL,
                    "auth": "api_key",
                },
            )
        except Exception as e:
            # 인증 실패 시에도 앱이 멈추지 않도록 로깅만 수행
            # 오류 상세(스택트레이스)에 비밀정보가 포함될 수 있으므로 exc_info=False
            logger.warning(
                "[GenAI] API 키 클라이언트 초기화 실패 - Mock 모드로 전환 권장",
                extra={"error_type": type(e).__name__},
            )
            self._available = False

    @property
    def mode(self) -> GenAIMode:
        """현재 동작 모드."""
        return GenAIMode.REAL

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        """텍스트를 생성합니다.

        Args:
            request: 생성 요청

        Returns:
            생성된 텍스트 응답

        Raises:
            RuntimeError: 클라이언트가 사용 불가능한 경우
        """
        if not self._available or self._client is None:
            raise RuntimeError("GenAI 클라이언트가 초기화되지 않았습니다.")

        model_id = get_model_id(request.model_label)

        # 로그에는 메타 정보만 기록 (프롬프트 원문 금지 - RULE-007/008)
        logger.debug(
            "[GenAI] 생성 요청",
            extra={
                "model_label": request.model_label,
                "model_id": model_id,
                "max_tokens": request.max_tokens,
            },
        )

        # google-genai SDK 호출
        from google.genai.types import GenerateContentConfig

        config_dict: dict[str, Any] = {}
        if request.max_tokens:
            config_dict["max_output_tokens"] = request.max_tokens
        if request.temperature is not None:
            config_dict["temperature"] = request.temperature
        if request.response_mime_type:
            config_dict["response_mime_type"] = request.response_mime_type
        if request.response_schema:
            config_dict["response_schema"] = request.response_schema

        config: GenerateContentConfig | None = (
            GenerateContentConfig(**config_dict) if config_dict else None
        )

        response = await self._client.aio.models.generate_content(  # type: ignore[reportUnknownMemberType]
            model=model_id,
            contents=request.prompt,
            config=config,
        )

        # 응답 파싱
        text = response.text if hasattr(response, "text") and response.text else str(response)
        finish_reason = "stop"
        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, "finish_reason"):
                finish_reason = str(candidate.finish_reason)

        # 토큰 사용량 추출
        usage: dict[str, int] = {}
        if hasattr(response, "usage_metadata") and response.usage_metadata:
            meta = response.usage_metadata
            if hasattr(meta, "prompt_token_count") and meta.prompt_token_count is not None:
                usage["prompt_tokens"] = meta.prompt_token_count
            if hasattr(meta, "candidates_token_count") and meta.candidates_token_count is not None:
                usage["completion_tokens"] = meta.candidates_token_count
            if hasattr(meta, "total_token_count") and meta.total_token_count is not None:
                usage["total_tokens"] = meta.total_token_count

        return GenerateResponse(
            text=text,
            model_label=request.model_label,
            finish_reason=finish_reason,
            usage=usage,
        )

    async def generate_stream(self, request: GenerateRequest) -> AsyncGenerator[str]:
        """텍스트를 스트리밍으로 생성합니다.

        Args:
            request: 생성 요청

        Yields:
            생성된 텍스트 청크

        Raises:
            RuntimeError: 클라이언트가 사용 불가능한 경우
        """
        if not self._available or self._client is None:
            raise RuntimeError("GenAI 클라이언트가 초기화되지 않았습니다.")

        model_id = get_model_id(request.model_label)

        logger.debug(
            "[GenAI] 스트리밍 요청",
            extra={
                "model_label": request.model_label,
                "model_id": model_id,
            },
        )

        from google.genai.types import GenerateContentConfig

        config_dict: dict[str, Any] = {}
        if request.max_tokens:
            config_dict["max_output_tokens"] = request.max_tokens
        if request.temperature is not None:
            config_dict["temperature"] = request.temperature
        if request.response_mime_type:
            config_dict["response_mime_type"] = request.response_mime_type
        if request.response_schema:
            config_dict["response_schema"] = request.response_schema

        config: GenerateContentConfig | None = (
            GenerateContentConfig(**config_dict) if config_dict else None
        )

        stream = await self._client.aio.models.generate_content_stream(  # type: ignore[reportUnknownMemberType]
            model=model_id,
            contents=request.prompt,
            config=config,
        )
        async for chunk in stream:
            if hasattr(chunk, "text") and chunk.text:
                yield chunk.text

    def is_available(self) -> bool:
        """클라이언트가 사용 가능한 상태인지 확인합니다."""
        return self._available


# =============================================================================
# 팩토리 함수
# =============================================================================

# 클라이언트 타입 (Protocol 대신 Union 사용 - pyright 호환성)
GenAIClientType = MockGenAIClient | GenAIClient

# 싱글톤 클라이언트 인스턴스 캐시
_client_instance: GenAIClientType | None = None


def get_genai_client(
    *,
    force_mock: bool = False,
    force_new: bool = False,
) -> GenAIClientType:
    """GenAI 클라이언트 인스턴스를 반환합니다.

    환경변수 UW_MODE에 따라 실제 클라이언트 또는 Mock 클라이언트를 반환합니다.
    기본적으로 싱글톤 패턴으로 동작합니다.

    Args:
        force_mock: True면 환경변수와 무관하게 Mock 클라이언트 반환
        force_new: True면 캐시를 무시하고 새 인스턴스 생성

    Returns:
        GenAI 클라이언트 인스턴스

    Example:
        >>> client = get_genai_client()
        >>> response = await client.generate(GenerateRequest(prompt="Hello"))
    """
    global _client_instance

    if not force_new and _client_instance is not None:
        return _client_instance

    # 모드 결정: force_mock > 환경변수 > 기본값(real)
    if force_mock:
        mode = GenAIMode.MOCK
    else:
        mode_str = os.environ.get(ENV_UW_MODE, GenAIMode.REAL)
        mode = GenAIMode(mode_str) if mode_str in GenAIMode.__members__.values() else GenAIMode.REAL

    # 클라이언트 생성
    client_result: GenAIClientType
    if mode == GenAIMode.MOCK:
        client_result = MockGenAIClient()
    else:
        client = GenAIClient()
        # 실제 클라이언트 초기화 실패 시 Mock으로 폴백
        if not client.is_available():
            logger.warning(
                "[GenAI] 실제 클라이언트 초기화 실패, Mock 모드로 폴백",
            )
            client_result = MockGenAIClient()
        else:
            client_result = client

    _client_instance = client_result
    return client_result


def reset_genai_client() -> None:
    """GenAI 클라이언트 캐시를 초기화합니다.

    테스트 시 클라이언트를 재설정할 때 사용합니다.
    """
    global _client_instance
    _client_instance = None
