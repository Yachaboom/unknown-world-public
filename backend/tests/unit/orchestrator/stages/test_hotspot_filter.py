"""Unknown World - Hotspot Filter 단위 테스트 (U-115[Mvp])."""

from unknown_world.models.turn import Box2D, SceneObject
from unknown_world.orchestrator.stages.resolve import filter_hotspots


def create_obj(id: str, ymin: int, xmin: int, ymax: int, xmax: int) -> SceneObject:
    """테스트용 SceneObject를 생성합니다."""
    return SceneObject(
        id=id,
        label=id,
        box_2d=Box2D(ymin=ymin, xmin=xmin, ymax=ymax, xmax=xmax),
        interaction_hint=None,
    )


def test_filter_hotspots_limit():
    """최대 개수(3개) 제한 테스트."""
    objects = [
        create_obj("obj1", 0, 0, 100, 100),
        create_obj("obj2", 200, 200, 300, 300),
        create_obj("obj3", 400, 400, 500, 500),
        create_obj("obj4", 600, 600, 700, 700),
        create_obj("obj5", 800, 800, 900, 900),
    ]

    filtered = filter_hotspots(objects, max_count=3)

    assert len(filtered) == 3
    # 면적 기준이 동일하므로 순서대로 3개가 선택됨 (obj1, obj2, obj3)
    assert filtered[0].id == "obj1"
    assert filtered[1].id == "obj2"
    assert filtered[2].id == "obj3"


def test_filter_hotspots_priority_by_area():
    """면적 기준 우선순위 테스트."""
    objects = [
        create_obj("small", 0, 0, 50, 50),  # 면적: 2,500
        create_obj("large", 100, 100, 300, 300),  # 면적: 40,000
        create_obj("medium", 400, 400, 550, 550),  # 면적: 22,500
    ]

    filtered = filter_hotspots(objects)

    assert len(filtered) == 3
    assert filtered[0].id == "large"
    assert filtered[1].id == "medium"
    assert filtered[2].id == "small"


def test_filter_hotspots_overlap_removal():
    """겹침 제거 테스트 (중심 거리 임계값 150 미만)."""
    objects = [
        # 중심 (50, 50)
        create_obj("base", 0, 0, 100, 100),
        # 중심 (100, 100), base와의 거리: sqrt(50^2 + 50^2) = 70.7 < 150 -> 필터링되어야 함
        create_obj("near", 50, 50, 150, 150),
        # 중심 (300, 300), base와의 거리: sqrt(250^2 + 250^2) = 353.5 > 150 -> 유지되어야 함
        create_obj("far", 250, 250, 350, 350),
    ]

    # 우선순위 확인을 위해 base를 더 크게 만듦
    objects[0].box_2d = Box2D(ymin=0, xmin=0, ymax=200, xmax=200)  # 면적 40,000
    # near는 두 번째로 크게
    objects[1].box_2d = Box2D(ymin=50, xmin=50, ymax=150, xmax=150)  # 면적 10,000
    # far는 가장 작게
    objects[2].box_2d = Box2D(ymin=250, xmin=250, ymax=300, xmax=300)  # 면적 2,500

    # distance(base, near) = dist((100,100), (100,100)) = 0 < 150
    # distance(base, far) = dist((100,100), (275,275)) = sqrt(175^2 + 175^2) = 247 > 150

    filtered = filter_hotspots(objects, min_distance=150)

    assert len(filtered) == 2
    assert filtered[0].id == "base"
    assert filtered[1].id == "far"
    assert "near" not in [obj.id for obj in filtered]


def test_filter_hotspots_empty():
    """빈 입력 처리 테스트."""
    assert filter_hotspots([]) == []
    assert filter_hotspots(None) == []  # type: ignore


def test_filter_hotspots_large_objects_overlap():
    """큰 오브젝트들이 겹칠 때 우선순위가 높은 것만 남는지 테스트."""
    objects = [
        create_obj("very_large", 0, 0, 500, 500),  # 면적 250,000, 중심 (250, 250)
        create_obj("large_overlap", 100, 100, 400, 400),  # 면적 90,000, 중심 (250, 250)
    ]

    filtered = filter_hotspots(objects)

    assert len(filtered) == 1
    assert filtered[0].id == "very_large"
