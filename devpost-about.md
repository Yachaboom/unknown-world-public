## Inspiration

Most AI apps consist of a single prompt and a chat UI. We took a different direction — instead of having AI just generate text, we built a structure where it tracks world state, manages rules, runs an economy, and composes clickable scenes as a Game Master. The roguelike genre's "a different world every time" property, combined with Gemini 3's structured outputs, image generation, and vision analysis, made it feasible to build a web-based narrative game with infinite replayability.

## What it does

Unknown World is a roguelike narrative web game that uses Gemini 3 as its Game Master engine.

- **Agent-driven Game Master**: Each turn, Gemini 3 Pro returns narrative, UI choices, state changes, and costs in a single JSON Schema-enforced structured output. Outputs are dual-validated by Pydantic (server) and Zod (client), with an automatic repair loop (up to 2 retries) on failure.
- **Agentic Vision**: Scene images are re-analyzed by Gemini 3 Flash + Code Execution to detect objects within the image as bounding boxes (0–1000 coordinates). Detected objects become clickable hotspots on the Scene Canvas — interaction targets grounded in vision evidence, not text hallucination.
- **Multimodal Scene Generation**: Gemini 3 Pro Image generates scene artwork matching the narrative. Text and state panels are delivered first; images load asynchronously (lazy loading) to reduce perceived latency.
- **Scanner (Photo → Item)**: Users upload real-world photos, and Gemini 3 Flash's vision analysis converts them into captions, detected objects, and in-game item candidates.
- **NDJSON Turn Streaming**: After generating the full TurnOutput, the server streams pipeline stages (Parse→Validate→Plan→Resolve→Render→Verify→Commit) and validation badges (Schema/Economy/Safety/Consistency OK) as NDJSON events. Narrative text is chunked for a typewriter effect.
- **Interactive Game UI**: Action Deck (action cards with cost/risk), Inventory (dnd-kit drag & drop to use items on scene objects), Scene Canvas (clickable hotspots), and Economy HUD (Signal/Shard balance, estimated costs, transaction ledger) are always visible in a fixed layout.
- **Economy System**: Signal/Shard currencies manage action costs. Estimated costs are shown before each action, and alternatives are suggested when balance is insufficient. All transactions are recorded in a ledger.

## How we built it

**Frontend**: React 19 + Vite 7 + TypeScript. CRT retro theme via CSS variables in a fixed game layout. Zustand for WorldState/Inventory/Economy state management, Zod for server response validation, dnd-kit for inventory drag & drop, i18next for Korean/English switching.

**Backend**: FastAPI (Python 3.14) async orchestrator. NDJSON-based HTTP Streaming (Fetch + POST) delivers turn results as step-by-step events. Pydantic models enforce TurnOutput schema. On validation failure, a repair loop (up to 2 attempts) auto-retries. On persistent failure, a safe fallback (text-only TurnOutput) is returned.

**Gemini 3 Integration — Four Pillars**:
- **Text (Game Master)**: `gemini-3-pro-preview` (primary) / `gemini-3-flash-preview` (fallback). `response_mime_type: application/json` + `response_schema` for JSON Schema enforcement.
- **Image Generation**: `gemini-3-pro-image-preview` (primary) / `gemini-2.5-flash-image` (low-latency). Reference image support for visual continuity.
- **Agentic Vision**: `gemini-3-flash-preview` + Code Execution. Re-analyzes generated scene images to detect object bounding boxes → converts to hotspots. Filtered to 1–3 per scene with priority ranking and overlap removal.
- **Scanner (Image Understanding)**: `gemini-3-flash-preview`. Analyzes uploaded photos into captions, detected objects, and item candidates.

**Fallback Strategy**: On API errors (429, 5xx), automatic Pro→Flash model switching with exponential backoff (2s→4s→8s). Mock mode fallback on GenAI client initialization failure.

## Challenges we ran into

- **LLM Output Instability**: Responses occasionally break the schema even with JSON Schema enforcement. We addressed this with Pydantic+Zod dual validation, a repair loop (up to 2 retries), and a safe text-only fallback — three layers of defense.
- **Image Generation Latency**: Scene image generation takes 10–20 seconds. We deliver text and state panels first, then load images asynchronously with CRT-themed loading animations to reduce perceived wait time.
- **Being Mistaken for a Chat App**: AI apps are easily perceived as chat wrappers. We removed chat bubbles entirely and kept Action Deck, Inventory, Scene Canvas, and Agent Console permanently visible in a fixed game layout.
- **Economy Balance**: We iteratively tuned Signal earn/spend ratios to prevent resource depletion within a 10-minute demo loop.
- **Rate Limiting**: We implemented automatic Pro→Flash fallback model switching and a countdown-based retry UI for Gemini API 429 errors.

## Accomplishments that we're proud of

- **A Stateful Game System**: WorldState, Economy, Inventory, and Repair loops form a structure where state accumulates and is validated — not an app that ends with a single prompt.
- **Agentic Vision Pipeline**: The AI re-analyzes its own generated images to create clickable hotspots. Interactions are grounded in vision evidence rather than text hallucination.
- **Agent Action Visibility**: Seven pipeline stages and four validation badges are displayed in real-time through the Agent Console — showing system behavior without exposing internal reasoning or prompts.
- **Scanner**: Upload a real-world photo, and vision analysis converts it into in-game items — a multimodal interaction loop.
- **138 Work Units Completed**: From planning through implementation, 138 work units completed at 100%.

## What we learned

- **Structured Outputs Are the Key**: Enforcing JSON Schema turns AI output into parseable game data. This is the fundamental difference between a chat wrapper and a game system.
- **Validation and Repair Must Be Designed from Day One**: LLM output is inherently unstable. Without automatic repair and safe fallbacks built into the initial design, production breaks.
- **Latency Can Be Absorbed by UX**: Image generation latency is hard to reduce technically, but step-by-step streaming and loading animations significantly reduce perceived wait time.
- **AI Costs Can Become Game Mechanics**: Converting API costs into in-game currency (Signal/Shard) instead of hiding them turns cost management into part of the gameplay.

## What's next for Unknown World

- **Save/Load Redesign**: Server-side storage for persistent progress
- **Expanded Agentic Vision**: Applying vision grounding beyond hotspots to Action Deck card generation
- **Multiplayer Co-op**: Multiple players exploring the same world together
- **BGM/SFX Generation**: AI-powered background music and sound effects
- **Mobile Optimization**: Touch interactions and responsive layouts
