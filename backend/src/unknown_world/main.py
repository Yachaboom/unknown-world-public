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
# main.py 위치: backend/src/unknown_world/main.py
# backend/.env 위치: backend/.env (3단계 상위)
# resolve()로 절대 경로 보장
_DOTENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

# .env 로딩 (override=False: 기존 환경변수 우선)
_dotenv_loaded = load_dotenv(dotenv_path=_DOTENV_PATH, override=False)

# 디버그: .env 로딩 상태 즉시 출력 (U-047 검증용)
import sys

print(f"[Startup] .env path: {_DOTENV_PATH}", file=sys.stderr)
print(f"[Startup] .env exists: {_DOTENV_PATH.exists()}", file=sys.stderr)
print(f"[Startup] dotenv loaded: {_dotenv_loaded}", file=sys.stderr)
import os as _os_temp

print(f"[Startup] UW_MODE: {_os_temp.environ.get('UW_MODE', 'NOT_SET')}", file=sys.stderr)

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from unknown_world import __version__
from unknown_world.api import (
    ending_report_router,
    image_router,
    item_icon_router,
    scanner_router,
    turn_router,
)
from unknown_world.storage.paths import BASE_DATA_DIR, STATIC_URL_PREFIX
from unknown_world.storage.seed import seed_scene_images

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
        "[Config] .env file loaded",
        extra={
            "dotenv_path": str(_DOTENV_PATH),
            "UW_MODE": _uw_mode,
            "ENVIRONMENT": _environment,
        },
    )
else:
    logger.debug(
        "[Config] .env file not found or failed to load (using defaults)",
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
        - 기본 초기화 (U-091: rembg preflight 제거됨)

    서버 종료 시:
        - 필요한 정리 작업 수행
    """
    # =========================================================================
    # Startup
    # =========================================================================
    logger.info("[Startup] Unknown World backend starting")

    # U-124: 사전 생성 씬 이미지를 백엔드 output 디렉터리에 시드
    # 프론트엔드 WebP → 백엔드 PNG 변환 (Gemini 참조 이미지 파이프라인용)
    seed_scene_images()

    logger.info("[Startup] Unknown World backend started")

    yield

    # =========================================================================
    # Shutdown
    # =========================================================================
    logger.info("[Shutdown] Unknown World backend shutting down")


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
# 정적 파일 서빙 (U-019, RU-006-Q5)
# =============================================================================
# 데이터 디렉토리 생성 및 정적 파일 서빙
# 전체 .data 디렉토리를 /static으로 서빙하여 카테고리별 경로 지원
# 예: /static/images/generated/img_xxx.png
BASE_DATA_DIR.mkdir(parents=True, exist_ok=True)
app.mount(STATIC_URL_PREFIX, StaticFiles(directory=str(BASE_DATA_DIR)), name="static")

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

# U-021: /api/scan 이미지 이해(Scanner) 엔드포인트
app.include_router(scanner_router)

# U-075: /api/item 아이템 아이콘 생성 엔드포인트
app.include_router(item_icon_router)

# U-025: /api/ending-report 엔딩 리포트 생성 엔드포인트
app.include_router(ending_report_router)


# =============================================================================
# 응답 스키마 (Pydantic)
# =============================================================================


class HealthResponse(BaseModel):
    """헬스체크 응답 스키마.

    Attributes:
        status: 서버 상태 ("ok" 또는 "degraded")
        version: 백엔드 버전
        service: 서비스 이름
    """

    status: Literal["ok", "degraded"]
    version: str
    service: str


# =============================================================================
# 라우트 정의
# =============================================================================


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check() -> HealthResponse:
    """서버 헬스체크 엔드포인트.

    서버가 정상적으로 작동 중인지 확인합니다.
    이 엔드포인트는 로드밸런서, 모니터링 시스템, 클라이언트 연결 확인에 사용됩니다.

    U-091: rembg 런타임 제거 - 배경 제거 상태 정보 더 이상 포함하지 않음.

    Returns:
        HealthResponse: 서버 상태 정보
    """
    return HealthResponse(
        status="ok",
        version=__version__,
        service="unknown-world-backend",
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
