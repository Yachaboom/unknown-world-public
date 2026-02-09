# Unknown World — Technology Stack Guide

> **Principles**: Avoid prompt-only wrappers (state/orchestrator/artifacts required), structured outputs (JSON Schema) first, built-in cost & latency control.
> **Version baseline**: 2026-01-01 (all versions pinned via lockfiles)

## 1. Stack Overview

### Frontend (Web UI)

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.3 | UI framework |
| React DOM | 19.2.3 | DOM rendering |
| Vite | 7.3.0 | Build & bundle |
| TypeScript | 5.9.3 | Type safety |
| pnpm | 10.27.0 | Package manager (`pnpm-lock.yaml`) |
| Zustand | 5.0.9 | State management (WorldState/Inventory/UI/Economy) |
| Zod | 4.3.4 | TurnOutput JSON validation (client-side) |
| @dnd-kit/core | 6.3.1 | Drag and drop framework |
| @dnd-kit/sortable | 10.0.0 | Sortable DnD utilities |
| i18next | 25.7.3 | Internationalization |
| react-i18next | 16.5.1 | React i18n integration |

### Backend (Orchestrator API)

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.14.0 | Runtime |
| FastAPI | 0.128.0 | Async web framework |
| Uvicorn | 0.40.0 | ASGI server |
| Pydantic | 2.12.5 | Schema validation & serialization |

### Streaming / Realtime

- **HTTP Streaming** (Fetch + POST): Turn request (POST body) → response streamed (typewriter effect + Queue/Badges)
- WebSocket reserved for future bi-directional real-time interactions

### GenAI (Gemini API)

| Component | Details |
|-----------|---------|
| Authentication | **Gemini API Key** (server-side environment variable only) |
| SDK | Google GenAI SDK (Python) `1.60.0` |
| Text (FAST) | `gemini-3-flash-preview` |
| Text (QUALITY) | `gemini-3-pro-preview` |
| Image (QUALITY) | `gemini-3-pro-image-preview` (generation/editing, default) |
| Image (FAST) | `gemini-2.5-flash-image` (low-latency preview/draft) |
| Vision/Spatial | `gemini-3-flash-preview` (bbox/segmentation) |

### Infrastructure

| Component | Details |
|-----------|---------|
| Container | Docker |
| Node.js | 24.12.0 (frontend build) |
| Python | 3.14.0 (backend runtime) |
| Deployment | Cloud Run (recommended) / Local development |

### Demo Access

- 3 demo profiles (persona-based presets) for immediate play
- No login/signup required — "select profile → start" in under 10 seconds

## 2. Technology Decision Matrix

| PRD Requirement | Technology | Key Reason |
|-----------------|-----------|------------|
| Text "typewriter" streaming | FastAPI + HTTP Streaming (POST) | Request-response / POST required |
| "Not a chat app" game UI | React + state separation | High-fidelity UI |
| Mechanical UI/state/cost processing | Structured Outputs (JSON Schema) | Forced parsing & validation |
| Auto-repair on schema failure | Pydantic + Zod + Repair loop | Fault tolerance |
| Clickable hotspot coordinates | 0–1000 normalization | Vision bbox compatibility |
| Inventory Drag & Drop | dnd-kit | Accessibility & control |
| ko/en dual-language support | i18next | Instant toggle |
| Instant reviewer/demo access | Demo profiles (preset users) | 10-second onboarding |
| Selective image generation/editing | `gemini-3-pro-image-preview` | Editing & consistency priority |
| Image upload → item/clue extraction | Gemini Vision + Files API | Multimodal core |
| API key security | Gemini API Key (server-managed) | Simplified operations |

## 3. Alternative Technology Comparisons

| Decision | Choice | Alternative | Rationale |
|----------|--------|-------------|-----------|
| Frontend framework | Vite | Next.js (App Router) | MVP prioritizes fast iteration + fixed layout over SSR/routing complexity |
| Backend framework | FastAPI (Python) | NestJS (Node) | Orchestration/validation/schema implementation faster with Python + FastAPI |
| Real-time protocol | HTTP Streaming | WebSocket | Current needs are "turn request-response + streaming"; WS reserved for expansion |
| State management | Zustand | Redux Toolkit | Team velocity priority → lower learning curve |
| Styling approach | CSS Variables (single CSS) | Tailwind | Style guide demands CRT variables/glow → CSS variables fit better |

## 4. Code Quality Tools

### Frontend

| Tool | Version |
|------|---------|
| ESLint | 9.39.2 |
| @eslint/js | 9.39.2 |
| typescript-eslint | 8.51.0 |
| eslint-plugin-react | 7.37.5 |
| eslint-plugin-react-hooks | 7.0.1 |
| eslint-plugin-unused-imports | 4.3.0 |
| eslint-config-prettier | 10.1.8 |
| Prettier | 3.7.4 |

### Backend

| Tool | Version |
|------|---------|
| Ruff | 0.14.10 |
| Pyright | 1.1.407 |

## 5. Risk Summary

| Risk | Mitigation |
|------|------------|
| LLM output instability (schema/consistency) | JSON Schema enforcement + server/client dual validation + auto repair + safe fallback (text-only) |
| Cost/latency (especially image/Thinking) | Resource economy for call control + text model tiering (Flash/Pro) + image frequency/resolution policy + lazy image loading |
| Gemini 3 constraints + demo feature exposure | Official SDK usage + tool design separation + demo profiles active only in demo/staging |

## 6. Quick Start

```bash
# Frontend (Port: 8001)
pnpm -C frontend install && pnpm -C frontend dev
# → http://localhost:8001

# Backend (Port: 8011)
cd backend && cp .env.example .env && uv sync
uv run uvicorn unknown_world.main:app --reload --port 8011
# → http://localhost:8011/health
```

## 7. References

- **Frontend**: [React](https://react.dev/) · [Vite](https://vitejs.dev/) · [TypeScript](https://www.typescriptlang.org/) · [Zod](https://zod.dev/) · [Zustand](https://zustand-demo.pmnd.rs/) · [dnd-kit](https://docs.dndkit.com/) · [i18next](https://www.i18next.com/)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/) · [Uvicorn](https://www.uvicorn.org/) · [Pydantic](https://docs.pydantic.dev/)
- **Gemini**: [Gemini API](https://ai.google.dev/docs) · [Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output) · [Image Generation](https://ai.google.dev/gemini-api/docs/image-generation) · [Image Understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
