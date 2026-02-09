# Unknown World — Architecture Guide

## 1. System Overview

Unknown World is an **infinitely-generated roguelike narrative web game** combining a **Gemini-powered agentic world engine** with a multimodal pipeline. The system consists of a **stateful orchestrator** (backend) and a **high-fidelity game UI** (frontend).

### Design Principles

1. **Stateful Orchestrator**: Maintains and updates WorldState and conversation context (ConversationHistory) across turns.
2. **Structured Turn Contract**: All communication follows strict JSON Schema-based contracts (TurnInput → TurnOutput).
3. **Resilient Pipeline**: 7-stage orchestrator with automatic repair loops and guaranteed safe fallbacks.
4. **Dual Validation**: Server (Pydantic) and client (Zod) validate all data at both boundaries.
5. **Cost-Controlled Generation**: Economy system governs all AI model invocations with pre-disclosed costs.

## 2. Project Structure

```
unknown-world/
├── backend/
│   ├── prompts/                          # Externalized prompts (XML tags: meta/body)
│   │   ├── image/scene_prompt.{en,ko}.md
│   │   ├── scan/scan_instructions.{en,ko}.md
│   │   ├── system/game_master.{en,ko}.md
│   │   ├── turn/turn_output_instructions.{en,ko}.md
│   │   └── vision/scene_affordances.{en,ko}.md
│   ├── src/unknown_world/
│   │   ├── api/                          # FastAPI route handlers
│   │   │   ├── ending_report.py          # Ending report generation endpoint
│   │   │   ├── image.py                  # Image serving & management
│   │   │   ├── item_icon.py              # Item icon generation endpoint
│   │   │   ├── scanner.py                # Scanner (image upload → item) endpoint
│   │   │   ├── turn_stream_events.py     # NDJSON streaming event helpers
│   │   │   └── turn.py                   # Main turn processing endpoint
│   │   ├── artifacts/                    # Game artifact generators
│   │   │   └── ending_report.py          # Ending report data compilation
│   │   ├── config/                       # Configuration & constants
│   │   │   ├── economy.py                # Economy parameters & cost tables
│   │   │   ├── models.py                 # Model labels & IDs (SSOT)
│   │   │   └── settings.py               # Environment & runtime settings
│   │   ├── harness/                      # Replay & scenario testing
│   │   │   ├── replay_runner.py          # Hard Gate verification engine
│   │   │   └── scenario.py               # Scenario definitions
│   │   ├── main.py                       # FastAPI app entry point
│   │   ├── models/                       # Pydantic data models
│   │   │   ├── scanner.py                # Scanner input/output models
│   │   │   └── turn.py                   # TurnInput/TurnOutput models
│   │   ├── orchestrator/                 # Core orchestration engine
│   │   │   ├── conversation_history.py   # Multi-turn context manager
│   │   │   ├── fallback.py               # Safe fallback generator
│   │   │   ├── generate_turn_output.py   # Gemini API caller
│   │   │   ├── mock.py                   # Mock mode for development
│   │   │   ├── pipeline.py               # 7-stage pipeline coordinator
│   │   │   ├── prompt_loader.py          # Language-aware prompt loader
│   │   │   ├── repair_loop.py            # Auto-repair on validation failure
│   │   │   └── stages/                   # Individual pipeline stages
│   │   │       ├── parse.py              # Parse & normalize input
│   │   │       ├── plan.py               # Plan turn strategy
│   │   │       ├── resolve.py            # Resolve game logic & hotspots
│   │   │       ├── render.py             # Render images (async)
│   │   │       ├── verify.py             # Business rule verification
│   │   │       └── commit.py             # Commit state changes
│   │   ├── services/                     # External service integrations
│   │   │   ├── genai_client.py           # Gemini API client (unified)
│   │   │   ├── image_generation.py       # Image generation service
│   │   │   ├── image_understanding.py    # Vision analysis service
│   │   │   └── item_icon_generator.py    # Item icon generation service
│   │   ├── storage/                      # File storage abstraction
│   │   │   ├── local_storage.py          # Local file system storage
│   │   │   ├── paths.py                  # Path management
│   │   │   └── validation.py             # Storage validation
│   │   └── validation/                   # Business rule validators
│   │       ├── business_rules.py         # Economy/state invariant checks
│   │       └── language_gate.py          # Language consistency gate
│   └── tests/                            # Unit & integration tests
│
├── frontend/src/
│   ├── api/                              # Backend API clients
│   │   ├── turnStream.ts                 # Turn streaming (NDJSON parser)
│   │   ├── scanner.ts                    # Scanner API client
│   │   └── image.ts                      # Image API client
│   ├── components/                       # Game UI components
│   │   ├── ActionDeck.tsx                # Action card deck (3-6 cards/turn)
│   │   ├── AgentConsole.tsx              # Orchestrator visibility (Queue + Badges)
│   │   ├── EconomyHud.tsx                # Resource balance & ledger
│   │   ├── EndingReportModal.tsx         # Ending report artifact display
│   │   ├── InventoryPanel.tsx            # Inventory with DnD rows
│   │   ├── NarrativeFeed.tsx             # Typewriter narrative display
│   │   ├── ObjectiveTracker.tsx          # HUD mini quest tracker
│   │   ├── QuestPanel.tsx                # Quest objectives & progress
│   │   ├── RateLimitPanel.tsx            # 429 error retry UI
│   │   ├── SceneCanvas.tsx               # Scene image + hotspot overlay
│   │   └── SceneImage.tsx                # Image rendering with states
│   ├── data/                             # Static data
│   │   ├── demoProfiles.ts               # 3 demo profile definitions
│   │   └── itemIconPresets.ts            # Pre-made item icon registry
│   ├── demo/                             # Demo mode components
│   │   └── DemoProfileSelect.tsx         # Profile selection screen
│   ├── dnd/                              # Drag & Drop system
│   │   └── InventoryDnD.tsx              # DnD provider & overlay
│   ├── locales/                          # i18n translations
│   │   ├── ko-KR/translation.json
│   │   └── en-US/translation.json
│   ├── save/                             # Session management
│   │   └── sessionLifecycle.ts           # Profile injection & reset
│   ├── schemas/                          # Zod validation schemas
│   │   ├── turn.ts                       # TurnOutput schema
│   │   ├── scanner.ts                    # Scanner result schema
│   │   └── economy.ts                    # Economy schema
│   ├── stores/                           # Zustand state stores
│   │   ├── worldStore.ts                 # WorldState, scene, narrative
│   │   ├── economyStore.ts               # Balance, ledger, costs
│   │   ├── inventoryStore.ts             # Items, icons, DnD state
│   │   ├── agentStore.ts                 # Queue, badges, model labels
│   │   └── artifactsStore.ts             # Ending reports, artifacts
│   ├── turn/                             # Turn execution
│   │   └── turnRunner.ts                 # Turn lifecycle orchestrator
│   ├── utils/                            # Utilities
│   │   ├── box2d.ts                      # Coordinate conversion (0-1000)
│   │   └── imageSizing.ts                # Aspect ratio snapping
│   ├── App.tsx                           # Root layout component
│   ├── i18n.ts                           # i18next configuration
│   ├── main.tsx                          # React entry point
│   └── style.css                         # Global styles (CRT theme)
│
├── shared/                               # Shared schema SSOT
│   └── schemas/
│       ├── turn/turn_input.schema.json   # TurnInput JSON Schema
│       └── turn/turn_output.schema.json  # TurnOutput JSON Schema
│
├── docs/                                 # Project documentation (English)
│   ├── prd.md                            # Product Requirements
│   ├── tech-stack.md                     # Technology Stack
│   └── architecture.md                   # Architecture Guide (this file)
│
└── docker-compose.yml                    # Container orchestration
```

## 3. Backend Architecture

### 3.1 Orchestrator Pipeline (7 Stages)

Every turn request flows through a **7-stage pipeline** defined in `orchestrator/pipeline.py`:

```
Parse → Validate → Plan → Resolve → Render → Verify → Commit
```

| Stage | Responsibility | Key Behavior |
|-------|---------------|--------------|
| **Parse** | Normalize & validate TurnInput | Extract action type, click target, DnD payload |
| **Validate** | Pre-flight checks | Economy snapshot verification, input sanitization |
| **Plan** | Determine turn strategy | Model selection (FAST/QUALITY), cost estimation |
| **Resolve** | Execute game logic | Call Gemini for TurnOutput, apply hotspot filters, process Agentic Vision |
| **Render** | Generate images (async) | Conditional image generation based on economy/flags, reference image pipeline |
| **Verify** | Business rule enforcement | Economy invariants, safety checks, language consistency, coordinate validation |
| **Commit** | Finalize & stream | Apply state changes, emit NDJSON events, update conversation history |

**Pipeline Context** (`PipelineContext`): Shared state object passed through all stages, carrying services (image_generator, genai_client), turn data, and intermediate results.

### 3.2 Repair Loop

When validation fails (schema mismatch, economy violation, safety block):

1. **First attempt**: Re-prompt Gemini with repair instructions (max 2 retries)
2. **Model fallback**: If Pro model fails, automatically retry with Flash model
3. **Safe fallback**: If all retries fail, generate a minimal safe TurnOutput that:
   - Preserves the player's economy snapshot (no resource loss)
   - Provides a narrative explaining the situation
   - Maintains all Hard Gate invariants

### 3.3 Conversation History

- **Sliding window**: Last 5 turns maintained in memory
- **Token budget**: 50k tokens max for history context
- **Thought Signatures**: Gemini 3's reasoning traces captured and forwarded to maintain logical continuity

### 3.4 Streaming Protocol (NDJSON)

Turn responses are streamed as newline-delimited JSON events:

```jsonl
{"type":"stage","name":"parse","status":"start"}
{"type":"stage","name":"parse","status":"complete"}
{"type":"narrative_delta","text":"The ancient door..."}
{"type":"badges","badges":["schema_ok","economy_ok","safety_ok","consistency_ok"]}
{"type":"final","data":{...}}  // Complete TurnOutput
```

Error events:
```jsonl
{"type":"error","message":"Rate limit exceeded","code":"RATE_LIMITED"}
```

### 3.5 Services Layer

| Service | Model | Purpose |
|---------|-------|---------|
| `genai_client.py` | — | Unified Gemini API client (API key auth) |
| `image_generation.py` | `gemini-3-pro-image-preview` | Scene image generation with reference support |
| `image_understanding.py` | `gemini-3-flash-preview` | Agentic Vision (hotspot detection, bbox 0-1000) |
| `item_icon_generator.py` | `gemini-2.5-flash-image` | 64x64 pixel art item icons |

### 3.6 Economy Validation

```
balance_after = max(0, snapshot - cost + gains)
```

- **Pre-action**: Estimated cost (min/max) displayed to player
- **Post-action**: Actual cost verified against snapshot
- **Gains**: Quest rewards, exploration bonuses (max 30 Signal, 10 Shard per turn)
- **Negative balance**: Strictly forbidden (Hard Gate)
- **Low balance fallback**: When Signal < image cost, auto-switch to FAST model at 0 cost

## 4. Frontend Architecture

### 4.1 State Management (Zustand Stores)

| Store | Responsibility |
|-------|---------------|
| `worldStore` | WorldState, scene image, narrative entries, scene objects, processing phase |
| `economyStore` | Signal/Shard balance, cost tracking, resource ledger (last 20 entries) |
| `inventoryStore` | Items, icons, DnD state, sell confirmations |
| `agentStore` | Action queue, verification badges, model labels, rate limit state |
| `artifactsStore` | Ending reports, session artifacts |

### 4.2 Turn Lifecycle (turnRunner.ts)

1. **Input Lock**: Disable all user interactions
2. **Stream Start**: POST to `/api/turn` with TurnInput
3. **NDJSON Processing**: Parse stage events → update Agent Console → accumulate narrative
4. **Text-first Output**: Start typewriter immediately on `final` event
5. **Async Image**: Fire image generation job in background
6. **Late-binding**: Image arrives → update Scene Canvas (with turn ID guard)
7. **Input Unlock**: Re-enable interactions

### 4.3 Component Architecture

```
App.tsx (Root Layout)
├── GameHeader (Title, Seed, Language/Theme toggles)
├── Main Grid (3-column responsive)
│   ├── Sidebar Left
│   │   ├── InventoryPanel (DnD rows, sell buttons)
│   │   └── QuestPanel (objectives, progress)
│   ├── Center
│   │   ├── ObjectiveTracker (HUD mini tracker)
│   │   ├── SceneCanvas (image + hotspot circles)
│   │   └── NarrativeFeed (typewriter + action log)
│   └── Sidebar Right
│       ├── EconomyHud (balance, ledger)
│       └── AgentConsole (queue + badges)
├── ActionDeck (3-6 action cards)
└── CommandInput (text input + scanner drop zone)
```

### 4.4 CRT Theme System

- **Single CSS file** (`style.css`) with CSS custom properties
- **Tiered intensity**: `--crt-intensity-critical` (0) protects info-dense areas; `--crt-intensity-ambient` (1) for decorative areas
- **`[data-ui-importance='critical']`**: Suppresses scanlines and glow for balance, costs, input
- **Responsive**: 4 breakpoints (1920px Wide → 768px Mobile single-column)
- **Accessibility**: `prefers-reduced-motion` disables all CRT animations

## 5. Data Flow

### 5.1 Turn Request Flow

```
Player Action (click/type/drag)
    → turnRunner.ts (lock input, prepare TurnInput)
    → POST /api/turn (HTTP Streaming)
    → pipeline.py (7 stages)
    → Gemini API (structured output)
    → Repair Loop (if needed)
    → NDJSON stream (stage/badges/narrative/final)
    → turnRunner.ts (parse events, update stores)
    → UI re-render (narrative + image + hotspots)
```

### 5.2 Image Pipeline

```
TurnOutput.render.image_job
    → Economy check (sufficient Signal?)
    │   ├── Yes → gemini-3-pro-image-preview (QUALITY)
    │   └── Low → gemini-2.5-flash-image (FAST, 0 cost)
    → Reference image injection (previous scene URL)
    → Aspect ratio from Scene Canvas size
    → Generated image saved to local storage
    → URL returned → SceneCanvas late-binding update
```

### 5.3 Scanner (Image → Items)

```
User drops image on Scanner
    → POST /api/scan (multipart)
    → image_understanding.py (Gemini Vision)
    → Weighted random item count (1: 60%, 2: 30%, 3: 10%)
    → Auto-retry (max 2) with reinforcement prompt
    → ScanResult → inventoryStore.addItems()
```

### 5.4 Agentic Vision (Scene Analysis)

```
Player clicks "Detailed Analysis" action card
    → POST /api/turn (with vision trigger)
    → resolve.py detects vision action
    → image_understanding.py (gemini-3-flash-preview + code_execution)
    → filter_hotspots (area sort → overlap removal → max 3)
    → Hotspots merged into TurnOutput.ui.objects
    → SceneCanvas renders circle markers (22px radius, pulse animation)
```

## 6. Key Invariants

| Invariant | Enforcement |
|-----------|-------------|
| No negative balance | `verify.py` + `business_rules.py` Hard Gate |
| No mixed-language output | `language_gate.py` + i18next session SSOT |
| Coordinates always 0–1000 | `box2d.ts` conversion + prompt reinforcement |
| Hotspots only via Agentic Vision | `resolve.py` + `verify.py` double guard |
| Every stream ends with exactly 1 `final` event | `turn_stream_events.py` termination invariant |
| Safe fallback on any failure | `fallback.py` generates valid TurnOutput preserving economy |
| Prompts never exposed in UI | Agent Console shows labels/badges only |

## 7. Deployment Architecture

```
┌─────────────────────────────────────────────┐
│                  Cloud Run                   │
│  ┌─────────────┐       ┌─────────────────┐  │
│  │  Frontend    │       │    Backend      │  │
│  │  (Static)    │  ───► │  (FastAPI)      │  │
│  │  React 19    │       │  Python 3.14    │  │
│  │  Vite 7      │       │  Uvicorn        │  │
│  └─────────────┘       └────────┬────────┘  │
│                                  │           │
│                          ┌───────▼────────┐  │
│                          │  Gemini API    │  │
│                          │  (API Key)     │  │
│                          └────────────────┘  │
└─────────────────────────────────────────────┘
```

- **Frontend**: Static build served via nginx/CDN
- **Backend**: FastAPI with Uvicorn, single container
- **Storage**: Local filesystem (`.data/images/`) for generated images
- **Authentication**: Gemini API key via environment variable (no user-facing auth)
- **Ports**: Frontend 8001, Backend 8011
