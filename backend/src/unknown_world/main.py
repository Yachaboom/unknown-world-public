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

from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from unknown_world import __version__
from unknown_world.api import image_router, turn_router
from unknown_world.services.image_generation import DEFAULT_OUTPUT_DIR

# =============================================================================
# FastAPI 앱 인스턴스
# =============================================================================

app = FastAPI(
    title="Unknown World API",
    description="Gemini 기반 에이전트형 게임 엔진 오케스트레이터",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
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
