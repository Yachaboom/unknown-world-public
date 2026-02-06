"""서버와 동일한 방식으로 실행하여 문제를 재현합니다.
main.py의 .env 로딩 → pipeline context → validate_real → repair_loop 전체 경로."""
import asyncio
import json
import sys
import os

# 1) main.py와 동일한 방식으로 .env 로드
from pathlib import Path
from dotenv import load_dotenv

_DOTENV_PATH = Path(__file__).resolve().parent / ".env"
_dotenv_loaded = load_dotenv(dotenv_path=_DOTENV_PATH, override=False)
print(f"UW_MODE={os.environ.get('UW_MODE')}", file=sys.stderr)
print(f"GOOGLE_API_KEY set={bool(os.environ.get('GOOGLE_API_KEY'))}", file=sys.stderr)

# 2) 서버와 동일한 import 경로
from unknown_world.models.turn import TurnInput, Language
from unknown_world.orchestrator.pipeline import create_pipeline_context, run_pipeline
from unknown_world.orchestrator.stages.types import PipelineEvent, PipelineEventType


async def main():
    turn_input = TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client={"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        economy_snapshot={"signal": 100, "memory_shard": 5},
    )

    # 3) Pipeline 컨텍스트 생성 (서버와 동일)
    ctx = create_pipeline_context(turn_input)
    print(f"is_mock={ctx.is_mock}", file=sys.stderr)

    # 4) 이벤트 수집
    events = []
    async def emit(event: PipelineEvent):
        events.append(event)
        if event.event_type == PipelineEventType.BADGES:
            badge_vals = [b.value for b in event.badges] if event.badges else []
            print(f"EVENT badges: {badge_vals}", file=sys.stderr)
        elif event.event_type == PipelineEventType.REPAIR:
            print(f"EVENT repair: attempt={event.repair_attempt} msg={event.repair_message}", file=sys.stderr)

    # 5) Pipeline 실행
    ctx = await run_pipeline(ctx, emit=emit)

    # 6) 결과 출력
    print(f"\nis_fallback={ctx.is_fallback}", file=sys.stderr)
    print(f"badges={[b.value for b in ctx.badges]}", file=sys.stderr)
    print(f"repair_attempts={ctx.repair_attempts}", file=sys.stderr)

    if ctx.output:
        print(f"narrative={ctx.output.narrative[:100]}", file=sys.stderr)
        print(f"output_badges={[b.value for b in ctx.output.agent_console.badges]}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
