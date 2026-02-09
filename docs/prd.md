# Unknown World — Product Requirements Document

## 1. Product Overview

### 1.1 One-liner

**Unknown World** is an **infinitely-generated roguelike narrative web game** that combines a **Gemini-powered agentic Game Master engine** with a multimodal (text, image, vision) pipeline.

### 1.2 Description

- There are no fixed scenarios, scripts, or endings. The world and its rules update in real-time based on the player's **natural-language input + on-screen object clicks**.
- Text responds instantly via **streaming (typewriter effect)**, and images are **selectively generated/edited** at key moments to enhance immersion.
- The AI does not merely narrate — it **structures UI elements (choices, objects, coordinates)** to produce a "playable screen."

### 1.3 Goals

- **High-fidelity multimodal app**: Not a simple chat wrapper, but a complete experience with UI, state, economy, endings, and artifacts.
- **Agentic orchestration**: Input interpretation → state update → UI generation → (conditional) image generation/editing → validation/repair — all automated.
- **Infinite replayability**: Every session features different genres, eras, and physical laws, with unique endings generated from play logs.

## 2. Design Philosophy

### 2.1 Anti-Pattern: "Prompt-only wrapper / Generic chatbot"

- **We do not build an app that ends with a single prompt.**
- The game is not a "conversation" — it is a **stateful system** that must include:
  - **State**: WorldState / Inventory / Rules / Economy / History
  - **Orchestrator**: Multi-step generation, validation, retry, cost control
  - **Artifacts**: Ending reports, images, logs

### 2.2 "Action Era" Implementation

- **Memory/summarization/pinning** systems maintain consistency across extended sessions.
- Model outputs are **structured (JSON Schema)** so UI, state, and costs can be processed mechanically.
- **Validation + automatic repair loops** handle failures and incomplete outputs.

### 2.3 Creative Autopilot (High-Quality Image Generation)

Image generation goes beyond "just generating a picture":
- Maintains **scene consistency** (characters, objects, tone)
- Supports **conversational editing** (multi-turn)
- Allows **resolution/aspect-ratio selection** (1K/2K/4K, 16:9, etc.) as needed

## 3. Language & i18n Policy

### 3.1 Supported Languages

- **Korean (ko-KR)** and **English (en-US)** — dual-language support.
- UI text, system messages, in-game narrative, choices, and object labels all follow the same language policy.
- **Default language: English (en-US)** — first-time visitors start in English; Korean is available via language toggle.
- Language switching during gameplay triggers a **session reset** to prevent mixed-language output.

### 3.2 Prompt Management

- All core prompts are managed as **external `.md` files** in the backend.
- Prompts are separated by language (e.g., `game_master.en.md`, `game_master.ko.md`).
- A prompt loader selects the correct file based on the `language` parameter, with **hot-reload** in development mode.
- Prompts use **XML tag-based blocks** (`<prompt_meta>`, `<prompt_body>`) for structural standardization.

### 3.3 i18n Resource Files

- UI text and system messages use **i18next** with JSON resource files:
  - `frontend/src/locales/ko-KR/translation.json`
  - `frontend/src/locales/en-US/translation.json`
- All user-facing strings use **key-based references** (`t('...')`) to minimize hardcoding.

## 4. Target Personas

### 4.1 Personas

- **The Narrator**: Story-driven, immersion-focused
- **The Explorer**: System experimentation, emergent gameplay
- **The Tech Enthusiast**: Interested in multimodal, structured-output, and agentic design

### 4.2 User Needs

- Feel that "my choices change the world" (feedback through state, rules, and visual results)
- Endings that are not mere summaries but **play-log-based reports with artwork**
- Start light on the web, but discover deeper systems (economy, unlocks) with continued play

## 5. Economy System

### 5.1 Purpose

- **Transform cost risks (tokens, images) into game mechanics.**
- Players make **strategic choices** through resource management rather than getting unlimited generation.

### 5.2 Resources

- **Signal**: Primary resource. Consumed for text turns, image generation, and advanced features.
- **Memory Shard**: Rare resource. Used for "pinning important settings," "locking rules," and "high-resolution images."

### 5.3 Acquisition Loops

- Signal earned per turn through survival, progression, and objective completion
- **Base Reward**: 1–3 Signal per turn as survival reward
- **Adaptive Reward**: When balance drops below 10, base reward increases to 3 and earn-type action cards are forced
- Quest/exploration rewards: Sub-quest 5–8, Main quest 10–15 Signal
- Item selling: Any inventory item can be sold for 5 Signal

### 5.4 Cost Policy

- **Text turn**: Low (base)
- **Image generation**: Medium–High (scene generation)
- **Image editing (multi-turn)**: Medium (proportional to edits/resolution)
- **Quality model (QUALITY)**: 2x base cost
- **Agentic Vision (scene analysis)**: 1.5x base cost

### 5.5 UX Requirements

- Show **estimated cost (min/max)** before actions; suggest alternatives (text-only / low-resolution) when resources are insufficient.
- Display resource consumption in a game-like manner (e.g., "World signal weakening... -12 Signal").

## 6. Core Features

### 6.1 Agentic Game Master Engine

- Interprets player input (text/clicks) and updates **WorldState**.
- Dynamically manages story progression (introduction → development → crisis → climax → resolution).
- Returns output as **structured results including UI, state, and costs** — not just text.
- **Multi-turn context**: Maintains conversation history with a sliding window (5 turns, 50k token budget) and Gemini Thought Signatures for reasoning continuity.
- **Overarching Mystery**: An abstract, genre-agnostic thematic goal ("The Echo") is injected into the system prompt, providing directional context for quest and narrative alignment.
- **Profile-Story Coherence**: Pre-generated scene images include textual descriptions injected into first-turn prompts, ensuring a seamless transition from welcome screen → image → first narrative.

### 6.2 Structured UI Generation (Clickable World)

- Objects and hotspots are provided with coordinates, making them clickable on screen.
- Coordinates use a **0–1000 normalized coordinate system** (compatible with vision bbox format).
- Hotspots are generated **only through "Detailed Analysis" (Agentic Vision)** actions, preventing arbitrary GM-generated hotspots.
- Limited to **1–3 hotspots** per analysis, rendered as compact **circle markers** with pulse animation.
- Duplicate analysis prevention: Analysis card is disabled when hotspots already exist.

### 6.3 Multimodal Rendering Pipeline

- Text narrative → (conditional) Image generation/editing → UI overlay (hotspots)
- **Text-first output + Lazy Loading**: Text streams immediately; images load asynchronously.
- **Delay absorption**: Adaptive typewriter speed syncs with image loading; "image forming..." status messages maintain engagement.
- **Late-binding guard**: Turn ID-based protection prevents stale images from overwriting current scenes.
- **Aspect ratio snapping**: Image dimensions match the actual Scene Canvas layout from 10 supported ratios.

### 6.4 Rule Mutation System

- Player actions/triggers cause genre, physics, and meta-rule mutations.
- Rules are explicitly recorded in WorldState and consistently applied in subsequent turns.

### 6.5 Dynamic Ending Generator

- Analyzes play logs to generate **summary text + representative image + rule-change timeline**.

### 6.6 Session Management

- **No save/load in MVP**: Browser refresh always returns to the profile selection screen for a clean demo experience.
- Only language preference persists in localStorage.
- Three demo profiles inject initial state directly into stores via session lifecycle.

### 6.7 Game-like Interaction System

> Ensures the UI is never mistaken for a "chat app" by judges.

- **Action Deck**: 3–6 action cards per turn with Signal/Shard costs, risk/reward hints, and alternative badges.
- **Inventory + Drag & Drop**: Items displayed as rows; drag items to scene hotspots to use/combine; one-time items are consumed; always-visible sell button with inline confirmation.
- **Quest/Objective Panel**: Main objective with progress bar, sub-objectives as checklist, reward display.
- **Economy HUD**: Signal/Shard balance, estimated/confirmed costs, resource log (last 20 entries).
- **Scanner Slot**: Drag/upload images → vision analysis → items/clues added to inventory. Auto-retry with exponential backoff on parse failure.
- **Interaction Hints**: Contextual tooltips for hotspots and inventory items; auto-hide after 3 exposures.

### 6.8 Agent Visibility (Action Queue / Self-Repair)

> Shows "planning → execution → validation → repair" traces in the UI, proving this is an agentic system.

- **Action Queue**: Displays orchestrator stages — `Parse → Validate → Plan → Resolve → Render → Verify → Commit` — with timing badges.
- **Self-Repair Trace**: Shows `Auto-repair #1/#2...` with retry counts/results on schema failures, cost overruns, or safety blocks.
- **Verification Badges**: `Schema OK`, `Economy OK`, `Safety OK`, `Consistency OK` — always visible, with red warnings on failures.
- **Model Labels**: `FAST` (low-latency), `QUALITY` (high-quality), `VISION` (scene analysis) displayed without exposing prompts.

### 6.9 Demo Profiles (Preset Users for Reviewers)

- **No login required**: Select a demo profile to start immediately.
- **Three personas**: Narrator / Explorer / Tech Enthusiast — each with different initial resources and scenarios.
- **Pre-generated scene images**: Eliminate 10–20s image generation delay at session start.
- **One-click reset**: Return to initial state for repeatable demos.

## 7. User Journey

1. **Intro**: Start → Language selection (ko/en) → Demo profile selection → Initial resources granted
2. **World Generation**: Seed generation → Text streaming for first scene → (optional) First background image
3. **Exploration**: Text input or object clicks → System presents costs/risks/alternatives → Drag & Drop items to objects → Action Deck recommendations
4. **Rule Mutation Events**: Accumulated actions/successes/failures → Rule changes → UI/image updates
5. **Ending**: Report (summary/image/stats/economy settlement) → Restart

## 8. Technical Design

### 8.1 Tech Stack

- **Backend**: FastAPI (async), **HTTP Streaming (Fetch + POST)**
- **Frontend**: React 19 + Vite 7
- **State Management**: Session WorldState + summary memory + resource ledger

### 8.2 Authentication

- Backend manages **Gemini API key via server environment variables** (Google GenAI SDK).
- No BYOK (user API key input) required.
- `.env.example` serves as the SSOT for configuration.

### 8.3 Text Generation

- **Streaming**: Server receives model chunks via `generateContentStream` and delivers them as HTTP Streaming response for typewriter effect.
- **System Instructions**: Game Master persona + rules/safety + output schema constraints.
- **Thinking Control**: Gemini 3 `thinking_level` (low/high) selected based on context and resources.

### 8.4 Structured Outputs (JSON Schema)

- Responses use `response_mime_type: application/json` + `response_json_schema`.
- **Purpose**: Receive not just narrative text, but UI, state, cost, and image requests as parseable results.
- **Streaming protocol**: NDJSON event stream with `stage`, `badges`, `narrative_delta`, `final`, and `error` events.
- **Validation/Repair**: Schema validation → Business rule validation → Repair prompt on failure → Safe fallback.

### 8.5 Image Generation

- **Models**: `gemini-3-pro-image-preview` (quality), `gemini-2.5-flash-image` (fast/low-latency)
- **Prompt principles**: Scene description (narrative-centric) over keyword listing; semantic negative prompts
- **Multi-turn editing**: Thought Signatures maintained across turns for visual consistency
- **Resolution/Aspect ratio**: Selected based on device context and resources (1K/2K/4K, various ratios)

### 8.6 Image Understanding

- Uploaded/reference images are processed for captioning, object detection (bbox 0–1000), and style-consistent scene generation.
- **Agentic Vision**: `gemini-3-flash-preview` + `code_execution` for Think→Act→Observe loops analyzing generated scenes.

### 8.7 Core Data Models

- **TurnInput** (Client → Server): `language`, `text`, `click`, `client` (viewport), `economy_snapshot`
- **TurnOutput** (Server → Client): `language`, `narrative`, `ui` (choices, objects), `world` (delta, memory_pins), `render` (image_job), `economy` (cost, gains, balance_after), `safety`

## 9. Frontend UX & Style

### 9.1 Design Concept

- **CRT Terminal Retro** aesthetic: Phosphor green, glow, scanlines, glitch effects
- "Game UI = part of the world" — immersive interface design

### 9.2 Themes

- **Default: Dark mode** with CRT identity
- Light mode available with preserved CRT feel but prioritizing readability
- Implementation: CSS variable-based theme toggle (`data-theme="dark|light"`)

### 9.3 Layout

- **Header**: Title / Seed / Language toggle / Theme toggle / Economy HUD / Connection status
- **Center**: Scene Canvas (scene image + hotspot overlay) + Narrative Feed
- **Side Panels**: Inventory / Quest / Agent Console (Queue + Badges)
- **Footer**: Action Deck + Command input
- Responsive breakpoints: Wide (1920px), Normal (1366px), Compact (1024px), Mobile (768px)

### 9.4 Accessibility

- Keyboard navigation (Enter to execute, Tab focus)
- Input locked during system processing (streaming/image generation)
- Color alone never conveys meaning (text/icon pairing)
- `prefers-reduced-motion` respected for all animations

### 9.5 CRT Effects

- Scanline/flicker overlays use `pointer-events: none` to avoid blocking interactions.
- **Intensity tokens**: `--crt-intensity-critical` (0) for info-dense areas, `--crt-intensity-ambient` (1) for decorative areas.
- Critical UI elements (balance, costs, input) are protected from CRT effects for maximum legibility.

## 10. Quality Gates

### Hard Gates (Must Pass)

- **Schema OK**: TurnOutput JSON passes schema validation (Pydantic + Zod)
- **Economy OK**: Cost/balance consistency, no negative balance
- **Safety OK**: Blocked content handled with explicit message + safe fallback
- **Consistency OK**: Language policy and coordinate conventions (0–1000 bbox) respected

### Soft Gates (Monitored)

- Streaming TTFB: < 2 seconds target
- Image generation: Optional, lazy-loaded, text fallback on failure

## 11. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM output instability (schema/semantic) | High | 35% | Structured Outputs + dual validation + repair loop + safe fallback |
| Latency/cost (especially images/Thinking) | High | 30% | HTTP Streaming + economy controls + lazy images + model tiering |
| "Looks like a chat app" misperception | High | 25% | Fixed game HUD + demo profiles + 10-min demo loop |

## 12. Success Metrics

- **Engagement**: Average session duration 15+ minutes
- **Performance**: API error rate < 1%, Streaming TTFB < 2 seconds
- **Demo Loop**: Complete drag → click → (scanner) upload → rule mutation → ending cycle within 10 minutes

## 13. Out of Scope

- Multiplayer / Co-op
- BGM / SFX generation
- Complex 3D rendering (2D image + text focused)
