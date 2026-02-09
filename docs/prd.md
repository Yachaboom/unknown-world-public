# [Unknown World] PRD

## 1. Product Overview

### 1.1 One-line Introduction

**Unknown World** is an infinite-generation roguelike narrative web game that combines a Gemini-based **Agentic Game Master (GM)** world engine with a multimodal (text, image, vision) pipeline.

### 1.2 Product Description

- There are no fixed scenarios, scripts, or endings. The world and rules are updated in real-time based on the player's **natural language input and object clicks**.
- Text responds immediately via **streaming (typewriter effect)**, and images are **selectively generated/edited** at key moments to enhance immersion.
- The AI doesn't just tell a narrative; it structures the **UI (choices, objects, coordinates)** to create a "playable screen."

### 1.3 Goals

- **High-fidelity Multimodal App**: A complete experience with UI, state, economy, saves, and endings, rather than a simple chat wrapper.
- **Agentic Orchestration**: Automatic execution of input interpretation → state update → UI generation → (conditional) image generation/editing → validation/repair.
- **Infinite Replayability**: Genres, eras, and physical laws change with every session, and unique endings are generated based on play logs.

## 2. Project Direction (Standard Guide reflected)

### 2.1 Principle of Avoiding "Prompt-only wrapper / Generic chatbot"

- **Do not create an app that ends with a single prompt.**
- A game is a **stateful system**, not a "conversation," and must include the following elements:
  - **State**: WorldState / Inventory / Rules / Economy / History
  - **Orchestrator**: Multi-stage generation, validation, retry, and cost control.
  - **Artifacts**: Save files, ending reports, images, and logs.

### 2.2 Implementation Points for the 'Action Era'

- Establish a system for **fixing memory/summaries/important settings** to maintain consistency during long sessions (marathon play).
- Model output is **structured (JSON Schema)** to mechanically process UI, state, and costs.
- Design an **automatic repair loop** after validation to prepare for failed/incomplete outputs.

### 2.3 Creative Autopilot Direction (High-quality Image Generation)

- Image generation is not just "pulling a single image":
  - Maintain **scene consistency (character/object/tone)**.
  - Support **interactive editing (multi-turn)**.
  - Select **resolution/ratio (1K/2K/4K, 16:9, etc.)** when necessary.

## 3. Scope and Language Policy

### 3.1 Supported Languages

- Support for **Korean (ko-KR) and English (en-US)**.
- The same policy applies to UI text, system messages, in-game narrative, choices, and object labels.
- **Default Language: English (en-US)**: To meet Devpost hackathon requirements, the app starts in **English** on first access (if no LocalStorage settings exist). Korean can be toggled.

### 3.2 Prompt/Output Language Design Principles

- All core prompts are managed in **separate `.md` files on the backend**.
- Prompts are separated by language (recommended), and `language` is included in turn inputs to fix responses to the same language (preventing mixed output).
- The prompt loader loads the correct file based on the `language` parameter and supports **hot-reloading** in development mode.

### 3.3 UI/System i18n Resource File Structure (JSON)

- UI text and system messages are managed based on **i18next**, with language resources separated into **JSON files**.
- All user-facing strings are referenced via **keys (`t('...')`)** whenever possible, minimizing hardcoded strings.

## 4. User Definition

### 4.1 Target Personas

- **The Narrator**: Focus on story participation and immersion.
- **The Explorer**: Prefers system experimentation and emergent play.
- **The Tech Enthusiast**: Interested in multimodal, structured, and agentic design.

## 5. Game Currency (Cost) System

### 5.1 Purpose

- Convert **cost (token/image) risks into game mechanics**.
- Players make **choices and strategies** through currency instead of having "unlimited generation."

### 5.2 Currency Definitions

- **Signal**: Base currency. Consumed for text turns, image generation, and advanced features.
- **Memory Shard**: Rare currency. Consumed for "fixing important settings," "rule fixation," and "high-resolution images."

### 5.3 Acquisition Loop

- Earn Signal through survival, progress, and goal achievement each turn.
- **Base Reward per Turn**: Automatically earn 1–3 Signal each turn (survival reward).
- **Report Rewards**: Signal and Memory Shards rewarded upon reaching an ending.

### 5.4 Consumption Policy

- **Text Turn**: Small amount (base).
- **Image Generation**: Medium to large amount (scene generation).
- **Image Editing**: Medium amount (proportional to edits/resolution).
- **Thinking Level High / Long Summary / Analysis Report**: Additional cost.

### 5.5 UX Requirements

- Show **estimated costs** (min/max) before an action and suggest alternatives (text-only/low-res) if balance is insufficient.
- Express currency consumption in a "game-like" way (e.g., "World signal is weakening... -12 Signal").

## 6. Core Features (MVP)

### 6.1 Agentic Game Master Engine

- Interprets user input (text/click) to update **WorldState**.
- Dynamically manages story progress (Intro/Development/Crisis/Climax/Ending).
- Returns output as a **structured result including UI, state, and costs**.
- **Multi-turn Context Preservation**: Maintained through conversation history and Gemini 3 Thought Signatures.

### 6.2 Automatic Structured UI Generation (Clickable World)

- Provides objects/hotspots via coordinates, making them clickable on the screen.
- Uses a **0–1000 normalized coordinate system** (compatible with image understanding bbox format).
- **Hotspot Generation Restriction**: Hotspots are generated **only through the "Deep Analysis" action** to ensure image-hotspot alignment.

### 6.3 Multimodal Rendering Pipeline

- Narrative description → (Conditional) Image generation/editing → UI overlay (hotspots).
- **Text-first Delivery + Lazy Loading**: Text and state panels update first; images load asynchronously to reduce perceived latency.
- **Late-binding Guards**: Ensures delayed images only reflect the turn/scene they were requested for.

### 6.4 Rule Mutation System

- Genres, physical laws, and meta-rules change based on player actions/triggers.
- Rules are explicitly recorded in the WorldState for consistent application in subsequent turns.

### 6.5 Dynamic Ending Generator

- Analyzes play logs to generate a **summary (text) + representative image + rule mutation timeline**.

### 6.6 Game Type Interaction/Feedback System

- **Action Deck**: Recommended actions presented as 3–6 cards per turn with costs and risk/reward hints.
- **Inventory + Drag & Drop**: Items displayed as slots/chips; drag items to scene hotspots to "use/combine/dismantle."
- **Quest/Objective Panel**: Tracks current goals and sub-objectives with reward feedback.
- **Economy HUD**: Always displays Signal/Shard balance and estimated/confirmed costs.
- **Scanner Slot (Multimodal Demo)**: Drag/upload real-world photos to convert them into in-game items or clues via vision analysis.

### 6.7 Agent Action Visibility (Action Queue / Self-Repair)

- **Action Queue + Progress UI**: Displays agent execution stages (Parse → Validate → Plan → Resolve → Render → Verify → Commit).
- **Self-Repair Trace**: Displays retry counts/results for schema failures, cost overruns, or safety blocks.
- **Validation Badges**: `Schema OK`, `Economy OK`, `Safety OK`, `Consistency OK`.
- **Model/Quality Labels**: User-friendly labels like `FAST`, `QUALITY`, `CHEAP`, `REF` to explain model selection without exposing prompts.

### 6.8 Demo Profiles (Essential for Reviewers)

- **Instant Play**: Start immediately by selecting a demo profile without registration.
- **Personas**: Three presets (Narrator, Explorer, Tech Enthusiast) with different starting states.
- **Pre-generated Images**: Instant display of the first scene image to eliminate initial generation delay.
- **Reset Policy**: One-button reset to the initial state for repeated demos.

## 7. Technical Design

### 7.1 Tech Stack

- **Backend**: FastAPI (async), HTTP Streaming (Fetch + POST).
- **Frontend**: React 19 + Vite 7 + Zustand.
- **GenAI**: Gemini 3 API (Google GenAI SDK).

### 7.2 Authentication

- **Gemini API Key managed via server environment variables**. No BYOK (Bring Your Own Key) required from users.

### 7.3 Structured Outputs (JSON Schema)

- Enforced via `response_mime_type: application/json` + `response_schema`.
- **Turn Stream Protocol**: NDJSON (newline-delimited JSON) events for `stage`, `badges`, `narrative_delta`, and `final`.

### 7.4 Image Generation & Understanding

- **Generation**: `gemini-3-pro-image-preview` for high-quality scenes.
- **Understanding**: `gemini-3-flash-preview` for Scanner and Agentic Vision (hotspot detection).
- **Coordinate Convention**: Bbox as `[ymin, xmin, ymax, xmax]` normalized to 0–1000.

## 8. Frontend UX/Style

- **CRT Terminal Retro Aesthetic**: Phosphorus green, glow, scanlines, and glitch effects.
- **Fixed Game Layout**: Prohibits messenger-style chat bubbles; text is expressed as a game log/narrative feed.
- **Responsive Policy**: Optimized for desktop (wide) and mobile (single column) environments.

## 9. Success Metrics

- **Engagement**: Average session duration > 15 minutes.
- **Performance**: API error rate < 1%, streaming TTFB < 2 seconds.
