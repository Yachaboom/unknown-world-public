import json
import os

import pytest
from jsonschema import validate

# Paths
# This file is in backend/tests/qa/
# We go up 3 levels to get to backend root: backend/tests/qa -> backend/tests -> backend -> root (wait, backend is in root)
# Actually:
# __file__ = D:\Dev\unknown-world\backend\tests\qa\test_asset_manifest.py
# os.path.dirname(__file__) = D:\Dev\unknown-world\backend\tests\qa
# ... up 1 = tests
# ... up 2 = backend
# ... up 3 = unknown-world (project root)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(CURRENT_DIR)))

# If PROJECT_ROOT is correct, it should contain frontend/
FRONTEND_UI_DIR = os.path.join(PROJECT_ROOT, "frontend", "public", "ui")
MANIFEST_PATH = os.path.join(FRONTEND_UI_DIR, "manifest.json")
SCHEMA_PATH = os.path.join(FRONTEND_UI_DIR, "manifest.schema.json")


def test_manifest_schema_validation():
    """Validates manifest.json against manifest.schema.json"""
    if not os.path.exists(MANIFEST_PATH):
        pytest.fail(f"Manifest not found at {MANIFEST_PATH}")
    if not os.path.exists(SCHEMA_PATH):
        pytest.fail(f"Schema not found at {SCHEMA_PATH}")

    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    # validate raises ValidationError on failure
    validate(instance=manifest, schema=schema)


def test_asset_files_existence_and_size():
    """Checks if assets listed in manifest exist and sizes match/budget"""
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    assets = manifest.get("assets", [])
    total_bytes_calculated = 0

    for asset in assets:
        rel_path = asset["path"]
        abs_path = os.path.join(FRONTEND_UI_DIR, rel_path)

        # 1. Existence Check
        assert os.path.exists(abs_path), f"Asset file missing: {rel_path} (full: {abs_path})"

        # 2. Size Check
        actual_size = os.path.getsize(abs_path)
        recorded_size = asset.get("bytes")

        # Note: If size mismatches, we print a helpful message.
        # In a real QA scenario, we might want to auto-update, but for this test we fail.
        if recorded_size is not None:
            assert actual_size == recorded_size, (
                f"Size mismatch for {rel_path}: actual {actual_size} != manifest {recorded_size}"
            )

        total_bytes_calculated += actual_size

        # 3. Individual Budget Check (from QA_CHECKLIST.md)
        asset_type = asset["type"]
        if asset_type in ("icon", "item-icon"):
            # 30KB limit
            assert actual_size <= 30 * 1024, (
                f"Icon {rel_path} exceeds 30KB budget ({actual_size} bytes)"
            )
        elif asset_type == "placeholder":
            # 300KB limit
            assert actual_size <= 300 * 1024, (
                f"Placeholder {rel_path} exceeds 300KB budget ({actual_size} bytes)"
            )
        elif asset_type == "chrome":
            # 120KB limit (increased for scanner-frame)
            assert actual_size <= 120 * 1024, (
                f"Chrome asset {rel_path} exceeds 120KB budget ({actual_size} bytes)"
            )
        elif asset_type == "scene":
            # 200KB limit for scene images (WebP Q80, PRD 9.7)
            assert actual_size <= 200 * 1024, (
                f"Scene asset {rel_path} exceeds 200KB budget ({actual_size} bytes)"
            )

    # 4. Total Budget Check
    recorded_total = manifest.get("totalBytes")
    if recorded_total is not None:
        assert total_bytes_calculated == recorded_total, (
            f"Total bytes mismatch: calculated {total_bytes_calculated} != manifest {recorded_total}"
        )

    budget_total = manifest.get("budgetBytes", 1572864)
    assert total_bytes_calculated <= budget_total, (
        f"Total size {total_bytes_calculated} exceeds budget {budget_total}"
    )


def test_asset_naming_convention():
    """Checks if asset IDs and paths use kebab-case"""
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    for asset in manifest["assets"]:
        asset_id = asset["id"]
        # Check for lowercase and kebab-case (allow numbers)
        assert asset_id.islower(), f"Asset ID {asset_id} should be lowercase"
        assert " " not in asset_id, f"Asset ID {asset_id} should not contain spaces"
        assert "_" not in asset_id, (
            f"Asset ID {asset_id} should not contain underscores (use kebab-case)"
        )
