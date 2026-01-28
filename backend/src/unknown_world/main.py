"""Unknown World - FastAPI 애플리케이션 엔트리포인트

이 모듈은 Unknown World 백엔드의 FastAPI 앱을 정의합니다.
MVP 단계에서는 기본 헬스체크와 개발용 CORS 설정만 포함합니다.

실행 방법:
    cd backend
    uv sync
    uv run uvicorn unknown_world.main:app --reload --port 8011

참조:
    - vibe/tech-stack.md (버전 SSOT)
    - vibe/prd.md (에이전트형 게임 엔진 요구사항)
    - .cursor/rules/20-backend-orchestrator.mdc (SSE/검증/복구 규칙)
"""

# ruff: noqa: E402
# E402 무시: .env 로딩은 의도적으로 다른 import보다 먼저 실행되어야 함 (U-047)

# =============================================================================
# .env 자동 로딩 (U-047)
# =============================================================================
# 로컬 개발에서 backend/.env 파일이 있으면 자동 로딩합니다.
# - override=False: 이미 설정된 환경변수는 덮어쓰지 않음 (운영 환경 SSOT 보장)
# - 파일 미존재 시 no-op (운영/CI에서 파일 미존재를 기본으로 허용)
# - 페어링 질문 Q1 결정: Option A (import 시점에 로드)
#
# 보안 규칙:
#   - .env 파일은 레포에 커밋 금지 (.gitignore 필수)
#   - 민감 정보(키/토큰/프롬프트)는 로그/스트림/UI에 노출 금지 (RULE-007)
import os
from pathlib import Path

from dotenv import load_dotenv

# .env 파일 경로 (backend 디렉토리 기준)
_DOTENV_PATH = Path(__file__).parent.parent.parent.parent / ".env"

# .env 로딩 (override=False: 기존 환경변수 우선)
_dotenv_loaded = load_dotenv(dotenv_path=_DOTENV_PATH, override=False)

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from unknown_world import __version__
from unknown_world.api import image_router, turn_router
from unknown_world.services.image_generation import DEFAULT_OUTPUT_DIR
from unknown_world.services.rembg_preflight import (
    RembgPreflightResult,
    RembgReadyStatus,
    get_rembg_status,
    run_preflight_async,
)

# =============================================================================
# 로거 설정
# =============================================================================

logger = logging.getLogger(__name__)

# =============================================================================
# .env 로딩 상태 로깅 (U-047)
# =============================================================================
# 민감 정보(키/토큰/경로)는 출력하지 않음 (RULE-007/008)
# 모드/환경 정도만 로깅하여 디버깅 용이성 확보

_uw_mode = os.environ.get("UW_MODE", "mock")  # 기본값: mock (genai_client.py 정책)
_environment = os.environ.get("ENVIRONMENT", "development")

if _dotenv_loaded:
    logger.info(
        "[Config] .env 파일 로드 완료",
        extra={
            "dotenv_path": str(_DOTENV_PATH),
            "UW_MODE": _uw_mode,
            "ENVIRONMENT": _environment,
        },
    )
else:
    logger.debug(
        "[Config] .env 파일 미존재 또는 로드 실패 (기본값 사용)",
        extra={
            "UW_MODE": _uw_mode,
            "ENVIRONMENT": _environment,
        },
    )

# =============================================================================
# Lifespan (서버 시작/종료 이벤트)
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """FastAPI 앱 lifespan 관리.

    서버 시작 시:
        - rembg preflight 실행 (모델 사전 점검/다운로드)

    서버 종료 시:
        - 필요한 정리 작업 수행
    """
    # =========================================================================
    # Startup
    # =========================================================================
    logger.info("[Startup] Unknown World 백엔드 시작")

    # rembg preflight 실행 (U-045)
    # Q1: Option A - 타임아웃 짧게 + 실패 시 degraded 모드로 계속
    try:
        logger.info("[Startup] rembg preflight 시작")
        result = await run_preflight_async()

        if result.status == RembgReadyStatus.READY:
            logger.info(
                "[Startup] rembg READY",
                extra={
                    "preloaded_models": result.preloaded_models,
                    "elapsed_ms": result.preflight_time_ms,
                },
            )
        elif result.status == RembgReadyStatus.DEGRADED:
            logger.warning(
                "[Startup] rembg DEGRADED - 일부 기능이 제한될 수 있습니다",
                extra={
                    "preloaded_models": result.preloaded_models,
                    "missing_models": result.missing_models,
                    "last_error": result.last_error,
                },
            )
        else:
            logger.warning(
                "[Startup] rembg UNAVAILABLE - 배경 제거 기능이 비활성화됩니다",
                extra={"last_error": result.last_error},
            )

        # app.state에 저장
        app.state.rembg_status = result

    except Exception as e:
        # preflight 실패해도 서비스는 계속 (RULE-004)
        logger.exception("[Startup] rembg preflight 실패, degraded 모드로 시작")
        app.state.rembg_status = RembgPreflightResult(
            status=RembgReadyStatus.UNAVAILABLE,
            installed=False,
            last_error=f"preflight 예외: {type(e).__name__}",
        )

    logger.info("[Startup] Unknown World 백엔드 시작 완료")

    yield

    # =========================================================================
    # Shutdown
    # =========================================================================
    logger.info("[Shutdown] Unknown World 백엔드 종료")


# =============================================================================
# FastAPI 앱 인스턴스
# =============================================================================

app = FastAPI(
    title="Unknown World API",
    description="Gemini 기반 에이전트형 게임 엔진 오케스트레이터",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# =============================================================================
# 정적 파일 서빙 (U-019)
# =============================================================================
# 생성된 이미지를 /static/images 경로로 서빙합니다.
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=str(DEFAULT_OUTPUT_DIR)), name="images")

# =============================================================================
# CORS 설정 (개발 환경용)
# =============================================================================
# PRD 요구: 로컬 개발에서 프론트와 통신할 수 있도록 CORS 기본 정책 준비
# RULE-011: 프론트엔드는 8001~8010 포트 사용
# 주의: 프로덕션에서는 MMP 단계에서 엄격한 정책으로 변경해야 함

ALLOWED_ORIGINS = [
    # 프론트엔드 개발 서버 포트 범위 (RULE-011: 8001~8010)
    *[f"http://localhost:{port}" for port in range(8001, 8011)],
    *[f"http://127.0.0.1:{port}" for port in range(8001, 8011)],
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# 라우터 등록
# =============================================================================

# U-007: /api/turn HTTP Streaming 엔드포인트
app.include_router(turn_router)

# U-019: /api/image 이미지 생성 엔드포인트
app.include_router(image_router)


# =============================================================================
# 응답 스키마 (Pydantic)
# =============================================================================


class RembgHealthInfo(BaseModel):
    """rembg 상태 정보 (헬스체크용).

    Attributes:
        status: rembg 준비 상태
        installed: 설치 여부
        preloaded_models: 사용 가능한 모델 목록
        missing_models: 누락된 모델 목록
        last_error: 마지막 에러 (있을 경우)
    """

    status: str = Field(description="rembg 준비 상태 (ready/degraded/unavailable/pending)")
    installed: bool = Field(description="rembg 설치 여부")
    preloaded_models: list[str] = Field(default_factory=list, description="사용 가능한 모델 목록")
    missing_models: list[str] = Field(default_factory=list, description="누락된 모델 목록")
    last_error: str | None = Field(default=None, description="마지막 에러 메시지")


class HealthResponse(BaseModel):
    """헬스체크 응답 스키마.

    Attributes:
        status: 서버 상태 ("ok" 또는 "degraded")
        version: 백엔드 버전
        service: 서비스 이름
        rembg: rembg 상태 정보 (선택)
    """

    status: Literal["ok", "degraded"]
    version: str
    service: str
    rembg: RembgHealthInfo | None = Field(default=None, description="rembg 상태 정보")


# =============================================================================
# 라우트 정의
# =============================================================================


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """서버 헬스체크 엔드포인트.

    서버가 정상적으로 작동 중인지 확인합니다.
    이 엔드포인트는 로드밸런서, 모니터링 시스템, 클라이언트 연결 확인에 사용됩니다.

    rembg 상태:
        - ready: rembg 설치 + 필수 모델 캐시 완료
        - degraded: rembg 설치 + 일부 모델 누락
        - unavailable: rembg 미설치 또는 사용 불가
        - pending: preflight 아직 실행되지 않음

    Returns:
        HealthResponse: 서버 상태 정보
    """
    # rembg 상태 조회
    rembg_result = get_rembg_status()

    # 전체 서버 상태 결정
    # rembg가 unavailable이어도 서버는 ok (배경 제거만 비활성화)
    server_status: Literal["ok", "degraded"] = "ok"
    if rembg_result.status == RembgReadyStatus.UNAVAILABLE:
        # rembg 미사용 가능 시 degraded로 표시 (선택적)
        # 현재는 rembg 없어도 ok로 유지 (이미지 후처리만 스킵)
        server_status = "ok"

    # rembg 정보 구성
    rembg_info = RembgHealthInfo(
        status=rembg_result.status.value,
        installed=rembg_result.installed,
        preloaded_models=rembg_result.preloaded_models,
        missing_models=rembg_result.missing_models,
        last_error=rembg_result.last_error,
    )

    return HealthResponse(
        status=server_status,
        version=__version__,
        service="unknown-world-backend",
        rembg=rembg_info,
    )


@app.get("/", tags=["System"])
async def root() -> dict[str, str]:
    """루트 엔드포인트.

    API 정보를 간략히 안내합니다.

    Returns:
        dict: 기본 안내 메시지
    """
    return {
        "message": "Unknown World API",
        "docs": "/docs",
        "health": "/health",
    }
