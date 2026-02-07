"""Unknown World - Agentic Vision 서비스 (U-076[Mvp]).

"정밀분석" 액션 실행 시 기존 Scene 이미지에서 affordances(오브젝트 후보)를
추출하는 서비스입니다.

gemini-3-flash-preview + code_execution 도구를 활용하여 이미지 내
클릭 가능한 오브젝트(핫스팟)를 구조화된 형식으로 반환합니다.

설계 원칙:
    - RULE-004: 실패 시 빈 배열 반환 (안전한 폴백)
    - RULE-007/008: 프롬프트 원문/비밀정보 노출 금지
    - RULE-009: bbox 0~1000 정규화, [ymin, xmin, ymax, xmax]
    - U-076 Q2: 비전 분석 비용 1.5x

참조:
    - vibe/unit-plans/U-076[Mvp].md
    - vibe/tech-stack.md (비전 모델: gemini-3-flash-preview)
    - vibe/ref/gemini-api-guide.md (Structured Outputs with tools)
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, cast

from unknown_world.config.models import ModelLabel, get_model_id
from unknown_world.models.turn import Box2D, Language, SceneObject
from unknown_world.services.genai_client import ENV_UW_MODE, GenAIMode
from unknown_world.storage.validation import BBOX_MAX, BBOX_MIN

if TYPE_CHECKING:
    from google.genai import Client

# =============================================================================
# 로거 설정 (프롬프트/비밀정보 노출 금지 - RULE-007/008)
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# 프롬프트 로딩
# =============================================================================

# 프롬프트 파일 디렉토리
_PROMPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "prompts" / "vision"


def _load_prompt(language: Language) -> str:
    """비전 프롬프트를 파일에서 로드합니다.

    Args:
        language: 요청 언어

    Returns:
        프롬프트 텍스트

    Raises:
        FileNotFoundError: 프롬프트 파일이 없을 때
    """
    lang_suffix = "ko" if language == Language.KO else "en"
    prompt_path = _PROMPTS_DIR / f"scene_affordances.{lang_suffix}.md"

    if not prompt_path.exists():
        # 폴백: 한국어 프롬프트 시도
        fallback_path = _PROMPTS_DIR / "scene_affordances.ko.md"
        if fallback_path.exists():
            prompt_path = fallback_path
        else:
            raise FileNotFoundError(f"Vision prompt not found: {prompt_path}")

    return prompt_path.read_text(encoding="utf-8")


# =============================================================================
# Affordance 데이터 타입
# =============================================================================


@dataclass
class Affordance:
    """이미지에서 추출된 오브젝트 후보 (affordance).

    Attributes:
        label: 오브젝트 이름 (세션 언어에 맞게)
        box_2d: 바운딩 박스 (0~1000 정규화, [ymin, xmin, ymax, xmax])
        interaction_hint: 상호작용 힌트 (선택)
    """

    label: str
    box_2d: Box2D
    interaction_hint: str | None = None


@dataclass
class VisionAnalysisResult:
    """비전 분석 결과.

    Attributes:
        affordances: 추출된 affordances 목록
        analysis_time_ms: 분석 소요 시간 (밀리초)
        success: 분석 성공 여부
        message: 상태/에러 메시지 (내부용, UI 노출 금지)
    """

    affordances: list[Affordance] = field(default_factory=lambda: cast(list["Affordance"], []))
    analysis_time_ms: int = 0
    success: bool = True
    message: str = ""


# =============================================================================
# bbox 정규화 유틸리티
# =============================================================================


def _normalize_bbox(bbox_raw: dict[str, Any]) -> Box2D | None:
    """bbox를 0~1000 범위로 정규화합니다.

    Args:
        bbox_raw: 원본 bbox dict

    Returns:
        정규화된 Box2D 또는 None (유효하지 않은 경우)
    """
    try:
        ymin_val = int(bbox_raw.get("ymin", 0) or 0)
        xmin_val = int(bbox_raw.get("xmin", 0) or 0)
        ymax_val = int(bbox_raw.get("ymax", BBOX_MAX) or BBOX_MAX)
        xmax_val = int(bbox_raw.get("xmax", BBOX_MAX) or BBOX_MAX)

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
    except (ValueError, TypeError):
        return None


# =============================================================================
# Mock 서비스
# =============================================================================


def _create_mock_result(language: Language) -> VisionAnalysisResult:
    """Mock 분석 결과를 생성합니다.

    Args:
        language: 응답 언어

    Returns:
        고정된 Mock 분석 결과
    """
    if language == Language.KO:
        affordances = [
            Affordance(
                label="낡은 문",
                box_2d=Box2D(ymin=100, xmin=50, ymax=800, xmax=450),
                interaction_hint="열어볼 수 있을 것 같다",
            ),
            Affordance(
                label="벽에 걸린 횃불",
                box_2d=Box2D(ymin=50, xmin=600, ymax=400, xmax=750),
                interaction_hint="가져갈 수 있을 것 같다",
            ),
            Affordance(
                label="바닥의 금이 간 타일",
                box_2d=Box2D(ymin=700, xmin=200, ymax=900, xmax=600),
                interaction_hint="무언가 숨겨져 있을 수 있다",
            ),
        ]
    else:
        affordances = [
            Affordance(
                label="Old Door",
                box_2d=Box2D(ymin=100, xmin=50, ymax=800, xmax=450),
                interaction_hint="Looks like it can be opened",
            ),
            Affordance(
                label="Wall Torch",
                box_2d=Box2D(ymin=50, xmin=600, ymax=400, xmax=750),
                interaction_hint="Could be taken",
            ),
            Affordance(
                label="Cracked Floor Tile",
                box_2d=Box2D(ymin=700, xmin=200, ymax=900, xmax=600),
                interaction_hint="Something might be hidden underneath",
            ),
        ]

    return VisionAnalysisResult(
        affordances=affordances,
        analysis_time_ms=250,
        success=True,
        message="mock",
    )


# =============================================================================
# 응답 파싱
# =============================================================================


def _parse_vision_response(
    response_text: str,
    language: Language,
) -> VisionAnalysisResult:
    """비전 모델 응답을 파싱합니다.

    Args:
        response_text: 모델 응답 텍스트 (JSON 예상)
        language: 응답 언어

    Returns:
        파싱된 VisionAnalysisResult
    """
    try:
        # 마크다운 코드블록 제거
        text = response_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        parsed = json.loads(text)

        # 이중 직렬화 처리
        if isinstance(parsed, str):
            parsed = json.loads(parsed)

        if not isinstance(parsed, dict):
            raise ValueError(f"Expected dict, got {type(parsed).__name__}")

        data = cast(dict[str, Any], parsed)

        # affordances 추출
        affordances: list[Affordance] = []
        raw_affordances: list[dict[str, Any]] = data.get("affordances") or []  # type: ignore[assignment]

        for i, aff in enumerate(raw_affordances[:5]):  # 최대 5개 (SceneObject max_length)
            if not isinstance(aff, dict):  # type: ignore[reportUnnecessaryIsInstance]
                continue

            label_val = aff.get("label")
            label: str = str(label_val) if label_val else f"Object_{i}"

            bbox_raw: dict[str, Any] = aff.get("box_2d") or {}  # type: ignore[assignment]
            bbox = _normalize_bbox(bbox_raw)
            if bbox is None:
                logger.warning(
                    "[AgenticVision] bbox 정규화 실패, 오브젝트 스킵",
                    extra={"index": i, "label": label},
                )
                continue

            hint_val = aff.get("interaction_hint")
            hint: str | None = str(hint_val) if hint_val else None

            affordances.append(
                Affordance(
                    label=label,
                    box_2d=bbox,
                    interaction_hint=hint,
                )
            )

        return VisionAnalysisResult(
            affordances=affordances,
            success=True,
            message="ok",
        )

    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(
            "[AgenticVision] JSON 파싱 실패",
            extra={"error": str(e), "error_type": type(e).__name__},
        )
        return VisionAnalysisResult(
            affordances=[],
            success=False,
            message=f"parse_error: {type(e).__name__}",
        )
    except Exception as e:
        logger.error(
            "[AgenticVision] 응답 파싱 중 예외",
            extra={"error_type": type(e).__name__},
        )
        return VisionAnalysisResult(
            affordances=[],
            success=False,
            message=f"unexpected_error: {type(e).__name__}",
        )


# =============================================================================
# Affordance → SceneObject 변환
# =============================================================================


def affordances_to_scene_objects(
    affordances: list[Affordance],
    id_prefix: str = "vision",
) -> list[SceneObject]:
    """Affordances를 SceneObject 목록으로 변환합니다.

    Args:
        affordances: 추출된 affordances
        id_prefix: 오브젝트 ID 접두사

    Returns:
        SceneObject 목록
    """
    objects: list[SceneObject] = []
    for i, aff in enumerate(affordances):
        obj = SceneObject(
            id=f"{id_prefix}_{i}",
            label=aff.label,
            box_2d=aff.box_2d,
            interaction_hint=aff.interaction_hint,
        )
        objects.append(obj)
    return objects


# =============================================================================
# Agentic Vision 서비스
# =============================================================================


class AgenticVisionService:
    """Agentic Vision 서비스 (U-076[Mvp]).

    Scene 이미지에서 affordances(오브젝트 후보)를 추출하는
    gemini-3-flash-preview + code_execution 기반 서비스입니다.
    """

    def __init__(
        self,
        *,
        force_mock: bool = False,
    ) -> None:
        """AgenticVisionService를 초기화합니다.

        Args:
            force_mock: True면 Mock 모드 강제
        """
        if force_mock:
            self._is_mock = True
        else:
            mode_str = os.environ.get(ENV_UW_MODE, GenAIMode.REAL)
            self._is_mock = mode_str == GenAIMode.MOCK

        self._genai_client: Client | None = None

        if not self._is_mock:
            self._initialize_client()

        logger.info(
            "[AgenticVision] 서비스 초기화",
            extra={"mode": "mock" if self._is_mock else "real"},
        )

    def _initialize_client(self) -> None:
        """google-genai 클라이언트를 초기화합니다."""
        try:
            from google.genai import Client

            api_key = os.environ.get("GOOGLE_API_KEY")
            if not api_key:
                logger.warning(
                    "[AgenticVision] GOOGLE_API_KEY 미설정 - Mock 모드로 전환",
                )
                self._is_mock = True
                self._genai_client = None
                return

            self._genai_client = Client(api_key=api_key)
            self._is_mock = False

            logger.info(
                "[AgenticVision] API 키 클라이언트 초기화 완료",
                extra={"auth": "api_key"},
            )
        except Exception as e:
            logger.warning(
                "[AgenticVision] 클라이언트 초기화 실패 - Mock 모드로 전환",
                extra={"error_type": type(e).__name__},
            )
            self._is_mock = True
            self._genai_client = None

    @property
    def is_mock(self) -> bool:
        """Mock 모드 여부."""
        return self._is_mock

    async def analyze_scene(
        self,
        image_url: str,
        language: Language = Language.KO,
    ) -> VisionAnalysisResult:
        """Scene 이미지에서 affordances(오브젝트 후보)를 추출합니다.

        Args:
            image_url: Scene 이미지 URL (로컬 경로 또는 HTTP URL)
            language: 세션 언어

        Returns:
            VisionAnalysisResult: 분석 결과
        """
        start_time = time.time()

        logger.info(
            "[AgenticVision] 분석 시작",
            extra={
                "language": language.value,
                "has_image_url": bool(image_url),
            },
        )

        # Mock 모드
        if self._is_mock:
            logger.debug("[AgenticVision] Mock 분석 수행")
            result = _create_mock_result(language)
            result.analysis_time_ms = int((time.time() - start_time) * 1000)
            return result

        # 이미지 읽기
        image_bytes = self._load_image(image_url)
        if image_bytes is None:
            logger.warning(
                "[AgenticVision] 이미지 로드 실패, 빈 결과 반환",
                extra={"image_url_prefix": image_url[:50] if image_url else ""},
            )
            return VisionAnalysisResult(
                affordances=[],
                analysis_time_ms=int((time.time() - start_time) * 1000),
                success=False,
                message="image_load_failed",
            )

        # 실제 비전 모델 호출
        try:
            result = await self._call_vision_model(image_bytes, language)
            result.analysis_time_ms = int((time.time() - start_time) * 1000)

            logger.info(
                "[AgenticVision] 분석 완료",
                extra={
                    "affordance_count": len(result.affordances),
                    "analysis_time_ms": result.analysis_time_ms,
                    "success": result.success,
                },
            )

            return result

        except Exception as e:
            error_type = type(e).__name__
            logger.error(
                "[AgenticVision] 비전 모델 호출 실패",
                extra={"error_type": error_type},
            )
            return VisionAnalysisResult(
                affordances=[],
                analysis_time_ms=int((time.time() - start_time) * 1000),
                success=False,
                message=f"vision_error: {error_type}",
            )

    def _load_image(self, image_url: str) -> bytes | None:
        """이미지 URL에서 바이트 데이터를 로드합니다.

        로컬 경로와 HTTP URL 모두 지원합니다.

        Args:
            image_url: 이미지 경로/URL

        Returns:
            이미지 바이트 데이터 또는 None
        """
        try:
            # 로컬 파일 경로 처리
            if image_url.startswith("/static/"):
                # /static/ prefix 제거 → .data/ 내부 상대경로
                # 예: /static/images/generated/img_xxx.png → images/generated/img_xxx.png
                relative_path = image_url[len("/static/") :]

                # backend 루트 디렉토리
                base_dir = Path(__file__).resolve().parent.parent.parent.parent

                # 1) .data/ 디렉토리에서 찾기 (현재 스토리지)
                from unknown_world.storage.paths import BASE_DATA_DIR

                data_path = base_dir / str(BASE_DATA_DIR) / relative_path
                if data_path.exists():
                    return data_path.read_bytes()

                # 2) 레거시: generated_images/ 폴백
                filename = Path(image_url).name
                legacy_dir = base_dir / "generated_images"
                if legacy_dir.exists():
                    candidate = legacy_dir / filename
                    if candidate.exists():
                        return candidate.read_bytes()

                logger.warning(
                    "[AgenticVision] 로컬 이미지 파일 미존재",
                    extra={"path_prefix": str(data_path)[:80]},
                )
                return None

            elif image_url.startswith(("http://", "https://")):
                # HTTP URL의 경우 - MVP에서는 로컬 파일만 지원
                # 원격 URL은 MMP에서 구현 예정
                logger.warning(
                    "[AgenticVision] HTTP URL은 현재 미지원",
                )
                return None
            else:
                # 절대/상대 경로 시도
                path = Path(image_url)
                if path.exists():
                    return path.read_bytes()
                return None
        except Exception as e:
            logger.warning(
                "[AgenticVision] 이미지 로드 실패",
                extra={"error_type": type(e).__name__},
            )
            return None

    async def _call_vision_model(
        self,
        image_bytes: bytes,
        language: Language,
    ) -> VisionAnalysisResult:
        """비전 모델을 호출합니다.

        gemini-3-flash-preview + code_execution 활성화

        Args:
            image_bytes: 이미지 바이트 데이터
            language: 세션 언어

        Returns:
            VisionAnalysisResult
        """
        if self._genai_client is None:
            return VisionAnalysisResult(
                affordances=[],
                success=False,
                message="client_not_initialized",
            )

        # 프롬프트 로드
        try:
            prompt_text = _load_prompt(language)
        except FileNotFoundError:
            logger.warning("[AgenticVision] 프롬프트 파일 미존재, 인라인 폴백 사용")
            prompt_text = self._get_inline_prompt(language)

        # 모델 ID 조회
        model_id = get_model_id(ModelLabel.VISION)

        logger.debug(
            "[AgenticVision] 비전 모델 호출",
            extra={
                "model_id": model_id,
                "language": language.value,
                "image_size_kb": len(image_bytes) // 1024,
            },
        )

        # google-genai SDK 호출
        from google.genai.types import GenerateContentConfig, Part, Tool, ToolCodeExecution

        # 멀티모달 입력 (이미지 + 텍스트)
        contents = [
            Part.from_bytes(
                data=image_bytes,
                mime_type="image/png",
            ),
            Part.from_text(text=prompt_text),
        ]

        # Structured Outputs + code_execution (Gemini 3 지원)
        config = GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=4096,
            tools=[Tool(code_execution=ToolCodeExecution())],
        )

        response = await self._genai_client.aio.models.generate_content(  # type: ignore[reportUnknownMemberType]
            model=model_id,
            contents=contents,  # type: ignore[reportArgumentType]
            config=config,
        )

        # 응답 텍스트 추출
        response_text: str = ""
        if hasattr(response, "text") and response.text:
            response_text = str(response.text)
        else:
            response_text = str(response)

        if not response_text:
            return VisionAnalysisResult(
                affordances=[],
                success=False,
                message="empty_response",
            )

        return _parse_vision_response(response_text, language)

    def _get_inline_prompt(self, language: Language) -> str:
        """인라인 폴백 프롬프트를 반환합니다.

        프롬프트 파일이 없을 때 사용하는 최소 프롬프트입니다.

        Args:
            language: 세션 언어

        Returns:
            프롬프트 텍스트
        """
        if language == Language.KO:
            return (
                "이 이미지에서 클릭 가능한 오브젝트를 찾아 JSON으로 반환하세요.\n"
                '출력: {"affordances": [{"label": "이름", "box_2d": {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}, "interaction_hint": "힌트"}]}\n'
                "좌표는 0~1000 정규화, bbox=[ymin,xmin,ymax,xmax]. 최대 5개."
            )
        return (
            "Find clickable objects in this image and return as JSON.\n"
            'Output: {"affordances": [{"label": "name", "box_2d": {"ymin": 0, "xmin": 0, "ymax": 1000, "xmax": 1000}, "interaction_hint": "hint"}]}\n'
            "Coordinates: 0~1000 normalized, bbox=[ymin,xmin,ymax,xmax]. Max 5."
        )


# =============================================================================
# 팩토리 함수
# =============================================================================

_service_instance: AgenticVisionService | None = None


def get_agentic_vision_service(
    *,
    force_new: bool = False,
) -> AgenticVisionService:
    """AgenticVisionService 인스턴스를 반환합니다.

    싱글톤 패턴으로 동작합니다.

    Args:
        force_new: True면 캐시를 무시하고 새 인스턴스 생성

    Returns:
        AgenticVisionService 인스턴스
    """
    global _service_instance

    if not force_new and _service_instance is not None:
        return _service_instance

    _service_instance = AgenticVisionService()
    return _service_instance


def reset_agentic_vision_service() -> None:
    """AgenticVisionService 캐시를 초기화합니다."""
    global _service_instance
    _service_instance = None
