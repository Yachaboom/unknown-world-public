"""U-124: 사전 생성 씬 이미지 시드.

백엔드 시작 시 프론트엔드의 사전 생성 씬 이미지(WebP)를
백엔드 output 디렉터리(PNG)로 복사합니다.

이를 통해 Gemini 참조 이미지 파이프라인(/api/image/file/{id})에서
사전 생성 이미지를 첫 턴 참조용으로 사용할 수 있습니다.

참조:
    - vibe/unit-plans/U-124[Mvp].md
    - frontend/public/ui/scenes/ (원본 WebP)
    - .data/images/generated/ (대상 PNG)
"""

from __future__ import annotations

import logging
from pathlib import Path

from unknown_world.storage.paths import get_generated_images_dir

logger = logging.getLogger(__name__)

# 백엔드 cwd 기준 프론트엔드 에셋 경로
# backend/ → ../frontend/public/ui/scenes/
_FRONTEND_SCENES_DIR = Path("../frontend/public/ui/scenes")

# 시드 대상 파일 ID 목록 (확장자 제외)
_SCENE_IMAGE_IDS: list[str] = [
    "scene-narrator-start",
    "scene-explorer-start",
    "scene-tech-start",
]


def seed_scene_images() -> None:
    """사전 생성 씬 이미지를 백엔드 output 디렉터리에 시드합니다.

    - 프론트엔드 WebP → 백엔드 PNG 변환 (Pillow 사용)
    - 이미 존재하고 원본보다 새로우면 건너뜀 (멱등)
    - 원본 미존재 또는 Pillow 오류 시 경고만 출력 (서버 시작 차단 금지)
    """
    dest_dir = get_generated_images_dir()
    dest_dir.mkdir(parents=True, exist_ok=True)

    scenes_dir = _FRONTEND_SCENES_DIR
    if not scenes_dir.exists():
        logger.warning(
            "[Seed] Frontend scene directory not found, skipping seed",
            extra={"path": str(scenes_dir.resolve())},
        )
        return

    converted = 0
    skipped = 0

    for image_id in _SCENE_IMAGE_IDS:
        src = scenes_dir / f"{image_id}.webp"
        dest = dest_dir / f"{image_id}.png"

        if not src.exists():
            logger.warning(
                "[Seed] Source WebP not found",
                extra={"image_id": image_id, "path": str(src)},
            )
            continue

        # 멱등: 대상이 이미 존재하고 원본보다 새로우면 건너뜀
        if dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue

        try:
            from PIL import Image

            with Image.open(src) as img:
                img.save(dest, format="PNG")
            converted += 1
            logger.info(
                "[Seed] Scene image converted",
                extra={"image_id": image_id, "size_bytes": dest.stat().st_size},
            )
        except Exception:
            logger.exception(
                "[Seed] Scene image conversion failed",
                extra={"image_id": image_id},
            )

    logger.info(
        "[Seed] Scene image seeding complete",
        extra={"converted": converted, "skipped": skipped, "total": len(_SCENE_IMAGE_IDS)},
    )
