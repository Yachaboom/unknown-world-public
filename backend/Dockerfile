# =============================================================================
# Unknown World Backend - Dockerfile
# U-120[Mmp]: 백엔드 실행(Python 3.14 + uv sync + Uvicorn)
#
# Build context: 프로젝트 루트 (docker-compose.yml에서 context: . 사용)
# SSOT: vibe/tech-stack.md (Python 3.14.0, FastAPI 0.128.0, Uvicorn 0.40.0)
# RULE-007: Secret(GOOGLE_API_KEY 등)은 빌드 시 포함 금지 → 런타임 환경변수로 주입
# =============================================================================

FROM python:3.14-slim AS runner

# 시스템 런타임 라이브러리 (Pillow 등에 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo \
    libwebp7 \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

# uv 패키지 매니저 설치 (공식 이미지에서 복사 - 빠르고 안정)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 작업 디렉토리: /app/backend
# seed_scene_images()가 ../frontend/public/ui/scenes/ 경로를 참조하므로
# /app/backend을 WORKDIR로 설정하여 상대 경로 정합성 유지
WORKDIR /app/backend

# 의존성 캐시 레이어 (lockfile 변경 시만 재설치)
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 소스 코드 복사
COPY backend/src/ ./src/
COPY backend/prompts/ ./prompts/

# 프로젝트 설치 (소스 복사 후)
RUN uv sync --frozen --no-dev --no-editable

# 프론트엔드 씬 이미지 복사 (seed_scene_images용)
# 경로: /app/frontend/public/ui/scenes/ (../frontend/public/ui/scenes/ 참조)
COPY frontend/public/ui/scenes/ /app/frontend/public/ui/scenes/

# 데이터 디렉토리 생성 (런타임 쓰기용)
RUN mkdir -p .data/images/generated .data/images/uploaded .data/artifacts

# 환경변수 기본값
# GOOGLE_API_KEY는 런타임에 주입 (RULE-007: 빌드 시 포함 금지)
ENV UW_MODE=real
ENV ENVIRONMENT=production

EXPOSE 8011

# Uvicorn 실행
# --host 0.0.0.0: 컨테이너 외부에서 접근 가능
# --port 8011: RULE-011 준수
CMD ["uv", "run", "uvicorn", "unknown_world.main:app", "--host", "0.0.0.0", "--port", "8011"]
