"""Unknown World - Pipeline 실행기.

Stage 함수들을 체인으로 조합하여 실행하는 파이프라인입니다.

설계 원칙:
    - Option A (RU-005 Q1 결정): 함수 체인 방식, 클래스 도입 없음
    - 동작 보존: 기존 mock/real 경로의 결과(JSON) 의미 유지
    - 관측 가능성 SSOT: stage start/complete/fail, badges, repair를 일관되게 생성
    - 레이어링 보호: 오케스트레이터가 FastAPI에 직접 의존하지 않음
    - U-051: 이미지 생성 서비스 의존성 주입 (Option A: 매개변수 전달, 테스트 용이)

참조:
    - vibe/refactors/RU-005-Q4.md
    - vibe/refactors/RU-005-SUMMARY.md
    - vibe/unit-results/U-019[Mvp].md
"""

from __future__ import annotations

import os
from collections.abc import Sequence
from typing import TYPE_CHECKING

from unknown_world.models.turn import CurrencyAmount, TurnInput
from unknown_world.orchestrator.fallback import create_safe_fallback
from unknown_world.orchestrator.stages.commit import commit_stage
from unknown_world.orchestrator.stages.parse import parse_stage
from unknown_world.orchestrator.stages.plan import plan_stage
from unknown_world.orchestrator.stages.render import render_stage
from unknown_world.orchestrator.stages.resolve import resolve_stage
from unknown_world.orchestrator.stages.types import (
    EmitFn,
    PipelineContext,
    StageFn,
)
from unknown_world.orchestrator.stages.validate import validate_stage
from unknown_world.orchestrator.stages.verify import verify_stage
from unknown_world.services.image_generation import get_image_generator

if TYPE_CHECKING:
    from unknown_world.services.image_generation import ImageGeneratorType

# =============================================================================
# 기본 Stage 순서 (PRD 기준)
# =============================================================================

DEFAULT_STAGES: Sequence[StageFn] = [
    parse_stage,
    validate_stage,
    plan_stage,
    resolve_stage,
    render_stage,
    verify_stage,
    commit_stage,
]
"""기본 파이프라인 단계 순서.

Parse → Validate → Plan → Resolve → Render → Verify → Commit
"""


# =============================================================================
# Pipeline 실행 함수
# =============================================================================


def _is_mock_mode() -> bool:
    """Mock 모드 여부를 확인합니다.

    UW_MODE 환경변수가 'mock'이면 Mock 모드로 동작합니다.
    기본값은 'mock'입니다 (MVP 단계).
    """
    return os.environ.get("UW_MODE", "mock").lower() == "mock"


def create_pipeline_context(
    turn_input: TurnInput,
    *,
    seed: int | None = None,
    is_mock: bool | None = None,
    image_generator: ImageGeneratorType | None = None,
) -> PipelineContext:
    """파이프라인 컨텍스트를 생성합니다.

    Args:
        turn_input: 사용자 턴 입력
        seed: Mock 모드 시드 (재현성 보장)
        is_mock: Mock 모드 여부 (None이면 환경변수 기준)
        image_generator: 이미지 생성 서비스 인스턴스 (U-051)
            None이면 render_stage에서 이미지 생성을 건너뜁니다 (기존 동작 보존).
            테스트 시 MockImageGenerator를 주입하여 모킹 가능합니다.

    Returns:
        초기화된 파이프라인 컨텍스트

    Example:
        >>> # 기본 사용 (이미지 생성 없음)
        >>> ctx = create_pipeline_context(turn_input)
        >>>
        >>> # 이미지 생성 서비스 주입
        >>> from unknown_world.services.image_generation import get_image_generator
        >>> generator = get_image_generator()
        >>> ctx = create_pipeline_context(turn_input, image_generator=generator)
        >>>
        >>> # 테스트용 Mock 주입
        >>> from unknown_world.services.image_generation import MockImageGenerator
        >>> mock_gen = MockImageGenerator()
        >>> ctx = create_pipeline_context(turn_input, image_generator=mock_gen)
    """
    economy_snapshot = CurrencyAmount(
        signal=turn_input.economy_snapshot.signal,
        memory_shard=turn_input.economy_snapshot.memory_shard,
    )

    is_mock = is_mock if is_mock is not None else _is_mock_mode()

    # 이미지 생성기 자동 획득 (U-051)
    if image_generator is None:
        image_generator = get_image_generator(force_mock=is_mock)

    return PipelineContext(
        turn_input=turn_input,
        economy_snapshot=economy_snapshot,
        is_mock=is_mock,
        seed=seed,
        image_generator=image_generator,
    )


async def run_pipeline(
    ctx: PipelineContext,
    *,
    emit: EmitFn,
    stages: Sequence[StageFn] | None = None,
) -> PipelineContext:
    """파이프라인을 실행합니다.

    Stage 함수들을 순서대로 실행하고, 각 단계에서 emit 콜백을 통해
    도메인 이벤트를 전달합니다.

    예외가 발생하면 안전한 폴백으로 종료합니다 (RULE-004).

    Args:
        ctx: 파이프라인 컨텍스트
        emit: 이벤트 emit 콜백
        stages: 실행할 stage 목록 (None이면 기본 순서)

    Returns:
        최종 파이프라인 컨텍스트

    Example:
        >>> ctx = create_pipeline_context(turn_input, seed=42)
        >>> ctx = await run_pipeline(ctx, emit=my_emit_fn)
        >>> print(ctx.output.narrative)
    """
    if stages is None:
        stages = DEFAULT_STAGES

    try:
        for stage in stages:
            ctx = await stage(ctx, emit=emit)

            # output이 None이면 validate 실패 등 → 이후 단계는 스킵
            # (단, parse 단계는 output이 없어도 정상)
            if ctx.output is None and stage != parse_stage:
                # 폴백 생성
                ctx.output = create_safe_fallback(
                    language=ctx.turn_input.language,
                    economy_snapshot=ctx.economy_snapshot,
                    repair_count=ctx.repair_attempts,
                )
                ctx.is_fallback = True
                break

    except Exception:
        # 예외 발생 시 안전한 폴백 (RULE-004)
        ctx.output = create_safe_fallback(
            language=ctx.turn_input.language,
            economy_snapshot=ctx.economy_snapshot,
            repair_count=ctx.repair_attempts,
        )
        ctx.is_fallback = True

    return ctx
