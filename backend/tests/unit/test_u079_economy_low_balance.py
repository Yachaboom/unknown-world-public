"""U-079[Mvp]: 재화 부족 시 이미지 생성 허용 및 필드 검증 테스트."""

import pytest

from unknown_world.models.turn import (
    AgentConsole,
    AgentPhase,
    ClientInfo,
    CurrencyAmount,
    EconomyOutput,
    EconomySnapshot,
    ImageJob,
    Language,
    RenderOutput,
    SafetyOutput,
    TurnInput,
    TurnOutput,
)
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.types import PipelineContext
from unknown_world.services.image_generation import MockImageGenerator

# =============================================================================
# 필드 추가 검증 (Red Phase)
# =============================================================================


def test_economy_output_has_u079_fields():
    """EconomyOutput에 credit과 low_balance_warning 필드가 있는지 확인."""
    data = {
        "cost": {"signal": 10, "memory_shard": 0},
        "balance_after": {"signal": 0, "memory_shard": 5},
        "credit": 5,
        "low_balance_warning": True,
    }
    # 이 테스트는 모델 수정 전에는 실패해야 함 (extra="forbid" 때문이거나 필드 누락)
    economy = EconomyOutput(**data)
    assert economy.credit == 5
    assert economy.low_balance_warning is True


# =============================================================================
# Render Stage FAST 폴백 비용 업데이트 검증
# =============================================================================


@pytest.mark.asyncio
async def test_render_stage_updates_cost_on_low_balance():
    """잔액 부족으로 FAST 폴백 시 TurnOutput의 비용이 0으로 업데이트되는지 확인."""
    # 1. Given: 잔액 부족 상황 (Signal 5, 필요 10)
    economy_snapshot = CurrencyAmount(signal=5, memory_shard=0)

    turn_input = TurnInput(
        language=Language.KO,
        text="방을 조사한다",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=5, memory_shard=0),
    )

    # AI가 이미지 생성을 원한다고 가정 (QUALITY 모델, 비용 10)
    original_economy = EconomyOutput(
        cost=CurrencyAmount(signal=10, memory_shard=0),
        balance_after=CurrencyAmount(signal=0, memory_shard=0),  # LLM은 대충 0으로 줄 수 있음
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="무언가 보입니다.",
        economy=original_economy,
        safety=SafetyOutput(blocked=False),
        render=RenderOutput(
            image_job=ImageJob(should_generate=True, prompt="A dark room", model_label="QUALITY")
        ),
        agent_console=AgentConsole(current_phase=AgentPhase.RENDER),
    )

    ctx = PipelineContext(
        turn_input=turn_input,
        economy_snapshot=economy_snapshot,
        is_mock=True,
        output=turn_output,
        image_generator=MockImageGenerator(),
    )

    # 2. When: render_stage 실행
    async def mock_emit(event):
        pass

    updated_ctx = await render_stage(ctx, emit=mock_emit)

    # 3. Then: 비용이 FAST_IMAGE_COST_SIGNAL(0)로 업데이트되었는지 확인
    # (이 로직은 아직 구현되지 않았으므로 실패해야 함)
    assert updated_ctx.output.economy.cost.signal == 0
    # balance_after도 스냅샷 유지 (5 - 0 = 5)
    assert updated_ctx.output.economy.balance_after.signal == 5
    # low_balance_warning이 설정되었는지 확인
    assert updated_ctx.output.economy.low_balance_warning is True


# =============================================================================
# 크레딧(빚) 시스템 검증
# =============================================================================


def test_economy_validation_allows_credit():
    """잔액보다 큰 비용 지불 시 크레딧이 올바르게 검증되는지 확인."""
    from unknown_world.validation.business_rules import validate_business_rules

    # 1. Given: 잔액 5, 비용 10 (크레딧 5 필요)
    turn_input = TurnInput(
        language=Language.KO,
        text="테스트",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=5, memory_shard=0),
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="결과",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=10, memory_shard=0),
            balance_after=CurrencyAmount(signal=0, memory_shard=0),
            credit=5,  # 빚 5
            low_balance_warning=True,
        ),
        safety=SafetyOutput(blocked=False),
    )

    # 2. When: 비즈니스 룰 검증
    result = validate_business_rules(turn_input, turn_output)

    # 3. Then: 검증 통과
    assert result.is_valid is True
    assert not result.errors


def test_economy_validation_fails_on_excessive_credit():
    """MAX_CREDIT(50)을 초과하는 비용은 거부되어야 함."""
    from unknown_world.validation.business_rules import validate_business_rules

    # 1. Given: 잔액 5, 비용 60 (크레딧 55 필요, 한도 50 초과)
    turn_input = TurnInput(
        language=Language.KO,
        text="테스트",
        client=ClientInfo(viewport_w=1920, viewport_h=1080),
        economy_snapshot=EconomySnapshot(signal=5, memory_shard=0),
    )

    turn_output = TurnOutput(
        language=Language.KO,
        narrative="결과",
        economy=EconomyOutput(
            cost=CurrencyAmount(signal=60, memory_shard=0),
            balance_after=CurrencyAmount(signal=0, memory_shard=0),
            credit=55,
            low_balance_warning=True,
        ),
        safety=SafetyOutput(blocked=False),
    )

    # 2. When: 비즈니스 룰 검증
    result = validate_business_rules(turn_input, turn_output)

    # 3. Then: 검증 실패
    assert result.is_valid is False
    assert any("economy_negative_balance" in err["type"] for err in result.errors)
