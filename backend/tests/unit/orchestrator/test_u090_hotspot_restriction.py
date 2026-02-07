"""Unknown World - U-090 핫스팟 생성 제한 단위 테스트."""

from unittest.mock import AsyncMock

import pytest

from unknown_world.models.turn import (
    AgentPhase,
    ClientInfo,
    CurrencyAmount,
    EconomySnapshot,
    Language,
    RenderOutput,
    SceneObject,
    TurnInput,
    TurnOutput,
    UIOutput,
    WorldDelta,
)
from unknown_world.orchestrator.stages.resolve import resolve_stage
from unknown_world.orchestrator.stages.types import PipelineContext
from unknown_world.orchestrator.stages.verify import verify_stage
from unknown_world.services.agentic_vision import Box2D


@pytest.fixture
def mock_emit():
    return AsyncMock()


@pytest.fixture
def base_context():
    """기본 테스트 컨텍스트."""
    economy_snap = EconomySnapshot(signal=100, memory_shard=0)
    turn_input = TurnInput(
        language=Language.KO,
        text="방을 둘러본다",
        action_id="explore",  # 일반 액션
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=economy_snap,
    )
    # TurnOutput 생성 (GM이 임의로 핫스팟을 생성했다고 가정)
    output = TurnOutput(
        language=Language.KO,
        narrative="방에 낡은 상자가 있습니다.",
        ui=UIOutput(
            objects=[
                SceneObject(
                    id="hallucinated_box",
                    label="환각 상자",
                    box_2d=Box2D(ymin=100, xmin=100, ymax=200, xmax=200),
                )
            ]
        ),
        render=RenderOutput(image_url="/static/test.png"),
        world=WorldDelta(),
        economy={
            "cost": {"signal": 5, "memory_shard": 0},
            "balance_after": {"signal": 95, "memory_shard": 0},
        },
        safety={"blocked": False},
    )
    return PipelineContext(
        turn_input=turn_input,
        economy_snapshot=CurrencyAmount(
            signal=economy_snap.signal, memory_shard=economy_snap.memory_shard
        ),
        output=output,
        current_phase=AgentPhase.VALIDATE,
    )


@pytest.mark.asyncio
async def test_resolve_stage_strips_hotspots_on_normal_turn(base_context, mock_emit):
    """일반 턴에서 GM이 생성한 핫스팟이 resolve_stage에서 제거되는지 확인."""
    # Given: action_id = "explore" (일반 턴), objects에 1개 존재
    assert len(base_context.output.ui.objects) == 1

    # When: resolve_stage 실행
    updated_ctx = await resolve_stage(base_context, emit=mock_emit)

    # Then: objects가 빈 배열이어야 함
    assert len(updated_ctx.output.ui.objects) == 0


@pytest.mark.asyncio
async def test_verify_stage_strips_hotspots_on_normal_turn(base_context, mock_emit):
    """일반 턴에서 핫스팟이 verify_stage에서 이중으로 제거되는지 확인."""
    # Given: action_id = "explore" (일반 턴), objects에 1개 존재
    assert len(base_context.output.ui.objects) == 1

    # When: verify_stage 실행
    updated_ctx = await verify_stage(base_context, emit=mock_emit)

    # Then: objects가 빈 배열이어야 함
    assert len(updated_ctx.output.ui.objects) == 0


@pytest.mark.asyncio
async def test_resolve_stage_keeps_objects_empty_on_normal_turn(base_context, mock_emit):
    """일반 턴에서 원래 비어있던 objects가 유지되는지 확인."""
    # Given: objects가 이미 비어있음
    base_context.output.ui.objects = []

    # When: resolve_stage 실행
    updated_ctx = await resolve_stage(base_context, emit=mock_emit)

    # Then: 여전히 비어있어야 함
    assert len(updated_ctx.output.ui.objects) == 0
