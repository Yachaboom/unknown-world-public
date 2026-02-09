# [Unknown World] Technical Stack Guide (MVP)

- **Reference Documents**: `docs/prd.md`
- **Principles**: Avoid prompt-only wrappers, prioritize structured outputs (JSON Schema), and integrate cost/latency control.

## 1. Technical Stack Summary

- **Frontend (Web UI)**
  - React `19.2.3` / React DOM `19.2.3`
  - Vite `7.3.0` (Build/Bundle)
  - TypeScript `5.9.3`
  - Package Manager: **pnpm**
  - State Management: Zustand `5.0.9`
  - Schema Validation: Zod `4.3.4`
  - DnD: `@dnd-kit/core 6.3.1` + `@dnd-kit/sortable 10.0.0`
  - i18n: i18next `25.7.3` + react-i18next `16.5.1`

- **Backend (Orchestrator API)**
  - Python `3.14.0`
  - FastAPI `0.128.0` (Async)
  - Uvicorn `0.40.0` (ASGI)
  - Pydantic `2.12.5` (Validation/Serialization)

- **Dev Tools**
  - rembg `2.0.67` (Background removal, **Dev-only**)
  - nanobanana mcp (Asset production tool)

- **Streaming / Realtime**
  - HTTP Streaming (Fetch + POST): Turn requests → Streamed responses (Typewriter effect + Queue/Badges).

- **GenAI (Gemini API)**
  - Auth: **Gemini API Key** (Server-side environment variables).
  - SDK: `google-genai 1.60.0` (Python).
  - **Models**
    - Text: `gemini-3-pro-preview` (QUALITY), `gemini-3-flash-preview` (FAST).
    - Image: `gemini-3-pro-image-preview` (EDIT/QUALITY), `gemini-2.5-flash-image` (FAST PREVIEW).
    - Vision: `gemini-3-flash-preview` (Bbox/Segmentation).

- **Infra**
  - Container: Docker.
  - Runtime: Node.js `24.12.0` (Frontend build), Python `3.14.0` (Backend).
  - Deployment: Cloud Run.

## 2. Technology Choice Matrix

| Requirement | Choice | Reason |
| --- | --- | --- |
| Typewriter Streaming | FastAPI + HTTP Streaming | Request-Response/POST essential |
| Non-chat Game UI | React + State Separation | High-fidelity UI |
| Structured Processing | JSON Schema | Mechanical parsing/validation |
| Schema Repair Loop | Pydantic + Zod + Repair loop | Failure resilience |
| Clickable Hotspots | 0–1000 Normalization | Vision Bbox compatibility |
| Multimodal Upload | Gemini Vision + Files API | Core multimodal capability |

## 3. Risk Summary

- **LLM Instability**: Mitigated by JSON Schema enforcement + Dual validation (Server/Client) + Auto-repair + Safe fallbacks.
- **Latency/Cost**: Controlled via currency system + Model tiering (Flash/Pro) + Asynchronous lazy image loading.
- **Quota/Rate Limits**: Automatic Pro → Flash model switching with countdown-based retry UI.
