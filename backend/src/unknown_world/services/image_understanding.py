"""Unknown World - 이미지 이해(Scanner) 서비스.

이 모듈은 사용자가 업로드한 이미지를 분석하여 캡션, 오브젝트(bbox),
아이템 후보를 추출하는 서비스를 제공합니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 (텍스트-only 캡션)
    - RULE-007: 프롬프트 원문/비밀정보 노출 금지
    - RULE-009: bbox는 0~1000 정규화 + [ymin, xmin, ymax, xmax]

페어링 질문 결정:
    - Q1: Option A (multipart 업로드로 처리)

참조:
    - vibe/unit-plans/U-021[Mvp].md
    - vibe/tech-stack.md (비전 모델: gemini-3-flash-preview)
    - .cursor/rules/00-core-critical.mdc
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import time
import uuid
from typing import TYPE_CHECKING, Any, cast

from unknown_world.config.models import ModelLabel, get_model_id
from unknown_world.models.scanner import (
    DetectedObject,
    ItemCandidate,
    ScanResult,
    ScanStatus,
)
from unknown_world.models.turn import Box2D, Language
from unknown_world.orchestrator.prompt_loader import load_prompt
from unknown_world.services.genai_client import ENV_UW_MODE, GenAIMode
from unknown_world.storage.validation import (
    ALLOWED_IMAGE_MIME_TYPES,
    BBOX_MAX,
    BBOX_MIN,
    MAX_IMAGE_FILE_SIZE_BYTES,
    validate_image_upload,
)

if TYPE_CHECKING:
    from google.genai import Client

# =============================================================================
# 로거 설정 (프롬프트/비밀정보 노출 금지)
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 호환성을 위한 상수 별칭 (api/scanner.py에서 import)
# =============================================================================

ALLOWED_MIME_TYPES = ALLOWED_IMAGE_MIME_TYPES
"""지원하는 이미지 MIME 타입 (호환성 별칭)."""

MAX_FILE_SIZE_BYTES = MAX_IMAGE_FILE_SIZE_BYTES
"""최대 이미지 파일 크기 (호환성 별칭)."""

# =============================================================================
# 재시도 설정 (U-094: ImageUnderstanding 응답 파싱 예외 시 자동 재시도)
# =============================================================================

SCAN_MAX_RETRIES = 2
"""최대 재시도 횟수 (총 3회 시도: 1 초기 + 2 재시도)."""

SCAN_RETRY_BACKOFF_SECONDS: list[float] = [1.0, 2.0]
"""재시도 간 백오프 시간 (초)."""

SCAN_RETRY_REINFORCEMENT: dict[Language, str] = {
    Language.KO: (
        "\n\n⚠️ 중요: 반드시 유효한 JSON 형식으로만 응답하세요. "
        "마크다운 코드 블록(```)을 사용하지 말고 순수 JSON만 반환하세요."
    ),
    Language.EN: (
        "\n\n⚠️ IMPORTANT: You MUST respond with valid JSON format only. "
        "Do NOT use markdown code blocks (```). Return pure JSON only."
    ),
}
"""재시도 시 추가되는 JSON 형식 강조 지시 (U-094 Q1: Option B)."""

# =============================================================================
# 아이템 수 랜덤화 설정 (U-095: Scanner 아이템 생성 개수 랜덤화)
# =============================================================================

SCAN_ITEM_COUNT_POPULATION: list[int] = [1, 2, 3]
"""생성 가능한 아이템 개수."""

SCAN_ITEM_COUNT_WEIGHTS: list[int] = [60, 30, 10]
"""아이템 개수별 가중치 (1개=60%, 2개=30%, 3개=10%)."""


def determine_item_count() -> int:
    """Scanner 아이템 생성 개수를 가중치 랜덤으로 결정합니다 (U-095).

    확률 분포:
        - 1개: 60%
        - 2개: 30%
        - 3개: 10%

    Returns:
        1~3 사이의 정수
    """
    return random.choices(
        population=SCAN_ITEM_COUNT_POPULATION,
        weights=SCAN_ITEM_COUNT_WEIGHTS,
        k=1,
    )[0]


_NON_RETRYABLE_ERROR_NAMES: frozenset[str] = frozenset(
    {
        "Unauthenticated",
        "PermissionDenied",
        "ResourceExhausted",
        "InvalidArgument",
        "NotFound",
    }
)
"""재시도 불가 API 에러 타입 이름 (인증/할당량/권한 등)."""


# =============================================================================
# Mock 서비스 구현
# =============================================================================


def _create_mock_scan_result(language: Language, item_count: int = 2) -> ScanResult:
    """Mock 스캔 결과를 생성합니다.

    U-095: item_count에 따라 1~3개의 아이템을 반환합니다.

    Args:
        language: 응답 언어
        item_count: 생성할 아이템 수 (1~3)

    Returns:
        Mock 스캔 결과 (item_count에 맞춘 아이템 목록)
    """
    # Mock 아이템 풀 (최대 3개) - 언어별
    _MOCK_ITEMS_KO: list[tuple[str, str, str, str]] = [
        ("녹슨 열쇠", "오래된 자물쇠를 열 수 있을 것 같은 열쇠입니다.", "key", "열쇠"),
        ("나무 상자", "무언가 들어있을 것 같은 작은 상자입니다.", "container", "상자"),
        ("깨진 수정", "희미하게 빛나는 수정 조각입니다.", "material", "수정"),
    ]
    _MOCK_ITEMS_EN: list[tuple[str, str, str, str]] = [
        ("Rusty Key", "An old key that might open an ancient lock.", "key", "Key"),
        ("Wooden Box", "A small box that might contain something.", "container", "Box"),
        ("Broken Crystal", "A faintly glowing crystal shard.", "material", "Crystal"),
    ]

    # Mock bbox 풀
    _MOCK_BBOXES: list[Box2D] = [
        Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
        Box2D(ymin=400, xmin=100, ymax=700, xmax=500),
        Box2D(ymin=200, xmin=500, ymax=450, xmax=750),
    ]
    _MOCK_CONFIDENCES: list[float] = [0.95, 0.88, 0.82]

    items_pool = _MOCK_ITEMS_KO if language == Language.KO else _MOCK_ITEMS_EN
    count = max(1, min(3, item_count))  # 1~3 클램핑

    objects: list[DetectedObject] = []
    candidates: list[ItemCandidate] = []
    for i in range(count):
        label, desc, item_type, obj_label = items_pool[i]
        objects.append(
            DetectedObject(
                label=obj_label,
                box_2d=_MOCK_BBOXES[i],
                confidence=_MOCK_CONFIDENCES[i],
                suggested_item_type=item_type,
            ),
        )
        candidates.append(
            ItemCandidate(
                id=f"item_{uuid.uuid4().hex[:8]}",
                label=label,
                description=desc,
                item_type=item_type,
                source_object_index=i,
            ),
        )

    caption_ko = "[Mock] 테스트 이미지입니다. 여러 오브젝트가 감지되었습니다."
    caption_en = "[Mock] Test image. Multiple objects detected."

    return ScanResult(
        status=ScanStatus.COMPLETED,
        caption=caption_ko if language == Language.KO else caption_en,
        objects=objects,
        item_candidates=candidates,
        message=None,
        analysis_time_ms=150,
    )


# =============================================================================
# 유틸리티 함수
# =============================================================================


def validate_image(
    content: bytes,
    content_type: str,
) -> str | None:
    """이미지 파일을 검증합니다.

    NOTE: 이 함수는 호환성을 위해 유지되며, 내부적으로
    중앙화된 validate_image_upload를 호출합니다.

    Args:
        content: 이미지 바이트 데이터
        content_type: MIME 타입

    Returns:
        에러 메시지 (없으면 None)
    """
    return validate_image_upload(content, content_type, language=Language.KO)


def normalize_bbox(bbox: dict[str, Any]) -> Box2D:
    """bbox를 0~1000 범위로 정규화합니다.

    Args:
        bbox: 원본 bbox dict

    Returns:
        정규화된 Box2D
    """
    # 기본값
    ymin_val: int = int(bbox.get("ymin", 0) or 0)
    xmin_val: int = int(bbox.get("xmin", 0) or 0)
    ymax_val: int = int(bbox.get("ymax", BBOX_MAX) or BBOX_MAX)
    xmax_val: int = int(bbox.get("xmax", BBOX_MAX) or BBOX_MAX)

    # 범위 클램핑 (RULE-009)
    ymin_val = max(BBOX_MIN, min(BBOX_MAX, ymin_val))
    xmin_val = max(BBOX_MIN, min(BBOX_MAX, xmin_val))
    ymax_val = max(BBOX_MIN, min(BBOX_MAX, ymax_val))
    xmax_val = max(BBOX_MIN, min(BBOX_MAX, xmax_val))

    # ymin < ymax, xmin < xmax 보장
    if ymin_val >= ymax_val:
        ymax_val = min(ymin_val + 100, BBOX_MAX)
    if xmin_val >= xmax_val:
        xmax_val = min(xmin_val + 100, BBOX_MAX)

    return Box2D(ymin=ymin_val, xmin=xmin_val, ymax=ymax_val, xmax=xmax_val)


def _create_fallback_result(
    message: str,
    status: ScanStatus = ScanStatus.FAILED,
) -> ScanResult:
    """안전한 폴백 결과를 생성합니다 (RULE-004).

    Args:
        message: 에러/상태 메시지
        status: 스캔 상태

    Returns:
        스키마를 준수하는 폴백 ScanResult
    """
    return ScanResult(
        status=status,
        caption="",
        objects=[],
        item_candidates=[],
        message=message,
        analysis_time_ms=0,
    )


def _parse_vision_response(
    response_text: str,
    language: Language,  # noqa: ARG001
) -> ScanResult:
    """비전 모델 응답을 파싱합니다.

    Args:
        response_text: 모델 응답 텍스트 (JSON 예상)
        language: 응답 언어 (현재 사용되지 않음)

    Returns:
        파싱된 ScanResult
    """
    try:
        # JSON 파싱
        # 응답에 ```json ... ``` 마크다운이 포함된 경우 처리
        text = response_text.strip()
        if text.startswith("```"):
            # 첫 번째 줄 제거 (```json)
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            # 마지막 줄 제거 (```)
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        parsed = json.loads(text)

        # dict가 아닌 경우 처리 (이중 직렬화된 문자열 등)
        if isinstance(parsed, str):
            # 한 번 더 파싱 시도
            parsed = json.loads(parsed)

        if not isinstance(parsed, dict):
            raise ValueError(f"Expected dict, got {type(parsed).__name__}")

        data = cast(dict[str, Any], parsed)

        # caption 추출
        caption: str = str(data.get("caption", "") or "")

        # objects 추출 및 정규화
        objects: list[DetectedObject] = []
        raw_objects: list[dict[str, Any]] = data.get("objects") or []  # type: ignore[assignment]
        for i, obj in enumerate(raw_objects[:10]):  # 최대 10개
            if not isinstance(obj, dict):  # type: ignore[reportUnnecessaryIsInstance]
                continue

            label_val = obj.get("label")
            label: str = str(label_val) if label_val else f"Object_{i}"
            bbox_raw: dict[str, Any] = obj.get("box_2d") or {}  # type: ignore[assignment]
            bbox = normalize_bbox(bbox_raw)
            confidence_raw = obj.get("confidence")
            suggested_type_raw = obj.get("suggested_item_type")

            objects.append(
                DetectedObject(
                    label=label,
                    box_2d=bbox,
                    confidence=float(confidence_raw) if confidence_raw is not None else None,  # type: ignore[arg-type]
                    suggested_item_type=str(suggested_type_raw) if suggested_type_raw else None,  # type: ignore[arg-type]
                )
            )

        # item_candidates 추출
        item_candidates: list[ItemCandidate] = []
        raw_items: list[dict[str, Any]] = data.get("item_candidates") or []  # type: ignore[assignment]
        for i, item in enumerate(raw_items[:10]):  # 최대 10개
            if not isinstance(item, dict):  # type: ignore[reportUnnecessaryIsInstance]
                continue

            id_val = item.get("id")
            label_val = item.get("label")
            desc_val = item.get("description")
            type_val = item.get("item_type")
            source_idx = item.get("source_object_index")

            item_candidates.append(
                ItemCandidate(
                    id=str(id_val) if id_val else f"item_{uuid.uuid4().hex[:8]}",
                    label=str(label_val) if label_val else f"Item_{i}",
                    description=str(desc_val) if desc_val else "",
                    item_type=str(type_val) if type_val else "material",
                    source_object_index=int(source_idx) if source_idx is not None else None,  # type: ignore[arg-type]
                )
            )

        return ScanResult(
            status=ScanStatus.COMPLETED,
            caption=caption,
            objects=objects,
            item_candidates=item_candidates,
            message=None,
            analysis_time_ms=0,  # 호출자에서 설정
        )

    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(
            "[ImageUnderstanding] JSON 파싱 실패",
            extra={"error": str(e), "error_type": type(e).__name__},
        )
        # 부분 결과로 캡션만 반환 (RULE-004)
        return ScanResult(
            status=ScanStatus.PARTIAL,
            caption=response_text[:500] if response_text else "",
            objects=[],
            item_candidates=[],
            message="오브젝트 감지 결과를 파싱할 수 없습니다. 캡션만 제공됩니다.",
            analysis_time_ms=0,
        )
    except Exception as e:
        logger.error(
            "[ImageUnderstanding] 응답 파싱 중 예외",
            extra={"error_type": type(e).__name__},
        )
        return _create_fallback_result(f"응답 처리 중 오류: {type(e).__name__}")


# =============================================================================
# 아이템 개수 검증/조정 (U-095)
# =============================================================================


def _adjust_item_count(result: ScanResult, target_count: int) -> ScanResult:
    """모델이 반환한 아이템 수를 target_count에 맞게 조정합니다 (U-095).

    - 아이템이 target_count보다 많으면 → 앞에서부터 target_count개만 유지
    - 아이템이 target_count보다 적으면 → 있는 만큼만 유지 (강제 생성 X)
    - 중복 이름 아이템 제거 (동일 label 금지)

    Args:
        result: 파싱된 ScanResult
        target_count: 목표 아이템 수

    Returns:
        조정된 ScanResult
    """
    if result.status not in (ScanStatus.COMPLETED, ScanStatus.PARTIAL):
        return result

    candidates = result.item_candidates

    # 중복 이름 제거 (첫 등장 유지)
    seen_labels: set[str] = set()
    unique_candidates: list[ItemCandidate] = []
    for c in candidates:
        label_lower = c.label.strip().lower()
        if label_lower not in seen_labels:
            seen_labels.add(label_lower)
            unique_candidates.append(c)

    # target_count 이하로 잘라내기
    adjusted = unique_candidates[:target_count]

    if len(adjusted) != len(candidates):
        logger.info(
            "[Scan] 아이템 수 조정: %d → %d (목표: %d)",
            len(candidates),
            len(adjusted),
            target_count,
        )

    result.item_candidates = adjusted
    return result


# =============================================================================
# 재시도 헬퍼 함수 (U-094)
# =============================================================================


def _is_non_retryable_api_error(error: Exception) -> bool:
    """재시도 불가 API 에러인지 확인합니다 (U-094).

    인증 실패(401), 권한 거부(403), 할당량 초과(429) 등은
    재시도해도 동일한 결과이므로 즉시 폴백합니다.

    Args:
        error: 발생한 예외

    Returns:
        True이면 재시도 불가
    """
    return any(cls.__name__ in _NON_RETRYABLE_ERROR_NAMES for cls in type(error).__mro__)


def _is_safety_blocked_response(response: Any) -> bool:
    """Gemini 응답이 안전 정책에 의해 차단되었는지 확인합니다 (U-094).

    안전 차단은 재시도해도 동일한 결과이므로 즉시 폴백합니다.

    Args:
        response: Gemini API 응답 객체

    Returns:
        True이면 안전 차단됨
    """
    try:
        # candidates[0].finish_reason 확인
        if hasattr(response, "candidates") and response.candidates:
            candidate = response.candidates[0]
            finish_reason = getattr(candidate, "finish_reason", None)
            if finish_reason is not None:
                reason_str = str(finish_reason).upper()
                if reason_str in ("SAFETY", "BLOCKED", "RECITATION"):
                    return True
        # prompt_feedback.block_reason 확인
        if hasattr(response, "prompt_feedback"):
            feedback = response.prompt_feedback
            if hasattr(feedback, "block_reason") and feedback.block_reason:
                return True
    except Exception:
        pass
    return False


def _get_final_failure_message(language: Language) -> str:
    """최종 실패 시 사용자에게 표시할 메시지를 반환합니다 (U-094, RULE-006).

    Args:
        language: 응답 언어

    Returns:
        i18n 폴백 메시지
    """
    if language == Language.KO:
        return "이미지 분석에 실패했습니다. 다시 시도해주세요."
    return "Image analysis failed. Please try again."


# =============================================================================
# 이미지 이해 서비스 클래스
# =============================================================================


class ImageUnderstandingService:
    """이미지 이해 서비스.

    비전 모델을 사용하여 이미지를 분석하고
    캡션, 오브젝트, 아이템 후보를 추출합니다.
    """

    def __init__(
        self,
        *,
        force_mock: bool = False,
    ) -> None:
        """ImageUnderstandingService를 초기화합니다.

        Args:
            force_mock: True면 Mock 모드 강제
        """
        # 모드 결정
        if force_mock:
            self._is_mock = True
        else:
            mode_str = os.environ.get(ENV_UW_MODE, GenAIMode.REAL)
            self._is_mock = mode_str == GenAIMode.MOCK

        self._genai_client: Client | None = None

        # Real 모드에서만 클라이언트 초기화
        if not self._is_mock:
            self._initialize_client()

        logger.info(
            "[ImageUnderstanding] 서비스 초기화",
            extra={"mode": "mock" if self._is_mock else "real"},
        )

    def _initialize_client(self) -> None:
        """google-genai 클라이언트를 초기화합니다."""
        try:
            from google.genai import Client

            # U-080 핫픽스: API 키 모드로 클라이언트 초기화 (Vertex AI 제거)
            api_key = os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                logger.warning(
                    "[ImageUnderstanding] GOOGLE_API_KEY 환경변수가 설정되지 않음 - Mock 모드로 전환",
                )
                self._is_mock = True
                self._genai_client = None
                return

            self._genai_client = Client(api_key=api_key)
            self._is_mock = False

            logger.info(
                "[ImageUnderstanding] API 키 클라이언트 초기화 완료",
                extra={
                    "auth": "api_key",
                },
            )
        except Exception as e:
            logger.warning(
                "[ImageUnderstanding] 클라이언트 초기화 실패 - Mock 모드로 전환",
                extra={"error_type": type(e).__name__},
            )
            self._is_mock = True
            self._genai_client = None

    @property
    def is_mock(self) -> bool:
        """Mock 모드 여부."""
        return self._is_mock

    async def analyze(
        self,
        image_content: bytes,
        content_type: str,
        language: Language = Language.KO,
        *,
        preserve_original: bool = False,
        session_id: str | None = None,
    ) -> ScanResult:
        """이미지를 분석합니다.

        Args:
            image_content: 이미지 바이트 데이터
            content_type: MIME 타입
            language: 응답 언어
            preserve_original: 원본 이미지 저장 여부 (RU-006-S1)
            session_id: 세션 ID (저장 시 그룹화용)

        Returns:
            ScanResult: 분석 결과 (저장 시 original_image_key/url 포함)
        """
        start_time = time.time()

        # 이미지 검증
        validation_error = validate_image(image_content, content_type)
        if validation_error:
            return _create_fallback_result(validation_error)

        # 원본 이미지 저장 (선택적, RU-006-S1)
        original_image_key: str | None = None
        original_image_url: str | None = None

        if preserve_original:
            try:
                from unknown_world.storage import StorageCategory, get_storage

                storage = get_storage()
                put_result = await storage.put(
                    data=image_content,
                    category=StorageCategory.UPLOADED_IMAGE,
                    content_type=content_type,
                    session_id=session_id,
                )

                if put_result.success:
                    original_image_key = put_result.key
                    original_image_url = put_result.url
                    logger.debug(
                        "[ImageUnderstanding] 원본 이미지 저장 완료",
                        extra={
                            "key": original_image_key,
                            "size_kb": len(image_content) // 1024,
                        },
                    )
            except Exception as e:
                # 저장 실패해도 분석은 계속 (RULE-004)
                logger.warning(
                    "[ImageUnderstanding] 원본 이미지 저장 실패",
                    extra={"error_type": type(e).__name__},
                )

        # U-095: 아이템 생성 개수 랜덤 결정 (서버에서 확정적으로 결정)
        item_count = determine_item_count()
        logger.info(
            "[ImageUnderstanding] 아이템 생성 개수 결정",
            extra={"item_count": item_count},
        )

        # Mock 모드 처리
        if self._is_mock:
            logger.debug("[ImageUnderstanding] Mock 분석 수행")
            result = _create_mock_scan_result(language, item_count=item_count)
            result.analysis_time_ms = int((time.time() - start_time) * 1000)
            result.original_image_key = original_image_key
            result.original_image_url = original_image_url
            return result

        # 실제 비전 모델 호출
        try:
            result = await self._call_vision_model(
                image_content,
                content_type,
                language,
                item_count=item_count,
            )
            result.analysis_time_ms = int((time.time() - start_time) * 1000)
            result.original_image_key = original_image_key
            result.original_image_url = original_image_url
            return result

        except Exception as e:
            error_type = type(e).__name__
            logger.error(
                "[ImageUnderstanding] 비전 모델 호출 실패",
                extra={"error_type": error_type},
            )
            # 안전한 폴백 (RULE-004)
            return _create_fallback_result(f"이미지 분석 중 오류가 발생했습니다: {error_type}")

    async def _call_vision_model(
        self,
        image_content: bytes,
        content_type: str,
        language: Language,
        *,
        item_count: int = 1,
    ) -> ScanResult:
        """비전 모델을 호출합니다 (파싱 실패 시 자동 재시도 포함).

        U-094: ImageUnderstanding 응답 파싱 예외 시 자동 재시도.
        U-095: item_count에 따라 프롬프트에 아이템 수 지시 추가.

        - 최대 2회 재시도 (총 3회 시도)
        - 재시도 시 JSON 형식 강조 지시 추가 (Q1: Option B)
        - 백오프: 1초, 2초
        - 재시도 제외: 인증 실패(401), 할당량 초과(429), 안전 차단

        Args:
            image_content: 이미지 바이트 데이터
            content_type: MIME 타입
            language: 응답 언어
            item_count: 생성할 아이템 수 (1~3, U-095)

        Returns:
            ScanResult: 분석 결과 (성공 또는 폴백)
        """
        if self._genai_client is None:
            return _create_fallback_result("비전 클라이언트가 초기화되지 않았습니다")

        last_result: ScanResult | None = None

        for attempt in range(SCAN_MAX_RETRIES + 1):  # 0=초기, 1~2=재시도
            is_retry = attempt > 0

            # 재시도 시 백오프 대기
            if is_retry:
                backoff_seconds = SCAN_RETRY_BACKOFF_SECONDS[attempt - 1]
                logger.info(
                    "[Scan] 파싱 실패, 재시도 %d/%d (백오프 %.1f초)",
                    attempt,
                    SCAN_MAX_RETRIES,
                    backoff_seconds,
                )
                await asyncio.sleep(backoff_seconds)

            try:
                result = await self._execute_single_vision_call(
                    image_content,
                    content_type,
                    language,
                    is_retry=is_retry,
                    item_count=item_count,
                )

                # 완전 성공 → 아이템 수 조정 후 반환 (U-095)
                if result.status == ScanStatus.COMPLETED:
                    if is_retry:
                        logger.info(
                            "[Scan] 재시도 성공 (%d/%d 시도)",
                            attempt + 1,
                            SCAN_MAX_RETRIES + 1,
                        )
                    return _adjust_item_count(result, item_count)

                # 안전 차단 → 재시도 불가, 즉시 반환
                if result.status == ScanStatus.BLOCKED:
                    logger.warning("[Scan] 안전 차단, 재시도 건너뜀")
                    return result

                # PARTIAL/FAILED → 재시도 대상
                last_result = result
                logger.warning(
                    "[Scan] 파싱 실패 (시도 %d/%d, 상태: %s)",
                    attempt + 1,
                    SCAN_MAX_RETRIES + 1,
                    result.status.value,
                )

            except Exception as e:
                error_type = type(e).__name__

                # 재시도 불가 API 에러 (인증/할당량/권한)
                if _is_non_retryable_api_error(e):
                    logger.error(
                        "[Scan] 재시도 불가 API 오류: %s",
                        error_type,
                    )
                    return _create_fallback_result(
                        f"API 오류로 이미지 분석에 실패했습니다: {error_type}",
                    )

                # 기타 예외 → 재시도
                logger.warning(
                    "[Scan] API 호출 예외 (시도 %d/%d)",
                    attempt + 1,
                    SCAN_MAX_RETRIES + 1,
                    extra={"error_type": error_type},
                )
                last_result = _create_fallback_result(
                    f"API 호출 오류: {error_type}",
                )

        # 모든 재시도 실패 → 폴백 반환
        total_attempts = SCAN_MAX_RETRIES + 1
        logger.error(
            "[Scan] 모든 재시도 실패 (%d/%d 시도), 폴백 응답 반환",
            total_attempts,
            total_attempts,
        )

        if last_result is not None:
            last_result.message = _get_final_failure_message(language)
            return last_result

        return _create_fallback_result(_get_final_failure_message(language))

    async def _execute_single_vision_call(
        self,
        image_content: bytes,
        content_type: str,
        language: Language,
        *,
        is_retry: bool = False,
        item_count: int = 1,
    ) -> ScanResult:
        """단일 비전 모델 API 호출을 실행합니다.

        U-094: 재시도 시 JSON 형식 강조 지시를 프롬프트에 추가합니다.
        U-095: item_count에 따라 아이템 수 지시를 프롬프트에 추가합니다.

        Args:
            image_content: 이미지 바이트 데이터
            content_type: MIME 타입
            language: 응답 언어
            is_retry: 재시도 여부 (True면 JSON 강조 지시 추가)
            item_count: 생성할 아이템 수 (1~3, U-095)

        Returns:
            ScanResult: 파싱된 분석 결과

        Raises:
            Exception: API 호출 중 발생한 예외 (호출자에서 재시도/폴백 처리)
        """
        # 프롬프트 로드 (U-095: 아이템 수 지시 포함)
        prompt_text = load_prompt("scan", "scan_instructions", language).replace(
            "{count}", str(item_count)
        )

        if is_retry:
            reinforcement = SCAN_RETRY_REINFORCEMENT.get(
                language,
                SCAN_RETRY_REINFORCEMENT[Language.KO],
            )
            prompt_text = prompt_text + reinforcement

        # 모델 ID 조회
        model_id = get_model_id(ModelLabel.VISION)

        logger.debug(
            "[ImageUnderstanding] 비전 모델 호출",
            extra={
                "model_id": model_id,
                "language": language.value,
                "image_size_kb": len(image_content) // 1024,
                "is_retry": is_retry,
            },
        )

        # google-genai SDK 호출 (멀티모달 입력)
        from google.genai.types import GenerateContentConfig, Part

        # 멀티모달 입력 구성 (이미지 먼저, 텍스트 뒤에 - PRD 8.6 권장)
        contents = [
            Part.from_bytes(
                data=image_content,
                mime_type=content_type,
            ),
            Part.from_text(text=prompt_text),
        ]

        # JSON 응답 강제 + 충분한 출력 토큰 확보
        config = GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=32768,  # JSON 응답 잘림 방지
        )

        response = await self._genai_client.aio.models.generate_content(  # type: ignore[reportUnknownMemberType]
            model=model_id,
            contents=contents,  # type: ignore[reportArgumentType]
            config=config,
        )

        # 안전 차단 확인 (U-094: 안전 차단은 재시도 제외)
        if _is_safety_blocked_response(response):
            msg = (
                "안전 정책에 의해 이미지 분석이 차단되었습니다."
                if language == Language.KO
                else "Image analysis was blocked by safety policy."
            )
            return ScanResult(
                status=ScanStatus.BLOCKED,
                caption="",
                objects=[],
                item_candidates=[],
                message=msg,
                analysis_time_ms=0,
            )

        # 응답 텍스트 추출
        response_text: str = ""
        if hasattr(response, "text") and response.text:
            response_text = str(response.text)
        else:
            response_text = str(response)

        if not response_text:
            return _create_fallback_result("모델 응답이 비어있습니다")

        # 응답 파싱
        return _parse_vision_response(response_text, language)


# =============================================================================
# 팩토리 함수
# =============================================================================

# 싱글톤 인스턴스 캐시
_service_instance: ImageUnderstandingService | None = None


def get_image_understanding_service(
    *,
    force_new: bool = False,
) -> ImageUnderstandingService:
    """ImageUnderstandingService 인스턴스를 반환합니다.

    싱글톤 패턴으로 동작합니다.

    Args:
        force_new: True면 캐시를 무시하고 새 인스턴스 생성

    Returns:
        ImageUnderstandingService 인스턴스
    """
    global _service_instance

    if not force_new and _service_instance is not None:
        return _service_instance

    _service_instance = ImageUnderstandingService()
    return _service_instance


def reset_image_understanding_service() -> None:
    """ImageUnderstandingService 캐시를 초기화합니다.

    테스트 시 서비스를 재설정할 때 사용합니다.
    """
    global _service_instance
    _service_instance = None
