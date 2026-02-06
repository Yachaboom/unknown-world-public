"""Unknown World - Resolve Stage 정밀분석 통합 테스트 (U-076[Mvp])."""

from unittest.mock import AsyncMock, patch

import pytest

from unknown_world.models.turn import (
    AgentPhase,
    ClientInfo,
    CurrencyAmount,
    EconomySnapshot,
    ImageJob,
    Language,
    RenderOutput,
    TurnInput,
    TurnOutput,
    UIOutput,
    WorldDelta,
)
from unknown_world.orchestrator.stages.resolve import resolve_stage
from unknown_world.orchestrator.stages.types import PipelineContext
from unknown_world.services.agentic_vision import Affordance, Box2D, VisionAnalysisResult


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
        action_id="explore",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=economy_snap,
    )
    # 이미지가 있는 렌더 상태
    render = RenderOutput(
        image_url="/static/test_image.png",
        image_job=ImageJob(prompt="A test scene", should_generate=True),
    )
    # TurnOutput 생성
    output = TurnOutput(
        language=Language.KO,
        narrative="기본 내러티브",
        ui=UIOutput(objects=[]),
        render=render,
        world=WorldDelta(),
        economy={
            "cost": {"signal": 0, "memory_shard": 0},
            "balance_after": {"signal": 100, "memory_shard": 0},
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
async def test_resolve_vision_trigger_success(base_context, mock_emit):
    """정밀분석 트리거 시 비전 서비스 호출 및 결과 반영 테스트."""
    # 트리거 액션으로 변경
    base_context.turn_input.action_id = "deep_analyze"

    # Vision 서비스 Mock
    mock_result = VisionAnalysisResult(
        affordances=[
            Affordance(label="숨겨진 상자", box_2d=Box2D(ymin=100, xmin=100, ymax=200, xmax=200))
        ],
        success=True,
    )

    with patch(
        "unknown_world.services.agentic_vision.AgenticVisionService.analyze_scene",
        new_callable=AsyncMock,
    ) as mock_analyze:
        mock_analyze.return_value = mock_result

        updated_ctx = await resolve_stage(base_context, emit=mock_emit)

        # 1. 비전 서비스 호출 확인
        mock_analyze.assert_called_once_with("/static/test_image.png", Language.KO)

        # 2. 핫스팟 추가 확인
        assert len(updated_ctx.output.ui.objects) == 1
        assert updated_ctx.output.ui.objects[0].label == "숨겨진 상자"

        # 3. 내러티브 보강 확인
        assert "장면을 자세히 살펴봅니다" in updated_ctx.output.narrative
        assert "숨겨진 상자" in updated_ctx.output.narrative

        # 4. 이미지 생성 비활성화 확인
        assert updated_ctx.output.render.image_job.should_generate is False

        # 5. 비용 배수 확인 (1.5x)
        assert updated_ctx.cost_multiplier == 1.5


@pytest.mark.asyncio
async def test_resolve_vision_no_image(base_context, mock_emit):
    """이미지가 없을 때 정밀분석 트리거 시 건너뛰기 테스트."""
    base_context.turn_input.action_id = "deep_analyze"
    base_context.output.render.image_url = None  # 이미지 없음

    with patch(
        "unknown_world.services.agentic_vision.AgenticVisionService.analyze_scene",
        new_callable=AsyncMock,
    ) as mock_analyze:
        updated_ctx = await resolve_stage(base_context, emit=mock_emit)

        # 비전 서비스가 호출되지 않아야 함
        mock_analyze.assert_not_called()
        # 핫스팟이 추가되지 않아야 함
        assert len(updated_ctx.output.ui.objects) == 0


@pytest.mark.asyncio
async def test_resolve_vision_failure_fallback(base_context, mock_emit):
    """비전 분석 실패 시 안전한 폴백 확인 (RULE-004)."""
    base_context.turn_input.action_id = "deep_analyze"

    # 실패 결과 Mock
    mock_result = VisionAnalysisResult(affordances=[], success=False, message="API Error")

    with patch(
        "unknown_world.services.agentic_vision.AgenticVisionService.analyze_scene",
        new_callable=AsyncMock,
    ) as mock_analyze:
        mock_analyze.return_value = mock_result

        updated_ctx = await resolve_stage(base_context, emit=mock_emit)

        # 핫스팟은 추가되지 않음
        assert len(updated_ctx.output.ui.objects) == 0
        # 폴백 내러티브 확인
        assert "자세히 봐도 특별한 것은 보이지 않습니다" in updated_ctx.output.narrative
        # 이미지 생성은 여전히 비활성화 (정밀분석 시도 자체로 인해)
        assert updated_ctx.output.render.image_job.should_generate is False
