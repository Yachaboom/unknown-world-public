import json
from pathlib import Path

# 프로젝트 루트 경로 설정 (backend/tests/unit/ 위치 기준)
ROOT_DIR = Path(__file__).parent.parent.parent.parent
SCHEMA_PATH = ROOT_DIR / "vibe/ref/nanobanana-asset-request.schema.json"
GUIDE_PATH = ROOT_DIR / "vibe/ref/nanobanana-mcp.md"

def test_schema_file_exists():
    """스키마 파일이 지정된 위치에 존재하는지 확인"""
    assert SCHEMA_PATH.exists(), f"Schema file not found at {SCHEMA_PATH}"

def test_schema_is_valid_json():
    """스키마 파일이 유효한 JSON 형식인지 확인"""
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)
    assert schema["title"] == "nanobanana mcp Asset Request Schema"

def test_schema_required_properties():
    """계획서에 명시된 필수 필드가 스키마에 정의되어 있는지 확인"""
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    properties = schema.get("properties", {})
    required_fields = ["id", "category", "purpose", "size_px", "requires_rembg", "rembg_model"]

    for field in required_fields:
        assert field in properties, f"Required field '{field}' missing in schema properties"

def test_guide_file_exists():
    """가이드 문서 파일이 존재하는지 확인"""
    assert GUIDE_PATH.exists(), f"Guide file not found at {GUIDE_PATH}"

def test_guide_content_completeness():
    """가이드 문서에 필수 섹션(아트 디렉션, 카테고리별 템플릿)이 포함되어 있는지 확인"""
    with open(GUIDE_PATH, encoding="utf-8") as f:
        content = f.read()

    # 계획서 구현 흐름 2단계, 3단계 관련 키워드 검사
    required_keywords = [
        "아트 디렉션",
        "스타일",
        "아이콘",
        "placeholder",
        "chrome",
        "템플릿"
    ]

    missing_keywords = [kw for kw in required_keywords if kw.lower() not in content.lower()]

    # 현재 nanobanana-mcp.md에는 rembg 내용만 있으므로 실패할 가능성이 큼
    assert not missing_keywords, f"Guide document is missing sections for: {', '.join(missing_keywords)}"

def test_schema_rembg_rules():
    """배경 제거(rembg) 관련 강제 규칙(순백 배경)이 스키마/설명에 포함되어 있는지 확인"""
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    # background 필드와 requires_rembg 필드 설명 확인
    background_desc = schema["properties"]["background"].get("description", "")
    rembg_desc = schema["properties"]["requires_rembg"].get("description", "")

    assert "solid_white" in str(schema["properties"]["background"].get("enum", [])), "background enum should include solid_white"
    assert "rembg" in background_desc.lower(), "background description should mention rembg"
    assert "solid_white" in rembg_desc.lower(), "requires_rembg description should recommend solid_white"
