"""Unknown World - Agentic Vision 서비스 단위 테스트 (U-076[Mvp])."""

from unknown_world.models.turn import Box2D, Language
from unknown_world.services.agentic_vision import (
    _normalize_bbox,
    _parse_vision_response,
    affordances_to_scene_objects,
)


def test_normalize_bbox_valid():
    """정상적인 bbox 데이터 정규화 테스트."""
    raw = {"ymin": 100, "xmin": 200, "ymax": 300, "xmax": 400}
    bbox = _normalize_bbox(raw)
    assert bbox is not None
    assert bbox.ymin == 100
    assert bbox.xmin == 200
    assert bbox.ymax == 300
    assert bbox.xmax == 400


def test_normalize_bbox_out_of_range():
    """범위를 벗어난 bbox 데이터 클램핑 테스트 (RULE-009)."""
    raw = {"ymin": -10, "xmin": 500, "ymax": 1100, "xmax": 2000}
    bbox = _normalize_bbox(raw)
    assert bbox is not None
    assert bbox.ymin == 0
    assert bbox.xmin == 500
    assert bbox.ymax == 1000
    assert bbox.xmax == 1000


def test_normalize_bbox_invalid_order():
    """ymin >= ymax 같은 잘못된 순서 자동 교정 테스트."""
    raw = {"ymin": 500, "xmin": 200, "ymax": 400, "xmax": 300}
    bbox = _normalize_bbox(raw)
    assert bbox is not None
    assert bbox.ymin == 500
    assert bbox.ymax > 500
    assert bbox.xmin == 200
    assert bbox.xmax > 200


def test_parse_vision_response_success():
    """정상적인 JSON 응답 파싱 테스트."""
    response_text = """
    ```json
    {
      "affordances": [
        {
          "label": "테스트 오브젝트",
          "box_2d": {"ymin": 10, "xmin": 20, "ymax": 100, "xmax": 200},
          "interaction_hint": "클릭하세요"
        }
      ]
    }
    ```
    """
    result = _parse_vision_response(response_text, Language.KO)
    assert result.success is True
    assert len(result.affordances) == 1
    assert result.affordances[0].label == "테스트 오브젝트"
    assert result.affordances[0].box_2d.ymin == 10
    assert result.affordances[0].interaction_hint == "클릭하세요"


def test_parse_vision_response_failure():
    """잘못된 JSON 응답 파싱 실패 및 폴백 테스트 (RULE-004)."""
    response_text = "이것은 JSON이 아닙니다."
    result = _parse_vision_response(response_text, Language.KO)
    assert result.success is False
    assert len(result.affordances) == 0


def test_affordances_to_scene_objects():
    """Affordance -> SceneObject 변환 테스트."""
    from unknown_world.services.agentic_vision import Affordance

    affs = [
        Affordance(label="Obj1", box_2d=Box2D(ymin=0, xmin=0, ymax=100, xmax=100)),
        Affordance(label="Obj2", box_2d=Box2D(ymin=200, xmin=200, ymax=300, xmax=300)),
    ]
    objs = affordances_to_scene_objects(affs, id_prefix="test")

    assert len(objs) == 2
    assert objs[0].id == "test_0"
    assert objs[0].label == "Obj1"
    assert objs[1].id == "test_1"
    assert objs[1].label == "Obj2"
