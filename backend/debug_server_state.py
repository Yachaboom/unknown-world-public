"""Debug: 서버와 동일한 코드 경로로 문제를 재현합니다."""

import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv

# 서버와 동일하게 .env 로드
_DOTENV_PATH = Path(__file__).resolve().parent / ".env"
_dotenv_loaded = load_dotenv(dotenv_path=_DOTENV_PATH, override=False)
print(f".env path: {_DOTENV_PATH}")
print(f".env exists: {_DOTENV_PATH.exists()}")
print(f".env loaded: {_dotenv_loaded}")
print(f"UW_MODE: {os.environ.get('UW_MODE', 'NOT_SET')}")
print(f"GOOGLE_API_KEY set: {bool(os.environ.get('GOOGLE_API_KEY'))}")
print()

from pydantic import ValidationError

from unknown_world.models.turn import Language, TurnInput, TurnOutput
from unknown_world.orchestrator.generate_turn_output import (
    TurnOutputGenerator,
    _strip_additional_properties,
)


async def main():
    # 1. JSON Schema 검사 - $defs/$ref 확인
    raw_schema = TurnOutput.model_json_schema()
    stripped = _strip_additional_properties(raw_schema)

    has_refs = "$defs" in stripped
    print(f"Schema has $defs: {has_refs}")

    # $ref 참조가 있는지 확인
    schema_str = json.dumps(stripped)
    ref_count = schema_str.count('"$ref"')
    print(f"Schema $ref count: {ref_count}")

    if ref_count > 0:
        print("\n!!! WARNING: Schema has $ref references !!!")
        print("Gemini Structured Outputs may not support $ref/$defs.")
        print("This could cause intermittent failures.")
        print()

    # 2. 서버와 동일한 경로로 호출
    turn_input = TurnInput(
        language=Language.KO,
        text="문을 열어본다",
        client={"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
        economy_snapshot={"signal": 100, "memory_shard": 5},
    )

    generator = TurnOutputGenerator(force_mock=False)

    # 3. 수동으로 Gemini API 직접 호출하여 raw 응답 확인
    from unknown_world.config.models import ModelLabel
    from unknown_world.services.genai_client import (
        GenerateRequest,
        get_genai_client,
        reset_genai_client,
    )

    reset_genai_client()
    client = get_genai_client(force_mock=False)
    print(f"Client type: {type(client).__name__}")
    print(f"Client mode: {client.mode}")
    print(f"Client available: {client.is_available()}")

    if not client.is_available():
        print("ERROR: Client not available!")
        return

    # 4. 프롬프트 빌드
    prompt = generator._build_prompt(turn_input)
    json_schema = generator._get_json_schema()

    print(f"\nPrompt length: {len(prompt)} chars")
    print(f"Schema size: {len(json.dumps(json_schema))} chars")

    # 5. Gemini 직접 호출
    request = GenerateRequest(
        prompt=prompt,
        model_label=ModelLabel.FAST,
        temperature=0.7,
        response_mime_type="application/json",
        response_schema=json_schema,
    )

    print("\nCalling Gemini API...")
    response = await client.generate(request)
    raw_text = response.text
    print(f"Response length: {len(raw_text)} chars")
    print(f"First 200 chars: {raw_text[:200]}")
    print()

    # 6. JSON 파싱
    try:
        text = raw_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        data = json.loads(text)
        print(f"JSON parsed OK. Keys: {list(data.keys())}")
    except json.JSONDecodeError as e:
        print(f"JSON PARSE FAILED: {e}")
        print(f"Full response:\n{raw_text}")
        return

    # 7. Pydantic 검증
    try:
        output = TurnOutput.model_validate(data)
        print(f"Pydantic OK! Narrative: {output.narrative[:80]}...")
    except ValidationError as e:
        print(f"\n=== PYDANTIC VALIDATION FAILED ({len(e.errors())} errors) ===")
        for err in e.errors():
            print(f"  loc: {err['loc']}")
            print(f"  type: {err['type']}")
            print(f"  msg: {err['msg']}")
            if "input" in err:
                inp = str(err["input"])[:200]
                print(f"  input: {inp}")
            print()

        # 어떤 필드에 extra properties가 있는지 확인
        print("=== Checking for extra properties ===")
        _check_extra_fields(data)


def _check_extra_fields(data, path="root"):
    """모델과 비교하여 추가 필드를 찾습니다."""
    from unknown_world.models import turn as turn_models

    model_map = {
        "root": turn_models.TurnOutput,
        "economy": turn_models.EconomyOutput,
        "economy.cost": turn_models.CurrencyAmount,
        "economy.balance_after": turn_models.CurrencyAmount,
        "safety": turn_models.SafetyOutput,
        "ui": turn_models.UIOutput,
        "ui.action_deck": turn_models.ActionDeck,
        "world": turn_models.WorldDelta,
        "render": turn_models.RenderOutput,
        "agent_console": turn_models.AgentConsole,
    }

    model_cls = model_map.get(path)
    if model_cls and isinstance(data, dict):
        expected = set(model_cls.model_fields.keys())
        actual = set(data.keys())
        extra = actual - expected
        missing = expected - actual
        if extra:
            print(f"  [{path}] EXTRA fields: {extra}")
        if missing:
            # Only report missing required fields
            required = {
                name for name, field in model_cls.model_fields.items() if field.is_required()
            }
            missing_required = missing & required
            if missing_required:
                print(f"  [{path}] MISSING required: {missing_required}")

    if isinstance(data, dict):
        for key, val in data.items():
            child_path = f"{path}.{key}" if path != "root" else key
            if isinstance(val, dict):
                _check_extra_fields(val, child_path)
            elif isinstance(val, list):
                for i, item in enumerate(val):
                    if isinstance(item, dict):
                        _check_extra_fields(item, f"{child_path}[{i}]")


if __name__ == "__main__":
    asyncio.run(main())
