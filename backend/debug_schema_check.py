"""Debug: 서버에 캐시된 제너레이터와 직접 생성한 것을 비교합니다."""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=False)
os.environ["UW_MODE"] = "real"

from pydantic import ValidationError

from unknown_world.models.turn import Language, TurnInput, TurnOutput
from unknown_world.orchestrator.generate_turn_output import (
    TurnOutputGenerator,
    _strip_additional_properties,
)
from unknown_world.services.genai_client import (
    reset_genai_client,
)


async def main():
    print("=== 1. Schema comparison ===")
    raw_schema = TurnOutput.model_json_schema()
    stripped = _strip_additional_properties(raw_schema)

    # Check $defs
    if "$defs" in stripped:
        print(f"Schema has $defs with {len(stripped['$defs'])} definitions")
        for name in stripped["$defs"]:
            print(f"  - {name}")
    else:
        print("Schema has NO $defs")

    print(f"Top-level keys: {list(stripped.keys())}")
    print(f"Required: {stripped.get('required', [])}")
    print()

    print("=== 2. Multiple API calls ===")
    reset_genai_client()
    generator = TurnOutputGenerator(force_mock=False)

    turn_input = TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client={"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        economy_snapshot={"signal": 100, "memory_shard": 5},
    )

    success_count = 0
    fail_count = 0
    for i in range(3):
        print(f"\n--- Attempt {i + 1} ---")
        result = await generator.generate(turn_input)
        print(f"Status: {result.status}")

        if result.status.value == "success":
            success_count += 1
            print("OK")
        else:
            fail_count += 1
            print(f"Error: {result.error_message}")
            print(f"Details: {json.dumps(result.error_details, indent=2, ensure_ascii=False)}")

            if result.raw_response:
                # Try to parse and identify what's wrong
                text = result.raw_response.strip()
                if text.startswith("```"):
                    lines = text.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    text = "\n".join(lines)

                try:
                    data = json.loads(text)
                    print(f"JSON keys: {list(data.keys())}")

                    # Check each sub-model for extra fields
                    for key in data:
                        val = data[key]
                        if isinstance(val, dict):
                            # Check if any sub-dict has unexpected keys
                            pass

                    # Try validation manually
                    try:
                        TurnOutput.model_validate(data)
                        print("Pydantic OK (inconsistent!)")
                    except ValidationError as e:
                        print(f"Pydantic errors ({len(e.errors())}):")
                        for err in e.errors():
                            print(f"  loc={err['loc']} type={err['type']} msg={err['msg']}")
                            if "input" in err:
                                inp_str = str(err["input"])[:200]
                                print(f"  input={inp_str}")
                except json.JSONDecodeError:
                    print(f"Raw (first 500): {result.raw_response[:500]}")

    print(f"\n=== Summary: {success_count} success, {fail_count} fail ===")


if __name__ == "__main__":
    asyncio.run(main())
