# =============================================================================
# Unknown World Frontend - Multi-stage Dockerfile
# U-120[Mmp]: 프론트엔드 빌드(Node 24) + 정적 서빙(nginx)
#
# Build context: 프로젝트 루트 (docker-compose.yml에서 context: . 사용)
# SSOT: vibe/tech-stack.md (Node 24.12.0, pnpm 10.27.0)
# RULE-007: Secret은 이미지에 bake-in 금지
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Build (Node 24 + pnpm)
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder

# pnpm 활성화 (Corepack)
RUN corepack enable && corepack prepare pnpm@10.27.0 --activate

WORKDIR /app

# 의존성 캐시 레이어 (lockfile 변경 시만 재설치)
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 복사 + 빌드
COPY frontend/ .
RUN pnpm build

# ---------------------------------------------------------------------------
# Stage 2: Serve (nginx)
# ---------------------------------------------------------------------------
FROM nginx:stable-alpine AS runner

# 기본 nginx 설정 제거
RUN rm -f /etc/nginx/conf.d/default.conf

# 빌드 결과 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 설정 템플릿 복사
# nginx:alpine 이미지는 /etc/nginx/templates/*.template를
# envsubst로 처리하여 /etc/nginx/conf.d/로 자동 복사
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template

# 환경변수 기본값
# Docker Compose: BACKEND_URL=http://backend:8011
# Cloud Run: BACKEND_URL=https://xxx.run.app LISTEN_PORT=$PORT
ENV BACKEND_URL=http://backend:8011
ENV LISTEN_PORT=8001

EXPOSE 8001

# nginx 기본 엔트리포인트 사용 (envsubst 자동 처리)
CMD ["nginx", "-g", "daemon off;"]
