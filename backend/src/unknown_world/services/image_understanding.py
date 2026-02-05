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

import json
import logging
import os
import time
import uuid
from typing import TYPE_CHECKING, Any

from unknown_world.config.models import ModelLabel, get_model_id
from unknown_world.models.scanner import (
    DetectedObject,
    ItemCandidate,
    ScanResult,
    ScanStatus,
)
from unknown_world.models.turn import Box2D, Language
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
# 프롬프트 템플릿 (언어별)
# =============================================================================

SCAN_PROMPT_KO = """당신은 이미지 분석 전문가입니다. 주어진 이미지를 분석하여 다음 정보를 JSON 형식으로 추출하세요.

## 작업 지시

1. **캡션 (caption)**: 이미지 전체를 설명하는 한국어 문장 (1-2문장)
2. **오브젝트 (objects)**: 이미지에서 발견된 주요 오브젝트 목록
   - label: 오브젝트 이름 (한국어)
   - box_2d: 바운딩 박스 좌표 [ymin, xmin, ymax, xmax] (0~1000 정규화)
   - suggested_item_type: 게임 아이템으로 변환 시 적합한 유형 (key, weapon, tool, clue, material, container 등)
3. **아이템 후보 (item_candidates)**: 게임에서 사용 가능한 아이템으로 변환된 목록
   - id: 고유 ID (예: "item_001")
   - label: 아이템 이름 (한국어)
   - description: 아이템 설명 (한국어, 1문장)
   - item_type: 아이템 유형
   - source_object_index: 원본 오브젝트 인덱스

## 출력 형식 (JSON)

```json
{
  "caption": "이미지 설명...",
  "objects": [
    {
      "label": "오브젝트명",
      "box_2d": {"ymin": 100, "xmin": 200, "ymax": 400, "xmax": 500},
      "suggested_item_type": "key"
    }
  ],
  "item_candidates": [
    {
      "id": "item_001",
      "label": "아이템명",
      "description": "아이템 설명",
      "item_type": "key",
      "source_object_index": 0
    }
  ]
}
```

## 주의사항

- bbox 좌표는 반드시 0~1000 범위 내에서 정규화하세요.
- 게임에 적합하지 않은 오브젝트(사람 얼굴, 민감한 콘텐츠 등)는 제외하세요.
- 최대 10개의 오브젝트와 아이템 후보를 추출하세요.
"""

SCAN_PROMPT_EN = """You are an image analysis expert. Analyze the given image and extract the following information in JSON format.

## Task Instructions

1. **Caption**: A description of the entire image in English (1-2 sentences)
2. **Objects**: List of main objects found in the image
   - label: Object name (English)
   - box_2d: Bounding box coordinates [ymin, xmin, ymax, xmax] (0~1000 normalized)
   - suggested_item_type: Suitable type for game item conversion (key, weapon, tool, clue, material, container, etc.)
3. **Item Candidates**: List of items converted for game use
   - id: Unique ID (e.g., "item_001")
   - label: Item name (English)
   - description: Item description (English, 1 sentence)
   - item_type: Item type
   - source_object_index: Original object index

## Output Format (JSON)

```json
{
  "caption": "Image description...",
  "objects": [
    {
      "label": "object_name",
      "box_2d": {"ymin": 100, "xmin": 200, "ymax": 400, "xmax": 500},
      "suggested_item_type": "key"
    }
  ],
  "item_candidates": [
    {
      "id": "item_001",
      "label": "item_name",
      "description": "Item description",
      "item_type": "key",
      "source_object_index": 0
    }
  ]
}
```

## Notes

- bbox coordinates must be normalized within 0~1000 range.
- Exclude objects not suitable for games (human faces, sensitive content, etc.).
- Extract up to 10 objects and item candidates.
"""

SCAN_PROMPTS: dict[Language, str] = {
    Language.KO: SCAN_PROMPT_KO,
    Language.EN: SCAN_PROMPT_EN,
}


# =============================================================================
# Mock 서비스 구현
# =============================================================================


def _create_mock_scan_result(language: Language) -> ScanResult:
    """Mock 스캔 결과를 생성합니다.

    Args:
        language: 응답 언어

    Returns:
        고정된 Mock 스캔 결과
    """
    if language == Language.KO:
        return ScanResult(
            status=ScanStatus.COMPLETED,
            caption="[Mock] 테스트 이미지입니다. 여러 오브젝트가 감지되었습니다.",
            objects=[
                DetectedObject(
                    label="열쇠",
                    box_2d=Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
                    confidence=0.95,
                    suggested_item_type="key",
                ),
                DetectedObject(
                    label="상자",
                    box_2d=Box2D(ymin=400, xmin=100, ymax=700, xmax=500),
                    confidence=0.88,
                    suggested_item_type="container",
                ),
            ],
            item_candidates=[
                ItemCandidate(
                    id="item_001",
                    label="녹슨 열쇠",
                    description="오래된 자물쇠를 열 수 있을 것 같은 열쇠입니다.",
                    item_type="key",
                    source_object_index=0,
                ),
                ItemCandidate(
                    id="item_002",
                    label="나무 상자",
                    description="무언가 들어있을 것 같은 작은 상자입니다.",
                    item_type="container",
                    source_object_index=1,
                ),
            ],
            message=None,
            analysis_time_ms=150,
        )
    else:
        return ScanResult(
            status=ScanStatus.COMPLETED,
            caption="[Mock] Test image. Multiple objects detected.",
            objects=[
                DetectedObject(
                    label="Key",
                    box_2d=Box2D(ymin=100, xmin=200, ymax=300, xmax=400),
                    confidence=0.95,
                    suggested_item_type="key",
                ),
                DetectedObject(
                    label="Box",
                    box_2d=Box2D(ymin=400, xmin=100, ymax=700, xmax=500),
                    confidence=0.88,
                    suggested_item_type="container",
                ),
            ],
            item_candidates=[
                ItemCandidate(
                    id="item_001",
                    label="Rusty Key",
                    description="An old key that might open an ancient lock.",
                    item_type="key",
                    source_object_index=0,
                ),
                ItemCandidate(
                    id="item_002",
                    label="Wooden Box",
                    description="A small box that might contain something.",
                    item_type="container",
                    source_object_index=1,
                ),
            ],
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

        data: dict[str, Any] = parsed

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

        # Mock 모드 처리
        if self._is_mock:
            logger.debug("[ImageUnderstanding] Mock 분석 수행")
            result = _create_mock_scan_result(language)
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
    ) -> ScanResult:
        """비전 모델을 호출합니다.

        Args:
            image_content: 이미지 바이트 데이터
            content_type: MIME 타입
            language: 응답 언어

        Returns:
            ScanResult: 분석 결과
        """
        if self._genai_client is None:
            return _create_fallback_result("비전 클라이언트가 초기화되지 않았습니다")

        # 프롬프트 선택
        prompt_text = SCAN_PROMPTS.get(language, SCAN_PROMPT_KO)

        # 모델 ID 조회
        model_id = get_model_id(ModelLabel.VISION)

        logger.debug(
            "[ImageUnderstanding] 비전 모델 호출",
            extra={
                "model_id": model_id,
                "language": language.value,
                "image_size_kb": len(image_content) // 1024,
            },
        )

        # google-genai SDK 호출 (멀티모달 입력)
        from google.genai.types import Content, GenerateContentConfig, Part

        # 멀티모달 입력 구성 (이미지 먼저, 텍스트 뒤에 - PRD 8.6 권장)
        contents = [
            Content(
                parts=[
                    Part.from_bytes(
                        data=image_content,
                        mime_type=content_type,
                    ),
                    Part.from_text(text=prompt_text),
                ]
            )
        ]

        # JSON 응답 강제 + 충분한 출력 토큰 확보
        config = GenerateContentConfig(
            response_mime_type="application/json",
            max_output_tokens=32768,  # JSON 응답 잘림 방지
        )

        response = await self._genai_client.aio.models.generate_content(  # type: ignore[reportUnknownMemberType]
            model=model_id,
            contents=contents,
            config=config,
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
