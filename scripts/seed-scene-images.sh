#!/usr/bin/env bash
# U-124: 사전 생성 씬 이미지를 백엔드 output 디렉터리에 시드합니다.
#
# 프론트엔드의 WebP 정적 에셋을 PNG로 변환하여 백엔드의
# .data/images/generated/ 에 복사합니다.
# 이를 통해 Gemini 참조 이미지 파이프라인(/api/image/file/{id})에서
# 사전 생성 이미지를 첫 턴 참조용으로 사용할 수 있습니다.
#
# 필요 조건: ImageMagick (magick 명령어)
# 사용법: bash scripts/seed-scene-images.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC_DIR="$PROJECT_ROOT/frontend/public/ui/scenes"
DEST_DIR="$PROJECT_ROOT/backend/.data/images/generated"

# 대상 디렉터리 생성
mkdir -p "$DEST_DIR"

# 변환 대상 파일 목록 (확장자 제외한 ID)
SCENE_IDS=(
  "scene-narrator-start"
  "scene-explorer-start"
  "scene-tech-start"
)

converted=0
skipped=0

for id in "${SCENE_IDS[@]}"; do
  src="$SRC_DIR/${id}.webp"
  dest="$DEST_DIR/${id}.png"

  if [ ! -f "$src" ]; then
    echo "[seed] ⚠ 소스 없음: $src"
    continue
  fi

  if [ -f "$dest" ] && [ "$dest" -nt "$src" ]; then
    echo "[seed] ✓ 이미 최신: ${id}.png"
    skipped=$((skipped + 1))
    continue
  fi

  echo "[seed] 변환 중: ${id}.webp → ${id}.png"
  magick "$src" "$dest"
  converted=$((converted + 1))
done

echo "[seed] 완료: ${converted}개 변환, ${skipped}개 건너뜀 (대상: $DEST_DIR)"
