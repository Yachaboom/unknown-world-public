"""Debug script: real 모드에서 Gemini 응답을 확인합니다."""

import asyncio
import json
import os
import sys

# .env 로드
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)

# UW_MODE=real 강제
os.environ["UW_MODE"] = "real"

from unknown_world.models.turn import TurnInput, TurnOutput, Language
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator
from unknown_world.services.genai_client import get_genai_client, reset_genai_client
from pydantic import ValidationError


async def main():
    # 클라이언트 초기화 확인
    reset_genai_client()
    client = get_genai_client()
    print(f"Client mode: {client.mode}")
    print(f"Client available: {client.is_available()}")
    print(f"GOOGLE_API_KEY set: {bool(os.environ.get('GOOGLE_API_KEY'))}")
    print()

    # TurnInput 생성
    turn_input = TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client={"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        economy_snapshot={"signal": 100, "memory_shard": 5},
    )

    # TurnOutputGenerator로 생성
    generator = TurnOutputGenerator(force_mock=False)
    result = await generator.generate(turn_input)

    print(f"Status: {result.status}")
    print(f"Model: {result.model_label}")
    print(f"Error: {result.error_message}")
    print(f"Error details: {json.dumps(result.error_details, indent=2, ensure_ascii=False)}")
    print()

    if result.raw_response:
        print("=== RAW RESPONSE (first 3000 chars) ===")
        print(result.raw_response[:3000])
        print()

        # 직접 파싱 시도
        try:
            text = result.raw_response.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip() == "```":
                    lines = lines[:-1]
                text = "\n".join(lines)

            data = json.loads(text)
            print("=== JSON PARSED OK ===")
            print(f"Top-level keys: {list(data.keys())}")
            print()

            # Pydantic 검증 시도
            try:
                output = TurnOutput.model_validate(data)
                print("=== PYDANTIC VALIDATION OK ===")
            except ValidationError as e:
                print("=== PYDANTIC VALIDATION ERRORS ===")
                for err in e.errors():
                    print(f"  Location: {err['loc']}")
                    print(f"  Type: {err['type']}")
                    print(f"  Message: {err['msg']}")
                    if 'input' in err:
                        inp = str(err['input'])
                        print(f"  Input: {inp[:200]}")
                    print()
        except json.JSONDecodeError as e:
            print(f"=== JSON PARSE FAILED: {e} ===")

    if result.output:
        print("=== OUTPUT ===")
        print(f"Narrative: {result.output.narrative[:200]}")
        print(f"Badges: {result.output.agent_console.badges}")


if __name__ == "__main__":
    asyncio.run(main())
