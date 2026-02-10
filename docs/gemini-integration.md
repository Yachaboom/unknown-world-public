# Gemini 3 Integration

Unknown World leverages **four core Gemini 3 capabilities** to power its agentic Game Master engine — going far beyond a prompt wrapper into a stateful, validated game system.

## Structured Outputs (JSON Schema)

Every game turn produces a `TurnOutput` via Gemini's structured output mode (`response_mime_type: application/json` + `response_schema`). This ensures the AI controls not just narrative text, but also UI layout (action cards, hotspots), world state mutations (inventory, rules), economy transactions (cost/balance), and safety flags — all mechanically validated. The server enforces schemas with **Pydantic**; the client re-validates with **Zod**.

## Real-time Streaming

Narrative text streams to the player via HTTP POST streaming with a typewriter effect, targeting first-byte responses within 2 seconds. An NDJSON protocol carries pipeline stages (`Parse → Commit`), validation badges (`Schema OK`, `Economy OK`), and incremental text deltas simultaneously.

## Image Generation & Editing

Scene artwork is generated dynamically using `gemini-3-pro-image-preview`, with reference images from previous turns maintaining visual continuity. A tiered model system (`FAST`/`QUALITY`) balances latency against fidelity, controlled by the in-game economy.

## Vision Analysis (Agentic Vision)

The Scanner feature lets players upload real-world photos, which `gemini-3-flash-preview` with code execution analyzes to extract game items. The same vision pipeline detects clickable hotspots on generated scene images, grounding interactions in visual evidence rather than hallucination.

## Self-Repair Pipeline

When outputs fail validation, an automated repair loop re-prompts the model with correction guidance (up to 2 retries). On persistent failure, a guaranteed safe fallback ensures the game never crashes — maintaining state integrity and player trust.
