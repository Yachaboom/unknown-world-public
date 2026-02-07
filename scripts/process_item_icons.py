"""
U-092[Mvp]: 아이템 아이콘 일괄 후처리 스크립트.
nanobanana-mcp로 생성된 원본 이미지에 rembg 배경 제거 + ImageMagick 리사이즈를 적용합니다.

Usage:
    python scripts/process_item_icons.py
"""

import subprocess
import sys
from pathlib import Path

# 소스 → 타겟 파일명 매핑
ICON_MAP = {
    # === 초기 아이템 (11개) ===
    "a_minimal_ancient_leatherbound_t.png": "ancient-tome-64.png",
    "a_minimal_feather_quill_pen_icon.png": "quill-pen-64.png",
    "a_minimal_glowing_crystal_memory.png": "memory-fragment-64.png",
    "a_minimal_compass_navigation_too.png": "compass-64.png",
    "a_minimal_coiled_rope_icon_pixel.png": "rope-64.png",
    "a_minimal_glowing_lantern_icon_p.png": "lantern-64.png",
    "a_minimal_torn_map_fragment_piec.png": "map-fragment-64.png",
    "a_minimal_glowing_data_core_sphe.png": "data-core-64.png",
    "a_minimal_green_circuit_board_ic.png": "circuit-board-64.png",
    "a_minimal_energy_cell_battery_ic.png": "energy-cell-64.png",
    "a_minimal_scanner_device_icon_pi.png": "scanner-device-64.png",
    # === 공통 아이템 (15개) ===
    "a_minimal_medieval_sword_icon_pi.png": "sword-64.png",
    "a_minimal_round_shield_icon_pixe.png": "shield-64.png",
    "a_minimal_red_healing_potion_bot.png": "potion-64.png",
    "a_minimal_ornate_golden_key_icon.png": "key-64.png",
    "a_minimal_sparkling_gemstone_ico.png": "gem-64.png",
    "a_minimal_magic_scroll_icon_pixe.png": "scroll-64.png",
    "a_minimal_burning_torch_icon_pix.png": "torch-64.png",
    "a_minimal_green_herb_bundle_icon.png": "herb-64.png",
    "a_minimal_gold_coin_icon_pixel_a.png": "coin-64.png",
    "a_minimal_magic_ring_icon_pixel_.png": "ring-64.png",
    "a_minimal_glowing_amulet_pendant.png": "amulet-64.png",
    "a_minimal_dagger_icon_pixel_art_.png": "dagger-64.png",
    "a_minimal_alchemy_flask_icon_pix.png": "flask-64.png",
    "a_minimal_glowing_crystal_icon_p.png": "crystal-64.png",
    "a_minimal_lockpick_tool_icon_pix.png": "lockpick-64.png",
}

SRC_DIR = Path.home() / "nanobanana-output"
DST_DIR = Path("d:/Dev/unknown-world/frontend/public/ui/items")
TMP_DIR = Path("d:/Dev/unknown-world/frontend/public/ui/items/_tmp")


def run(cmd: list[str], label: str) -> bool:
    """명령어를 실행하고 결과를 반환합니다."""
    print(f"  [{label}] {' '.join(cmd[:3])}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  ❌ 실패: {result.stderr[:200]}")
        return False
    return True


def main() -> None:
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    DST_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    fail = 0

    for src_name, dst_name in ICON_MAP.items():
        src_path = SRC_DIR / src_name
        if not src_path.exists():
            print(f"[WARN] source not found: {src_name}")
            fail += 1
            continue

        print(f"\n[PROCESS] {src_name} -> {dst_name}")

        # Step 1: rembg background removal
        tmp_nobg = TMP_DIR / f"nobg_{dst_name}"
        ok = run(
            ["rembg", "i", "-m", "birefnet-general", str(src_path), str(tmp_nobg)],
            "rembg",
        )
        if not ok:
            print("  [WARN] rembg failed, using original")
            tmp_nobg = src_path

        # Step 2: ImageMagick trim + resize 64x64
        dst_path = DST_DIR / dst_name
        ok = run(
            [
                "magick",
                str(tmp_nobg),
                "-trim",
                "+repage",
                "-resize", "64x64",
                "-gravity", "center",
                "-background", "transparent",
                "-extent", "64x64",
                str(dst_path),
            ],
            "magick",
        )
        if ok:
            size_kb = dst_path.stat().st_size / 1024
            print(f"  [OK] {dst_name} ({size_kb:.1f}KB)")
            success += 1
        else:
            fail += 1

    # cleanup temp dir
    import shutil
    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)

    print(f"\n{'='*50}")
    print(f"[DONE] success={success} fail={fail} total={len(ICON_MAP)}")


if __name__ == "__main__":
    main()
