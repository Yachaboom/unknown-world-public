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
    """스키마의 JSON Schema required 필드가 정의되어 있는지 확인

    NOTE: JSON Schema의 `required` 배열과 "워크플로우 필수(조건부)" 필드는 구분됨.
    - Schema required: ["id", "category", "purpose", "size_px"] (SSOT)
    - Workflow required: requires_rembg, rembg_options.model 등은 조건부 필드
    """
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    properties = schema.get("properties", {})
    # JSON Schema의 required 필드만 검증 (스키마 SSOT 기준)
    schema_required_fields = ["id", "category", "purpose", "size_px"]
    # 워크플로우에서 자주 사용하는 선택적 필드 (properties에 정의되어 있어야 함)
    optional_workflow_fields = ["requires_rembg", "rembg_options"]

    for field in schema_required_fields:
        assert field in properties, f"Schema required field '{field}' missing in properties"

    for field in optional_workflow_fields:
        assert field in properties, f"Workflow field '{field}' missing in properties"


def test_schema_rembg_options_model():
    """rembg 모델 선택의 SSOT가 rembg_options.model인지 확인

    NOTE: 이전에 top-level rembg_model 필드가 논의되었으나,
    SSOT는 rembg_options.model로 확정됨 (U-040 페어링 결정).
    """
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    # rembg_options가 존재하고 model 서브필드가 있어야 함
    rembg_options = schema["properties"].get("rembg_options", {})
    assert rembg_options.get("type") == "object", "rembg_options should be an object"

    rembg_options_props = rembg_options.get("properties", {})
    assert "model" in rembg_options_props, (
        "SSOT field 'rembg_options.model' missing - "
        "rembg 모델 선택은 top-level 'rembg_model'이 아닌 'rembg_options.model'이 SSOT입니다"
    )

    # model 필드의 enum이 유효한 rembg 모델 목록을 포함하는지 확인
    model_field = rembg_options_props["model"]
    assert "enum" in model_field, "rembg_options.model should have enum constraint"
    assert "birefnet-general" in model_field["enum"], (
        "Default model 'birefnet-general' should be in enum"
    )


def test_guide_file_exists():
    """가이드 문서 파일이 존재하는지 확인"""
    assert GUIDE_PATH.exists(), f"Guide file not found at {GUIDE_PATH}"


def test_guide_content_completeness():
    """가이드 문서에 필수 섹션(아트 디렉션, 카테고리별 템플릿)이 포함되어 있는지 확인"""
    with open(GUIDE_PATH, encoding="utf-8") as f:
        content = f.read()

    # 계획서 구현 흐름 2단계, 3단계 관련 키워드 검사
    required_keywords = ["아트 디렉션", "스타일", "아이콘", "placeholder", "chrome", "템플릿"]

    missing_keywords = [kw for kw in required_keywords if kw.lower() not in content.lower()]

    # 현재 nanobanana-mcp.md에는 rembg 내용만 있으므로 실패할 가능성이 큼
    assert not missing_keywords, (
        f"Guide document is missing sections for: {', '.join(missing_keywords)}"
    )


def test_schema_rembg_rules():
    """배경 제거(rembg) 관련 강제 규칙(순백 배경)이 스키마/설명에 포함되어 있는지 확인"""
    with open(SCHEMA_PATH, encoding="utf-8") as f:
        schema = json.load(f)

    # background 필드와 requires_rembg 필드 설명 확인
    background_desc = schema["properties"]["background"].get("description", "")
    rembg_desc = schema["properties"]["requires_rembg"].get("description", "")

    assert "solid_white" in str(schema["properties"]["background"].get("enum", [])), (
        "background enum should include solid_white"
    )
    assert "rembg" in background_desc.lower(), "background description should mention rembg"
    assert "solid_white" in rembg_desc.lower(), (
        "requires_rembg description should recommend solid_white"
    )
