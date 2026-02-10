# Unknown World — Demo Video Script (3 min)

## Overview

**Title**: Unknown World — Gemini 3 Hackathon Demo  
**Duration**: 3:00 (max)  
**Resolution**: FHD 1920×1080  
**Language**: English subtitles (YouTube CC, SRT file)  
**Demo URL**: https://unknown-world-frontend-676511950590.us-central1.run.app  
**GitHub**: https://github.com/Yachaboom/unknown-world-public

---

## Timeline

### [0:00–0:20] Introduction (20s)

**Subtitle**: "Unknown World — An infinite generative roguelike powered by Gemini"

- Open the demo URL — profile selection screen appears
- Show 3 profiles: Narrator / Explorer / Tech Expert
- **Subtitle**: "Select a character profile to begin. No login required."
- Click **Explorer** profile
- Game loads: Scene Canvas + CRT theme UI
- Wait 2s — first impression of the game layout

**Key visuals**: CRT green glow, profile cards, instant game entry

---

### [0:20–0:50] Scenario 1: Free-Text Input (30s)

**Subtitle**: "Scenario 1: Free-text input drives the narrative forward."

- Click on the text input field at the bottom
- Type: `I look around carefully`
- Click **EXECUTE** (or press Enter)
- Observe:
  - Agent Console: Pipeline phases activate (Parse → Validate → Plan → Execute → Verify)
  - Narrative Feed: Text streams in real-time (typing effect)
  - Scene Canvas: New scene image generates (loading → render)
- **Subtitle**: "The narrative streams in real-time via structured JSON output."
- Wait 3s — appreciate the generated scene image

**Key visuals**: Streaming text, Agent Console pipeline, scene image generation

---

### [0:50–1:15] Scenario 2: Photo Upload → Item Acquisition (25s)

**Subtitle**: "Scenario 2: Upload a photo — Gemini Vision turns it into an in-game item."

- Locate the **SCANNER** panel (right sidebar, bottom)
- Click the scanner dropzone ("Drop image or click to upload")
- Upload `vibe/ref/sample/test.png` (golden compass image)
- Observe:
  - Scanner shows loading/analyzing state
  - **Gemini Vision** analyzes the image → generates caption
  - Scanner result appears with candidate item
  - Click "Add to inventory" button
- **Subtitle**: "The scanned object is now in your inventory."
- Check Inventory panel: new item appears
- Check Economy HUD: Signal/Shard balance may change
- Wait 2s — confirm item acquisition

**Key visuals**: Scanner upload flow, Gemini Vision analysis, inventory update

---

### [1:15–1:45] Scenario 3: Investigate → Hotspot Click (30s)

**Subtitle**: "Scenario 3: 'Investigate' — Gemini Agent Vision analyzes the scene."

- Click **INVESTIGATE** action card in the Action Deck (bottom bar)
- Observe:
  - Agent Console activates: Pipeline phases display
  - **Gemini Agent Vision** analyzes the current scene
  - Hotspots (interactive circles) appear on Scene Canvas
- **Subtitle**: "AI-generated hotspots appear. Click one to interact."
- Wait 2s — highlight the hotspot generation
- Click a hotspot on the Scene Canvas
- Observe:
  - Turn progresses with interaction result
  - Narrative text streams in
  - Scene may update
- Wait 3s — appreciate the result

**Key visuals**: Investigate action, hotspot circles on scene, click interaction

---

### [1:45–2:15] Scenario 4: Investigate → Item Drag & Drop (30s)

**Subtitle**: "Scenario 4: Drag an inventory item onto a hotspot to combine."

- Click **INVESTIGATE** action card again
- Wait for new hotspots to generate on Scene Canvas
- Locate an inventory item in the left sidebar
- Drag the inventory item onto a hotspot on Scene Canvas
- Observe:
  - Item-environment interaction triggers
  - Narrative describes the combination result
  - Economy HUD: Signal/Shard balance changes
- **Subtitle**: "Item-environment interaction powered by structured outputs."
- Wait 3s — observe the complete interaction flow

**Key visuals**: Drag & drop from inventory to hotspot, combined interaction result

---

### [2:15–2:35] Technical Highlights (20s)

**Subtitle**: "Agent Console shows the live orchestration pipeline."

- Focus on Agent Console (right sidebar, top)
  - Pipeline stages: Parse → Validate → Plan → Execute → Verify
  - Validation badges: Schema OK, Economy OK, Safety OK
  - Model label display
- **Subtitle**: "Powered by Gemini: Structured Outputs + Image Generation + Vision."
- Show Economy HUD: Signal/Shard balances, Resource Log
- Wait 3s — allow viewer to absorb technical details

**Key visuals**: Agent Console phases, validation badges, economy tracking

---

### [2:35–2:52] Scenario 5: Ending Session Report (17s)

**Subtitle**: "Scenario 5: Session report — journey summary, timeline, economy ledger."

- Click **END SESSION** button in the header
- Observe:
  - Ending report modal appears
  - Journey summary section
  - Timeline of events
  - Economy ledger / resource history
- Wait 5s — let viewer read the report
- Note: Replay option available

**Key visuals**: Session report modal, journey summary, timeline, economy breakdown

---

### [2:52–3:00] Closing (8s)

**Subtitle**: "Not a chat wrapper — a stateful game system. Try it live ▸"

- Show the current game state (full UI visible)
- Overlay info (in subtitle):
  - Demo link: https://unknown-world-frontend-676511950590.us-central1.run.app
  - GitHub: https://github.com/Yachaboom/unknown-world-public
- Wait 3s — final impression

---

## Subtitle Design Principles

- **YouTube CC only** — no burn-in; SRT uploaded separately
- **Minimalist** — 10–15 subtitles total; one-line guidance per scene
- **No repetition** — don't subtitle what's already visible in the UI
- **Style** — concise present-tense English; official tech terms (Gemini, Structured Outputs)

## Security Checklist

- [ ] No API keys visible in browser URL bar or console
- [ ] No raw prompt text shown in Agent Console (only meta/labels)
- [ ] No sensitive environment variables exposed
- [ ] Game narrative is appropriate (no offensive content)

## Recording Notes

- Playwright automation with `slowMo: 300` for visual readability
- Multi-take recording (3+ takes) — select best LLM response
- FHD 1920×1080 viewport and video output
- ffmpeg post-processing for speed adjustment to fit 3 minutes
