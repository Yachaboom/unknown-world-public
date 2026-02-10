#!/usr/bin/env bash
# =============================================================================
# Unknown World - Cloud Run 배포 스크립트
# U-120[Mmp]: 프론트엔드 + 백엔드를 Google Cloud Run에 배포
#
# 사전 조건:
#   1. gcloud CLI 설치 및 인증: gcloud auth login
#   2. Docker 설치 및 실행 중
#   3. GCP 프로젝트에 Cloud Run, Artifact Registry, Secret Manager API 활성화
#   4. Gemini API 키를 Secret Manager에 등록:
#      echo -n "your-api-key" | gcloud secrets create GOOGLE_API_KEY --data-file=-
#
# 사용법:
#   export GCP_PROJECT=your-gcp-project-id
#   export GCP_REGION=us-central1   # 선택 (기본값)
#   bash deploy.sh
#
# SSOT: vibe/tech-stack.md (Cloud Run 배포)
# RULE-007: Secret은 이미지에 bake-in 금지 → Secret Manager 사용
# =============================================================================

set -euo pipefail

# ─── 설정 ───────────────────────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:?ERROR: GCP_PROJECT 환경변수를 설정해주세요}"
GCP_REGION="${GCP_REGION:-us-central1}"
BACKEND_SERVICE="unknown-world-backend"
FRONTEND_SERVICE="unknown-world-frontend"
REPO_NAME="unknown-world"
REGISTRY="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT}/${REPO_NAME}"

echo "========================================="
echo " Unknown World - Cloud Run 배포"
echo " Project: ${GCP_PROJECT}"
echo " Region:  ${GCP_REGION}"
echo "========================================="
echo ""

# ─── Step 1: Artifact Registry 리포지토리 확인/생성 ────────────────────────
echo "[1/7] Artifact Registry 확인..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" \
    --location="${GCP_REGION}" \
    --project="${GCP_PROJECT}" >/dev/null 2>&1; then
    echo "  → 리포지토리 생성 중..."
    gcloud artifacts repositories create "${REPO_NAME}" \
        --repository-format=docker \
        --location="${GCP_REGION}" \
        --project="${GCP_PROJECT}" \
        --description="Unknown World container images"
fi
echo "  ✓ Registry: ${REGISTRY}"

# ─── Step 2: Docker 인증 설정 ─────────────────────────────────────────────
echo "[2/7] Docker 인증 설정..."
gcloud auth configure-docker "${GCP_REGION}-docker.pkg.dev" --quiet
echo "  ✓ Docker 인증 완료"

# ─── Step 3: 백엔드 이미지 빌드 + 푸시 ──────────────────────────────────
echo "[3/7] 백엔드 이미지 빌드..."
docker build -f backend/Dockerfile -t "${REGISTRY}/${BACKEND_SERVICE}:latest" .
echo "  → 푸시 중..."
docker push "${REGISTRY}/${BACKEND_SERVICE}:latest"
echo "  ✓ 백엔드 이미지 준비 완료"

# ─── Step 4: 백엔드 Cloud Run 배포 ───────────────────────────────────────
echo "[4/7] 백엔드 Cloud Run 배포..."
gcloud run deploy "${BACKEND_SERVICE}" \
    --image="${REGISTRY}/${BACKEND_SERVICE}:latest" \
    --platform=managed \
    --region="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --allow-unauthenticated \
    --port=8011 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=1 \
    --max-instances=3 \
    --timeout=300 \
    --set-secrets="GOOGLE_API_KEY=GOOGLE_API_KEY:latest" \
    --set-env-vars="UW_MODE=real,ENVIRONMENT=production"

BACKEND_URL=$(gcloud run services describe "${BACKEND_SERVICE}" \
    --platform=managed \
    --region="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --format='value(status.url)')
echo "  ✓ Backend URL: ${BACKEND_URL}"

# ─── Step 5: 프론트엔드 이미지 빌드 + 푸시 ──────────────────────────────
echo "[5/7] 프론트엔드 이미지 빌드..."
docker build -f frontend/Dockerfile -t "${REGISTRY}/${FRONTEND_SERVICE}:latest" .
echo "  → 푸시 중..."
docker push "${REGISTRY}/${FRONTEND_SERVICE}:latest"
echo "  ✓ 프론트엔드 이미지 준비 완료"

# ─── Step 6: 프론트엔드 Cloud Run 배포 ───────────────────────────────────
echo "[6/7] 프론트엔드 Cloud Run 배포..."
gcloud run deploy "${FRONTEND_SERVICE}" \
    --image="${REGISTRY}/${FRONTEND_SERVICE}:latest" \
    --platform=managed \
    --region="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --allow-unauthenticated \
    --port=8001 \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=1 \
    --max-instances=3 \
    --timeout=60 \
    --set-env-vars="BACKEND_URL=${BACKEND_URL},LISTEN_PORT=8001"

FRONTEND_URL=$(gcloud run services describe "${FRONTEND_SERVICE}" \
    --platform=managed \
    --region="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --format='value(status.url)')
echo "  ✓ Frontend URL: ${FRONTEND_URL}"

# ─── Step 7: 백엔드 CORS 업데이트 ───────────────────────────────────────
echo "[7/7] 백엔드 CORS에 프론트엔드 오리진 추가..."
gcloud run services update "${BACKEND_SERVICE}" \
    --platform=managed \
    --region="${GCP_REGION}" \
    --project="${GCP_PROJECT}" \
    --update-env-vars="CORS_ORIGINS=${FRONTEND_URL}"
echo "  ✓ CORS 업데이트 완료"

# ─── 완료 ─────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo " ✅ 배포 완료!"
echo "========================================="
echo ""
echo " 🌐 공개 데모 URL:  ${FRONTEND_URL}"
echo " 🔧 백엔드 API:     ${BACKEND_URL}"
echo " 📋 API 문서:       ${BACKEND_URL}/docs"
echo " ❤️  헬스체크:       ${BACKEND_URL}/health"
echo ""
echo " Devpost 제출용 Public Project Link:"
echo "   ${FRONTEND_URL}"
echo ""
