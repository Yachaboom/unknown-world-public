"""Unknown World - 이미지 후처리 서비스 (rembg 배경 제거).

이 모듈은 rembg를 사용하여 생성된 이미지의 배경을 제거하는 후처리 서비스입니다.
이미지 유형 힌트에 따라 최적의 모델을 자동 선택합니다.

설계 원칙:
    - RULE-004: 실패 시 안전한 폴백 제공 (원본 이미지 반환)
    - RULE-008: 텍스트 우선 + Lazy 이미지 원칙
    - Q1 결정: Option A (동기 처리)
    - Q2 결정: Option B (힌트 기반 자동 모델 선택)
    - U-045: preflight 상태 참조 → 미준비 시 즉시 원본 반환 (요청 중 다운로드 차단)

참조:
    - vibe/ref/rembg-guide.md (모델 선택/옵션 가이드 SSOT)
    - vibe/unit-plans/U-035[Mvp].md
    - vibe/unit-plans/U-045[Mvp].md
    - vibe/tech-stack.md (rembg 버전 고정)
"""

from __future__ import annotations

import hashlib
import logging
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from unknown_world.services.rembg_preflight import is_rembg_available as preflight_is_available

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# 상수 정의 (rembg-guide.md 기준)
# =============================================================================


class RembgModel(StrEnum):
    """rembg 지원 모델 (vibe/ref/rembg-guide.md 기준).

    모델 선택 우선순위:
    1. 사용자가 모델 명시 → 해당 모델 사용
    2. UI 아이콘/로고/픽셀 아트 → birefnet-general
    3. 제품/오브젝트/일반 사물 → birefnet-general
    4. 실사 인물/사진 → birefnet-portrait + -a
    5. 일본 애니메이션 스타일 캐릭터 → isnet-anime
    6. 속도 우선 → u2netp
    7. 불명확 → birefnet-general (기본값)
    """

    # 범용/기본
    BIREFNET_GENERAL = "birefnet-general"
    """제품/오브젝트/UI 아이콘/일반 (기본값)"""

    ISNET_GENERAL_USE = "isnet-general-use"
    """범용/개선된 품질"""

    # 인물
    BIREFNET_PORTRAIT = "birefnet-portrait"
    """실사 인물 초상화/셀카/프로필"""

    U2NET_HUMAN_SEG = "u2net_human_seg"
    """인물 전신/단체 사진"""

    # 캐릭터/일러스트
    ISNET_ANIME = "isnet-anime"
    """일본 애니메이션 캐릭터 (명확한 경우만)"""

    # 특수
    BIREFNET_DIS = "birefnet-dis"
    """복잡한 배경/고해상도"""

    BIREFNET_MASSIVE = "birefnet-massive"
    """최고 품질 필요"""

    U2NET_CLOTH_SEG = "u2net_cloth_seg"
    """의류/패션/옷"""

    # 속도/경량
    U2NETP = "u2netp"
    """속도 우선/대량 처리"""

    SILUETA = "silueta"
    """경량/저사양"""


# 이미지 유형 → 모델 매핑 (rembg-guide.md 기준)
IMAGE_TYPE_MODEL_MAP: dict[str, tuple[RembgModel, bool]] = {
    # (모델, alpha_matting 사용 여부)
    "icon": (RembgModel.BIREFNET_GENERAL, False),
    "logo": (RembgModel.BIREFNET_GENERAL, False),
    "pixel_art": (RembgModel.BIREFNET_GENERAL, False),
    "ui": (RembgModel.BIREFNET_GENERAL, False),
    "asset": (RembgModel.BIREFNET_GENERAL, False),
    "object": (RembgModel.BIREFNET_GENERAL, False),
    "product": (RembgModel.BIREFNET_GENERAL, False),
    "item": (RembgModel.BIREFNET_GENERAL, False),
    "character": (RembgModel.ISNET_ANIME, False),
    "anime": (RembgModel.ISNET_ANIME, False),
    "illustration": (RembgModel.ISNET_ANIME, False),
    "portrait": (RembgModel.BIREFNET_PORTRAIT, True),
    "selfie": (RembgModel.BIREFNET_PORTRAIT, True),
    "human": (RembgModel.U2NET_HUMAN_SEG, True),
    "person": (RembgModel.U2NET_HUMAN_SEG, True),
    "clothing": (RembgModel.U2NET_CLOTH_SEG, False),
    "fashion": (RembgModel.U2NET_CLOTH_SEG, False),
    "complex": (RembgModel.BIREFNET_DIS, False),
    "detailed": (RembgModel.BIREFNET_DIS, False),
    "best_quality": (RembgModel.BIREFNET_MASSIVE, False),
    "fast": (RembgModel.U2NETP, False),
}

# 기본 설정
DEFAULT_MODEL = RembgModel.BIREFNET_GENERAL
DEFAULT_ALPHA_MATTING = False


# =============================================================================
# 결과 타입 정의
# =============================================================================


class BackgroundRemovalStatus(StrEnum):
    """배경 제거 상태."""

    SUCCESS = "success"
    """배경 제거 성공"""

    FAILED = "failed"
    """배경 제거 실패 (원본 반환)"""

    SKIPPED = "skipped"
    """배경 제거 건너뜀 (비활성화)"""


class BackgroundRemovalResult(BaseModel):
    """배경 제거 결과.

    Attributes:
        status: 처리 상태
        output_path: 출력 파일 경로 (성공/실패 시 모두 존재)
        original_path: 원본 파일 경로
        model_used: 사용된 rembg 모델
        alpha_matting: alpha matting 사용 여부
        processing_time_ms: 처리 시간 (밀리초)
        message: 상태 메시지
    """

    model_config = ConfigDict(extra="forbid")

    status: BackgroundRemovalStatus
    output_path: Path
    original_path: Path
    model_used: str | None = Field(default=None)
    alpha_matting: bool = Field(default=False)
    processing_time_ms: int = Field(default=0)
    message: str | None = Field(default=None)


@dataclass
class RembgConfig:
    """rembg 처리 설정.

    Attributes:
        model: 사용할 모델
        alpha_matting: alpha matting 사용 여부
        output_suffix: 출력 파일 접미사
    """

    model: RembgModel = DEFAULT_MODEL
    alpha_matting: bool = DEFAULT_ALPHA_MATTING
    output_suffix: str = "_nobg"


# =============================================================================
# 헬퍼 함수
# =============================================================================


def select_model_from_hint(image_type_hint: str | None) -> tuple[RembgModel, bool]:
    """이미지 유형 힌트로부터 최적의 rembg 모델을 선택합니다.

    Args:
        image_type_hint: 이미지 유형 힌트 (예: "object", "character", "icon")

    Returns:
        (모델, alpha_matting 사용 여부) 튜플
    """
    if not image_type_hint:
        return DEFAULT_MODEL, DEFAULT_ALPHA_MATTING

    # 힌트를 소문자로 정규화
    hint_lower = image_type_hint.lower().strip()

    # 직접 매칭
    if hint_lower in IMAGE_TYPE_MODEL_MAP:
        return IMAGE_TYPE_MODEL_MAP[hint_lower]

    # 키워드 포함 검색
    for keyword, (model, alpha) in IMAGE_TYPE_MODEL_MAP.items():
        if keyword in hint_lower:
            return model, alpha

    # 기본값 반환
    logger.debug(
        "[Rembg] 알 수 없는 이미지 유형, 기본 모델 사용",
        extra={"hint": image_type_hint, "default_model": DEFAULT_MODEL},
    )
    return DEFAULT_MODEL, DEFAULT_ALPHA_MATTING


def _create_output_path(input_path: Path, suffix: str = "_nobg") -> Path:
    """출력 파일 경로를 생성합니다.

    Args:
        input_path: 입력 파일 경로
        suffix: 파일명 접미사

    Returns:
        출력 파일 경로
    """
    stem = input_path.stem
    return input_path.parent / f"{stem}{suffix}.png"


# =============================================================================
# 메인 서비스 클래스
# =============================================================================


class ImagePostprocessor:
    """이미지 후처리 서비스 (rembg 배경 제거).

    rembg CLI를 사용하여 이미지 배경을 제거합니다.
    실패 시 원본 이미지를 반환하는 안전 폴백을 제공합니다 (RULE-004).
    """

    def __init__(self, timeout_seconds: int = 60) -> None:
        """ImagePostprocessor를 초기화합니다.

        Args:
            timeout_seconds: rembg 실행 타임아웃 (초)
        """
        self._timeout = timeout_seconds
        self._available: bool | None = None

    def is_available(self) -> bool:
        """rembg가 시스템에 설치되어 있는지 확인합니다."""
        if self._available is not None:
            return self._available

        try:
            result = subprocess.run(
                ["rembg", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            self._available = result.returncode == 0
            if self._available:
                logger.info(
                    "[Rembg] rembg 사용 가능",
                    extra={"version": result.stdout.strip()},
                )
            else:
                logger.warning("[Rembg] rembg 버전 확인 실패")
        except FileNotFoundError:
            logger.warning("[Rembg] rembg가 설치되어 있지 않습니다")
            self._available = False
        except Exception as e:
            logger.warning(
                "[Rembg] rembg 확인 중 오류",
                extra={"error_type": type(e).__name__},
            )
            self._available = False

        return self._available

    def remove_background(
        self,
        input_path: Path,
        image_type_hint: str | None = None,
        output_path: Path | None = None,
        config: RembgConfig | None = None,
    ) -> BackgroundRemovalResult:
        """이미지의 배경을 제거합니다.

        Args:
            input_path: 입력 이미지 파일 경로
            image_type_hint: 이미지 유형 힌트 (모델 자동 선택용)
            output_path: 출력 파일 경로 (기본: 입력파일_nobg.png)
            config: rembg 설정 (힌트 대신 직접 설정할 때 사용)

        Returns:
            BackgroundRemovalResult: 처리 결과
        """
        start_time = datetime.now(UTC)

        # 입력 파일 존재 확인
        if not input_path.exists():
            return BackgroundRemovalResult(
                status=BackgroundRemovalStatus.FAILED,
                output_path=input_path,
                original_path=input_path,
                message=f"입력 파일이 존재하지 않습니다: {input_path}",
            )

        # 출력 경로 설정
        if output_path is None:
            output_path = _create_output_path(input_path)

        # 모델/옵션 결정
        if config is not None:
            model = config.model
            alpha_matting = config.alpha_matting
        else:
            model, alpha_matting = select_model_from_hint(image_type_hint)

        # U-045: preflight 상태 확인 (요청 중 다운로드 차단)
        # preflight가 실패/미완료인 경우 즉시 원본 반환
        if not preflight_is_available():
            logger.warning(
                "[Rembg] preflight 미완료 또는 실패, 원본 이미지 사용 (요청 중 다운로드 방지)"
            )
            import shutil

            shutil.copy(input_path, output_path)
            return BackgroundRemovalResult(
                status=BackgroundRemovalStatus.FAILED,
                output_path=output_path,
                original_path=input_path,
                message="rembg preflight가 완료되지 않았습니다. 원본 이미지를 사용합니다.",
            )

        # rembg 사용 가능 여부 확인 (CLI 실행 가능 여부)
        if not self.is_available():
            # 폴백: 원본 복사
            logger.warning("[Rembg] rembg 미설치, 원본 이미지 사용")
            import shutil

            shutil.copy(input_path, output_path)
            return BackgroundRemovalResult(
                status=BackgroundRemovalStatus.FAILED,
                output_path=output_path,
                original_path=input_path,
                message="rembg가 설치되어 있지 않습니다. 원본 이미지를 사용합니다.",
            )

        # 로그용 해시 생성 (파일명 노출 최소화)
        path_hash = hashlib.sha256(str(input_path).encode()).hexdigest()[:8]

        logger.debug(
            "[Rembg] 배경 제거 시작",
            extra={
                "path_hash": path_hash,
                "model": model,
                "alpha_matting": alpha_matting,
            },
        )

        try:
            # rembg CLI 명령어 구성
            cmd = ["rembg", "i", "-m", model]
            if alpha_matting:
                cmd.append("-a")
            cmd.extend([str(input_path), str(output_path)])

            # rembg 실행
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=self._timeout,
            )

            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)

            if result.returncode == 0 and output_path.exists():
                # 파일 크기 측정 (실패 시 0)
                try:
                    output_size = output_path.stat().st_size
                except Exception:
                    output_size = 0

                logger.info(
                    "[Rembg] 배경 제거 완료",
                    extra={
                        "path_hash": path_hash,
                        "model": model,
                        "elapsed_ms": elapsed_ms,
                        "output_size": output_size,
                    },
                )
                return BackgroundRemovalResult(
                    status=BackgroundRemovalStatus.SUCCESS,
                    output_path=output_path,
                    original_path=input_path,
                    model_used=model,
                    alpha_matting=alpha_matting,
                    processing_time_ms=elapsed_ms,
                    message="배경이 성공적으로 제거되었습니다.",
                )
            else:
                # 실패 시 원본 복사 (폴백)
                logger.warning(
                    "[Rembg] 배경 제거 실패, 원본 사용",
                    extra={
                        "path_hash": path_hash,
                        "returncode": result.returncode,
                        "stderr": result.stderr[:200] if result.stderr else None,
                    },
                )
                import shutil

                shutil.copy(input_path, output_path)
                return BackgroundRemovalResult(
                    status=BackgroundRemovalStatus.FAILED,
                    output_path=output_path,
                    original_path=input_path,
                    model_used=model,
                    processing_time_ms=elapsed_ms,
                    message=f"rembg 실행 실패. 원본 이미지를 사용합니다. (exit: {result.returncode})",
                )

        except subprocess.TimeoutExpired:
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            logger.error(
                "[Rembg] 배경 제거 타임아웃",
                extra={"path_hash": path_hash, "timeout": self._timeout},
            )
            # 폴백: 원본 복사
            import shutil

            shutil.copy(input_path, output_path)
            return BackgroundRemovalResult(
                status=BackgroundRemovalStatus.FAILED,
                output_path=output_path,
                original_path=input_path,
                model_used=model,
                processing_time_ms=elapsed_ms,
                message=f"rembg 실행 타임아웃 ({self._timeout}초). 원본 이미지를 사용합니다.",
            )

        except Exception as e:
            elapsed_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            error_type = type(e).__name__
            logger.exception(
                "[Rembg] 배경 제거 중 오류",
                extra={"path_hash": path_hash, "error_type": error_type},
            )
            # 폴백: 원본 복사
            import shutil

            try:
                shutil.copy(input_path, output_path)
            except Exception:
                output_path = input_path

            return BackgroundRemovalResult(
                status=BackgroundRemovalStatus.FAILED,
                output_path=output_path,
                original_path=input_path,
                processing_time_ms=elapsed_ms,
                message=f"배경 제거 중 오류가 발생했습니다: {error_type}. 원본 이미지를 사용합니다.",
            )


# =============================================================================
# 싱글톤 인스턴스
# =============================================================================

_postprocessor_instance: ImagePostprocessor | None = None


def get_image_postprocessor() -> ImagePostprocessor:
    """ImagePostprocessor 싱글톤 인스턴스를 반환합니다."""
    global _postprocessor_instance
    if _postprocessor_instance is None:
        _postprocessor_instance = ImagePostprocessor()
    return _postprocessor_instance


def reset_image_postprocessor() -> None:
    """테스트용 싱글톤 리셋."""
    global _postprocessor_instance
    _postprocessor_instance = None


# =============================================================================
# 편의 함수
# =============================================================================


async def remove_background_if_needed(
    image_path: Path,
    remove_background: bool,
    image_type_hint: str | None = None,
) -> Path:
    """조건부 배경 제거를 수행하고 결과 경로를 반환합니다.

    Args:
        image_path: 이미지 파일 경로
        remove_background: 배경 제거 수행 여부
        image_type_hint: 이미지 유형 힌트

    Returns:
        처리된 이미지 파일 경로 (배경 제거 안 함 시 원본 경로)
    """
    if not remove_background:
        return image_path

    postprocessor = get_image_postprocessor()
    result = postprocessor.remove_background(
        input_path=image_path,
        image_type_hint=image_type_hint,
    )

    # 성공/실패 모두 output_path 반환 (폴백 포함)
    return result.output_path
