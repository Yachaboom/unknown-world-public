"""Unknown World - Scanner(이미지 이해) 스키마.

이 모듈은 이미지 업로드/분석 API의 요청/응답 스키마를 정의합니다.
사용자가 업로드한 이미지를 분석하여 "단서/아이템 후보"로 변환합니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 (텍스트-only 캡션)
    - RULE-009: bbox는 0~1000 정규화 + [ymin, xmin, ymax, xmax]

페어링 질문 결정:
    - Q1: Option A (multipart 업로드로 처리, 단순)

참조:
    - vibe/unit-plans/U-021[Mvp].md
    - vibe/prd.md 8.6 (이미지 이해 요구)
    - .cursor/rules/00-core-critical.mdc (RULE-004, RULE-009)
"""

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from unknown_world.models.turn import Box2D, Language


class ScanStatus(StrEnum):
    """스캔 상태.

    Attributes:
        COMPLETED: 분석 성공
        PARTIAL: 부분 성공 (일부 정보만 추출됨)
        FAILED: 분석 실패
        BLOCKED: 안전 정책에 의해 차단됨
    """

    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"
    BLOCKED = "blocked"


class DetectedObject(BaseModel):
    """감지된 오브젝트.

    이미지에서 감지된 오브젝트 정보입니다.
    bbox는 0~1000 정규화 + [ymin, xmin, ymax, xmax] 규약을 준수합니다 (RULE-009).

    Attributes:
        label: 오브젝트 라벨 (예: "열쇠", "문", "상자")
        box_2d: 바운딩 박스 (0~1000 정규화)
        confidence: 신뢰도 (0.0~1.0, 선택)
        suggested_item_type: 추천 아이템 유형 (예: "key", "weapon", "clue")
    """

    model_config = ConfigDict(extra="forbid")

    label: str = Field(description="오브젝트 라벨")
    box_2d: Box2D = Field(description="바운딩 박스 (0~1000 정규화)")
    confidence: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="신뢰도 (0.0~1.0)",
    )
    suggested_item_type: str | None = Field(
        default=None,
        description="추천 아이템 유형 (예: key, weapon, clue)",
    )


class ItemCandidate(BaseModel):
    """아이템 후보.

    감지된 오브젝트를 기반으로 생성된 게임 아이템 후보입니다.

    Attributes:
        id: 아이템 후보 ID
        label: 아이템 이름
        description: 아이템 설명
        item_type: 아이템 유형 (예: "key", "weapon", "clue", "material")
        source_object_index: 원본 오브젝트 인덱스 (objects[] 기준)
    """

    model_config = ConfigDict(extra="forbid")

    id: str = Field(description="아이템 후보 ID")
    label: str = Field(description="아이템 이름")
    description: str = Field(default="", description="아이템 설명")
    item_type: str = Field(default="material", description="아이템 유형")
    source_object_index: int | None = Field(
        default=None,
        ge=0,
        description="원본 오브젝트 인덱스",
    )


class ScanResult(BaseModel):
    """스캔 결과.

    이미지 분석 결과 전체를 담는 모델입니다.

    Attributes:
        status: 스캔 상태
        caption: 이미지 전체 캡션
        objects: 감지된 오브젝트 목록
        item_candidates: 아이템 후보 목록
        message: 상태 메시지 (에러/경고 시)
        analysis_time_ms: 분석 소요 시간 (ms)
        original_image_key: 저장된 원본 이미지의 스토리지 키 (RU-006-S1)
        original_image_url: 저장된 원본 이미지의 접근 URL (RU-006-S1)
    """

    model_config = ConfigDict(extra="forbid")

    status: ScanStatus = Field(description="스캔 상태")
    caption: str = Field(default="", description="이미지 전체 캡션")
    objects: list[DetectedObject] = Field(
        default_factory=lambda: [],
        description="감지된 오브젝트 목록",
    )
    item_candidates: list[ItemCandidate] = Field(
        default_factory=lambda: [],
        description="아이템 후보 목록",
    )
    message: str | None = Field(default=None, description="상태 메시지")
    analysis_time_ms: int = Field(default=0, description="분석 소요 시간 (ms)")
    original_image_key: str | None = Field(
        default=None,
        description="저장된 원본 이미지의 스토리지 키 (선택적 저장 시)",
    )
    original_image_url: str | None = Field(
        default=None,
        description="저장된 원본 이미지의 접근 URL (선택적 저장 시)",
    )


class ScanRequest(BaseModel):
    """스캔 요청 (API 계층용).

    Attributes:
        language: 응답 언어 (캡션/라벨에 적용)
    """

    model_config = ConfigDict(extra="forbid")

    language: Language = Field(
        default=Language.KO,
        description="응답 언어 (캡션/라벨에 적용)",
    )


class ScanResponse(BaseModel):
    """스캔 응답 (API 계층용).

    Attributes:
        success: 성공 여부
        result: 스캔 결과
        language: 응답 언어
    """

    model_config = ConfigDict(extra="forbid")

    success: bool = Field(description="성공 여부")
    result: ScanResult = Field(description="스캔 결과")
    language: Language = Field(description="응답 언어")
