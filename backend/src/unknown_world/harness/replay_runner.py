"""Unknown World - 리플레이 실행 엔진.

저장된 시나리오를 입력으로 받아 자동 재생하고,
각 턴의 Hard Gate(Schema/Economy/Safety/Consistency) 결과를 수집합니다.

설계 원칙:
    - 시나리오의 각 스텝을 순차적으로 실행
    - 서버 내부에서 pipeline을 직접 호출 (HTTP 오버헤드 제거)
    - 각 턴마다 4대 Hard Gate 검증 결과를 수집
    - 실패 시 diff/context 포함

참조:
    - vibe/unit-plans/U-025[Mvp].md
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import BaseModel

from unknown_world.harness.scenario import (
    GateResult,
    GateStatus,
    Scenario,
    StepResult,
)
from unknown_world.models.turn import CurrencyAmount, Language

logger = logging.getLogger(__name__)


class ReplayResult(BaseModel):
    """리플레이 전체 실행 결과."""

    scenario_name: str
    total_steps: int
    passed_steps: int
    failed_steps: int
    step_results: list[StepResult] = []
    summary: str = ""


def load_scenario(path: str | Path) -> Scenario:
    """JSON 파일에서 시나리오를 로드합니다.

    Args:
        path: 시나리오 JSON 파일 경로

    Returns:
        Scenario: 파싱된 시나리오 객체
    """
    path = Path(path)
    logger.info("[ReplayRunner] Loading scenario from %s", path)
    data = json.loads(path.read_text(encoding="utf-8"))
    return Scenario.model_validate(data)


def save_scenario(scenario: Scenario, path: str | Path) -> None:
    """시나리오를 JSON 파일로 저장합니다.

    Args:
        scenario: 저장할 시나리오 객체
        path: 출력 JSON 파일 경로
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        scenario.model_dump_json(indent=2),
        encoding="utf-8",
    )
    logger.info("[ReplayRunner] Scenario saved to %s", path)


async def run_replay(scenario: Scenario) -> ReplayResult:
    """시나리오를 리플레이합니다.

    각 스텝을 순차적으로 실행하고 Hard Gate 결과를 수집합니다.
    MVP에서는 Mock 모드의 pipeline을 직접 호출합니다.

    Args:
        scenario: 실행할 시나리오

    Returns:
        ReplayResult: 리플레이 전체 결과
    """
    logger.info(
        "[ReplayRunner] Starting replay: name=%s, steps=%d, seed=%d",
        scenario.name,
        len(scenario.steps),
        scenario.seed,
    )

    step_results: list[StepResult] = []
    # 경제 상태 추적 (누적)
    current_balance = CurrencyAmount(signal=100, memory_shard=5)

    for idx, step in enumerate(scenario.steps):
        logger.info(
            "[ReplayRunner] Step %d/%d: %s",
            idx + 1,
            len(scenario.steps),
            step.text[:50],
        )

        result = await _execute_step(
            idx=idx,
            step_text=step.text,
            action_id=step.action_id,
            language=scenario.language,
            seed=scenario.seed + idx,
            economy_snapshot=current_balance,
        )

        step_results.append(result)

        # 경제 상태 업데이트 (성공한 경우에만)
        if result.all_passed:
            # Mock 모드에서는 비용이 적용됨 - 다음 스텝에 반영
            pass  # current_balance는 pipeline 결과에서 갱신

    passed = sum(1 for r in step_results if r.all_passed)
    failed = len(step_results) - passed

    summary = f"Replay '{scenario.name}': {passed}/{len(step_results)} steps passed"
    if failed > 0:
        summary += f" ({failed} failed)"

    logger.info("[ReplayRunner] %s", summary)

    return ReplayResult(
        scenario_name=scenario.name,
        total_steps=len(step_results),
        passed_steps=passed,
        failed_steps=failed,
        step_results=step_results,
        summary=summary,
    )


async def _execute_step(
    idx: int,
    step_text: str,
    action_id: str | None,
    language: Language,
    seed: int,
    economy_snapshot: CurrencyAmount,
) -> StepResult:
    """단일 스텝을 실행하고 Hard Gate를 검증합니다.

    MVP에서는 Mock pipeline을 사용하여 검증합니다.
    """
    gates: list[GateResult] = []
    narrative_preview = ""
    error_msg: str | None = None

    try:
        # Pipeline import (lazy to avoid circular)
        from unknown_world.models.turn import (
            ClientInfo,
            EconomySnapshot,
            TurnInput,
        )
        from unknown_world.orchestrator.pipeline import (
            create_pipeline_context,
            run_pipeline,
        )
        from unknown_world.orchestrator.stages.types import PipelineEvent

        # TurnInput 빌드
        turn_input = TurnInput(
            language=language,
            text=step_text,
            action_id=action_id,
            client=ClientInfo(viewport_w=1920, viewport_h=1080),
            economy_snapshot=EconomySnapshot(
                signal=economy_snapshot.signal,
                memory_shard=economy_snapshot.memory_shard,
            ),
        )

        # Pipeline 실행
        ctx = create_pipeline_context(
            turn_input=turn_input,
            seed=seed,
            is_mock=True,
        )

        # 더미 emit 함수 (리플레이 결과 수집용)
        async def dummy_emit(_event: PipelineEvent) -> None:
            pass

        ctx = await run_pipeline(ctx, emit=dummy_emit)

        if ctx.output is None:
            error_msg = "Pipeline returned no output"
            gates = _all_gates_fail("No output from pipeline")
        else:
            output = ctx.output
            narrative_preview = output.narrative[:100] if output.narrative else ""

            # Schema Gate: pipeline이 성공적으로 TurnOutput을 반환했으면 OK
            gates.append(GateResult(name="schema", status=GateStatus.PASS))

            # Economy Gate: 잔액 음수 검사
            if output.economy.balance_after.signal < 0:
                gates.append(
                    GateResult(
                        name="economy",
                        status=GateStatus.FAIL,
                        detail=f"Negative balance: {output.economy.balance_after.signal}",
                    )
                )
            else:
                gates.append(GateResult(name="economy", status=GateStatus.PASS))

            # Safety Gate
            if output.safety.blocked:
                gates.append(
                    GateResult(
                        name="safety",
                        status=GateStatus.FAIL,
                        detail="Safety blocked",
                    )
                )
            else:
                gates.append(GateResult(name="safety", status=GateStatus.PASS))

            # Consistency Gate: 언어 일치
            if output.language != language:
                gates.append(
                    GateResult(
                        name="consistency",
                        status=GateStatus.FAIL,
                        detail=f"Language mismatch: expected {language.value}, got {output.language.value}",
                    )
                )
            else:
                gates.append(GateResult(name="consistency", status=GateStatus.PASS))

    except Exception as exc:
        error_msg = str(exc)
        logger.warning("[ReplayRunner] Step %d failed: %s", idx, error_msg)
        gates = _all_gates_fail(error_msg)

    all_passed = all(g.status == GateStatus.PASS for g in gates)

    return StepResult(
        step_index=idx,
        text=step_text,
        gates=gates,
        all_passed=all_passed,
        narrative_preview=narrative_preview,
        error=error_msg,
    )


def _all_gates_fail(detail: str) -> list[GateResult]:
    """모든 게이트를 실패로 생성합니다."""
    return [
        GateResult(name="schema", status=GateStatus.FAIL, detail=detail),
        GateResult(name="economy", status=GateStatus.FAIL, detail=detail),
        GateResult(name="safety", status=GateStatus.FAIL, detail=detail),
        GateResult(name="consistency", status=GateStatus.FAIL, detail=detail),
    ]
