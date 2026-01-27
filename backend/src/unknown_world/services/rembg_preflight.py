"""Unknown World - rembg 사전 점검 서비스 (preflight).

이 모듈은 서버 시작 시 rembg 설치 여부와 모델 캐시를 사전 점검하고,
필요한 경우 모델을 미리 다운로드하여 첫 rembg 호출에서 발생하는 지연을 방지합니다.

설계 원칙:
    - RULE-004: 실패해도 서비스 중단 없이 degraded 모드로 운영
    - Q1 결정: Option A (타임아웃 짧게 + 실패 시 degraded)
    - Q2 결정: Option A (birefnet-general만 기본 prefetch)

참조:
    - vibe/ref/rembg-guide.md (모델 선택/다운로드 가이드 SSOT)
    - vibe/unit-plans/U-045[Mvp].md
    - vibe/tech-stack.md (rembg 버전 고정)
"""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)


# =============================================================================
# 상수 및 환경변수
# =============================================================================

# 기본 prefetch 모델 (Q2: Option A - birefnet-general만)
DEFAULT_PREFETCH_MODELS: list[str] = ["birefnet-general"]

# 환경변수로 확장 모델 목록 주입 가능
# 예: UW_REMBG_PREFETCH_MODELS=birefnet-general,birefnet-portrait
ENV_PREFETCH_MODELS = "UW_REMBG_PREFETCH_MODELS"

# preflight 타임아웃 (Q1: Option A - 짧은 타임아웃)
# 모델 다운로드는 100~200MB로 네트워크에 따라 시간이 걸릴 수 있음
DEFAULT_PREFLIGHT_TIMEOUT_SECONDS = 120  # 2분
ENV_PREFLIGHT_TIMEOUT = "UW_REMBG_PREFLIGHT_TIMEOUT"

# 개별 모델 다운로드 타임아웃
DEFAULT_MODEL_DOWNLOAD_TIMEOUT_SECONDS = 90  # 1.5분
ENV_MODEL_DOWNLOAD_TIMEOUT = "UW_REMBG_MODEL_DOWNLOAD_TIMEOUT"


# =============================================================================
# 상태 타입 정의
# =============================================================================


class RembgReadyStatus(StrEnum):
    """rembg 준비 상태."""

    READY = "ready"
    """rembg 설치됨, 필수 모델 사용 가능"""

    DEGRADED = "degraded"
    """rembg 설치됨, 일부 모델 누락/다운로드 실패"""

    UNAVAILABLE = "unavailable"
    """rembg 미설치 또는 사용 불가"""

    PENDING = "pending"
    """preflight 아직 실행되지 않음"""


@dataclass
class ModelStatus:
    """개별 모델 상태.

    Attributes:
        name: 모델 이름
        available: 사용 가능 여부
        download_attempted: 다운로드 시도 여부
        error: 에러 메시지 (있을 경우)
    """

    name: str
    available: bool = False
    download_attempted: bool = False
    error: str | None = None


class RembgPreflightResult(BaseModel):
    """rembg preflight 결과.

    Attributes:
        status: 전체 준비 상태
        installed: rembg 설치 여부
        version: rembg 버전 (설치된 경우)
        preloaded_models: 사용 가능한 모델 목록
        missing_models: 누락된 모델 목록
        last_error: 마지막 에러 메시지
        preflight_time_ms: preflight 소요 시간 (밀리초)
        timestamp: preflight 실행 시각
    """

    model_config = ConfigDict(extra="forbid")

    status: RembgReadyStatus = Field(default=RembgReadyStatus.PENDING)
    installed: bool = Field(default=False)
    version: str | None = Field(default=None)
    preloaded_models: list[str] = Field(default_factory=list)
    missing_models: list[str] = Field(default_factory=list)
    last_error: str | None = Field(default=None)
    preflight_time_ms: int = Field(default=0)
    timestamp: str | None = Field(default=None)


@dataclass
class PreflightConfig:
    """preflight 설정.

    Attributes:
        models_to_prefetch: prefetch할 모델 목록
        preflight_timeout_seconds: 전체 preflight 타임아웃
        model_download_timeout_seconds: 개별 모델 다운로드 타임아웃
    """

    models_to_prefetch: list[str] = field(default_factory=lambda: DEFAULT_PREFETCH_MODELS.copy())
    preflight_timeout_seconds: int = DEFAULT_PREFLIGHT_TIMEOUT_SECONDS
    model_download_timeout_seconds: int = DEFAULT_MODEL_DOWNLOAD_TIMEOUT_SECONDS

    @classmethod
    def from_env(cls) -> PreflightConfig:
        """환경변수에서 설정을 로드합니다."""
        # 모델 목록
        models_env = os.environ.get(ENV_PREFETCH_MODELS)
        if models_env:
            models = [m.strip() for m in models_env.split(",") if m.strip()]
        else:
            models = DEFAULT_PREFETCH_MODELS.copy()

        # 타임아웃
        try:
            preflight_timeout = int(
                os.environ.get(ENV_PREFLIGHT_TIMEOUT, DEFAULT_PREFLIGHT_TIMEOUT_SECONDS)
            )
        except ValueError:
            preflight_timeout = DEFAULT_PREFLIGHT_TIMEOUT_SECONDS

        try:
            download_timeout = int(
                os.environ.get(ENV_MODEL_DOWNLOAD_TIMEOUT, DEFAULT_MODEL_DOWNLOAD_TIMEOUT_SECONDS)
            )
        except ValueError:
            download_timeout = DEFAULT_MODEL_DOWNLOAD_TIMEOUT_SECONDS

        return cls(
            models_to_prefetch=models,
            preflight_timeout_seconds=preflight_timeout,
            model_download_timeout_seconds=download_timeout,
        )


# =============================================================================
# Preflight 서비스 클래스
# =============================================================================


class RembgPreflight:
    """rembg 사전 점검 서비스.

    서버 시작 시 rembg 설치 여부와 모델 캐시를 점검하고,
    필요한 경우 모델을 미리 다운로드합니다.
    """

    def __init__(self, config: PreflightConfig | None = None) -> None:
        """RembgPreflight를 초기화합니다.

        Args:
            config: preflight 설정 (None이면 환경변수에서 로드)
        """
        self._config = config or PreflightConfig.from_env()
        self._result: RembgPreflightResult = RembgPreflightResult()
        self._model_statuses: dict[str, ModelStatus] = {}
        self._executed = False

    @property
    def result(self) -> RembgPreflightResult:
        """현재 preflight 결과를 반환합니다."""
        return self._result

    def set_result(self, result: RembgPreflightResult) -> None:
        """preflight 결과를 설정합니다 (테스트용)."""
        self._result = result

    @property
    def is_ready(self) -> bool:
        """rembg가 사용 준비되었는지 확인합니다."""
        return self._result.status == RembgReadyStatus.READY

    @property
    def is_available(self) -> bool:
        """rembg가 사용 가능한지 확인합니다 (degraded 포함)."""
        return self._result.status in (RembgReadyStatus.READY, RembgReadyStatus.DEGRADED)

    def _check_rembg_installed(self) -> tuple[bool, str | None]:
        """rembg 설치 여부를 확인합니다.

        Returns:
            (설치 여부, 버전 또는 None)
        """
        try:
            result = subprocess.run(
                ["rembg", "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                logger.info("[Preflight] rembg 설치 확인", extra={"version": version})
                return True, version
            else:
                logger.warning(
                    "[Preflight] rembg 버전 확인 실패", extra={"returncode": result.returncode}
                )
                return False, None
        except FileNotFoundError:
            logger.warning("[Preflight] rembg가 설치되어 있지 않습니다")
            return False, None
        except subprocess.TimeoutExpired:
            logger.warning("[Preflight] rembg 버전 확인 타임아웃")
            return False, None
        except Exception as e:
            logger.warning("[Preflight] rembg 확인 중 오류", extra={"error": str(e)[:100]})
            return False, None

    def _check_model_available(self, model: str) -> bool:
        """특정 모델이 캐시에 있는지 확인합니다.

        rembg는 모델을 처음 사용할 때 자동으로 다운로드합니다.
        모델 캐시 위치: ~/.u2net/ (기본)

        Args:
            model: 확인할 모델 이름

        Returns:
            모델 사용 가능 여부
        """
        # rembg 모델 캐시 디렉토리 확인
        # 기본 경로: ~/.u2net/{model}.onnx
        home = Path.home()
        u2net_dir = home / ".u2net"

        # 모델 파일 패턴 (모델마다 파일명이 다를 수 있음)
        # birefnet-general → birefnet-general.onnx
        model_file = u2net_dir / f"{model}.onnx"

        if model_file.exists():
            logger.debug(
                "[Preflight] 모델 캐시 발견", extra={"model": model, "path": str(model_file)}
            )
            return True

        logger.debug("[Preflight] 모델 캐시 없음", extra={"model": model})
        return False

    def _download_model(self, model: str) -> bool:
        """모델을 다운로드합니다.

        Args:
            model: 다운로드할 모델 이름

        Returns:
            다운로드 성공 여부
        """
        timeout = self._config.model_download_timeout_seconds

        logger.info("[Preflight] 모델 다운로드 시작", extra={"model": model, "timeout": timeout})

        try:
            # rembg d <model> 명령으로 다운로드
            result = subprocess.run(
                ["rembg", "d", model],
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            if result.returncode == 0:
                logger.info("[Preflight] 모델 다운로드 완료", extra={"model": model})
                return True
            else:
                stderr_preview = result.stderr[:200] if result.stderr else "N/A"
                logger.warning(
                    "[Preflight] 모델 다운로드 실패",
                    extra={
                        "model": model,
                        "returncode": result.returncode,
                        "stderr": stderr_preview,
                    },
                )
                return False

        except subprocess.TimeoutExpired:
            logger.warning(
                "[Preflight] 모델 다운로드 타임아웃", extra={"model": model, "timeout": timeout}
            )
            return False
        except Exception as e:
            logger.warning(
                "[Preflight] 모델 다운로드 중 오류", extra={"model": model, "error": str(e)[:100]}
            )
            return False

    def _process_model(self, model: str) -> ModelStatus:
        """모델 상태를 확인하고 필요시 다운로드합니다.

        Args:
            model: 처리할 모델 이름

        Returns:
            ModelStatus 객체
        """
        status = ModelStatus(name=model)

        # 1. 캐시 확인
        if self._check_model_available(model):
            status.available = True
            return status

        # 2. 캐시 없으면 다운로드 시도
        status.download_attempted = True
        if self._download_model(model):
            # 다운로드 후 재확인
            if self._check_model_available(model):
                status.available = True
            else:
                status.error = "다운로드 완료했으나 모델 파일을 찾을 수 없음"
        else:
            status.error = "다운로드 실패"

        return status

    async def run_async(self) -> RembgPreflightResult:
        """비동기로 preflight를 실행합니다.

        Returns:
            RembgPreflightResult 객체
        """
        # 동기 작업을 별도 스레드에서 실행
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.run)

    def run(self) -> RembgPreflightResult:
        """preflight를 실행합니다.

        Returns:
            RembgPreflightResult 객체
        """
        start_time = datetime.now(UTC)
        self._executed = True

        logger.info(
            "[Preflight] rembg preflight 시작",
            extra={
                "models": self._config.models_to_prefetch,
                "timeout": self._config.preflight_timeout_seconds,
            },
        )

        # 1. rembg 설치 확인
        installed, version = self._check_rembg_installed()
        self._result.installed = installed
        self._result.version = version

        if not installed:
            self._result.status = RembgReadyStatus.UNAVAILABLE
            self._result.last_error = "rembg가 설치되어 있지 않습니다"
            self._result.timestamp = datetime.now(UTC).isoformat()
            self._result.preflight_time_ms = int(
                (datetime.now(UTC) - start_time).total_seconds() * 1000
            )

            logger.warning("[Preflight] rembg 미설치, UNAVAILABLE 상태로 완료")
            return self._result

        # 2. 각 모델 점검 및 다운로드
        preloaded: list[str] = []
        missing: list[str] = []

        for model in self._config.models_to_prefetch:
            # 전체 타임아웃 체크
            elapsed = (datetime.now(UTC) - start_time).total_seconds()
            if elapsed > self._config.preflight_timeout_seconds:
                logger.warning("[Preflight] 전체 타임아웃 도달, 남은 모델 스킵")
                # 남은 모델은 missing으로 처리
                remaining_models = self._config.models_to_prefetch[
                    self._config.models_to_prefetch.index(model) :
                ]
                for remaining in remaining_models:
                    if remaining not in [s.name for s in self._model_statuses.values()]:
                        status = ModelStatus(name=remaining, error="preflight 타임아웃으로 스킵됨")
                        self._model_statuses[remaining] = status
                        missing.append(remaining)
                break

            status = self._process_model(model)
            self._model_statuses[model] = status

            if status.available:
                preloaded.append(model)
            else:
                missing.append(model)

        # 3. 결과 정리
        self._result.preloaded_models = preloaded
        self._result.missing_models = missing
        self._result.preflight_time_ms = int(
            (datetime.now(UTC) - start_time).total_seconds() * 1000
        )
        self._result.timestamp = datetime.now(UTC).isoformat()

        # 상태 결정
        if not missing:
            self._result.status = RembgReadyStatus.READY
            logger.info(
                "[Preflight] rembg READY",
                extra={"preloaded": preloaded, "elapsed_ms": self._result.preflight_time_ms},
            )
        elif preloaded:
            self._result.status = RembgReadyStatus.DEGRADED
            self._result.last_error = f"일부 모델 누락: {', '.join(missing)}"
            logger.warning(
                "[Preflight] rembg DEGRADED",
                extra={
                    "preloaded": preloaded,
                    "missing": missing,
                    "elapsed_ms": self._result.preflight_time_ms,
                },
            )
        else:
            self._result.status = RembgReadyStatus.DEGRADED
            self._result.last_error = f"모든 prefetch 모델 누락: {', '.join(missing)}"
            logger.warning(
                "[Preflight] rembg DEGRADED (모든 모델 누락)",
                extra={"missing": missing, "elapsed_ms": self._result.preflight_time_ms},
            )

        return self._result


# =============================================================================
# 전역 인스턴스 및 접근자
# =============================================================================

_preflight_instance: RembgPreflight | None = None
_preflight_result: RembgPreflightResult = RembgPreflightResult()


def get_rembg_preflight() -> RembgPreflight:
    """RembgPreflight 싱글톤 인스턴스를 반환합니다."""
    global _preflight_instance
    if _preflight_instance is None:
        _preflight_instance = RembgPreflight()
    return _preflight_instance


def get_rembg_status() -> RembgPreflightResult:
    """현재 rembg preflight 결과를 반환합니다."""
    global _preflight_result
    if _preflight_instance is not None:
        return _preflight_instance.result
    return _preflight_result


def set_rembg_status(result: RembgPreflightResult) -> None:
    """rembg preflight 결과를 설정합니다 (테스트용)."""
    global _preflight_result, _preflight_instance
    _preflight_result = result
    # 인스턴스가 있으면 공개 메서드로 결과 업데이트
    if _preflight_instance is not None:
        _preflight_instance.set_result(result)


def is_rembg_ready() -> bool:
    """rembg가 준비되었는지 확인합니다 (바로 사용 가능)."""
    status = get_rembg_status()
    return status.status == RembgReadyStatus.READY


def is_rembg_available() -> bool:
    """rembg가 사용 가능한지 확인합니다 (degraded 포함)."""
    status = get_rembg_status()
    return status.status in (RembgReadyStatus.READY, RembgReadyStatus.DEGRADED)


def reset_rembg_preflight() -> None:
    """테스트용 싱글톤 리셋."""
    global _preflight_instance, _preflight_result
    _preflight_instance = None
    _preflight_result = RembgPreflightResult()


async def run_preflight_async(config: PreflightConfig | None = None) -> RembgPreflightResult:
    """비동기로 preflight를 실행하고 전역 상태를 업데이트합니다.

    Args:
        config: preflight 설정 (None이면 환경변수에서 로드)

    Returns:
        RembgPreflightResult 객체
    """
    global _preflight_instance, _preflight_result

    _preflight_instance = RembgPreflight(config)
    result = await _preflight_instance.run_async()
    _preflight_result = result

    return result
