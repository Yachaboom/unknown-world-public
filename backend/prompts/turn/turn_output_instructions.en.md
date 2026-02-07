<prompt_meta>
  <prompt_id>turn_output_instructions</prompt_id>
  <language>en-US</language>
  <version>0.2.0</version>
  <last_updated>2026-01-28</last_updated>
  <policy_preset>default</policy_preset>
</prompt_meta>

<prompt_body>
## Purpose

Specify the rules for each field in the TurnOutput JSON schema.

---

## Required Fields (Hard Gate)

### language
- Value: "en-US" (fixed to match input)
- No mixed language output

### narrative
- Type: string (required)
- Narrative text shown to the player
- 2-3 sentences, written in English
- Present tense, address as "you"

### economy
- Type: object (required)
- cost: Resources consumed this turn {signal: int, memory_shard: int}
- balance_after: Balance after consumption {signal: int, memory_shard: int}
- **Important**: balance_after.signal >= 0, balance_after.memory_shard >= 0

### safety
- Type: object (required)
- blocked: boolean (whether blocked by safety policy)
- message: string | null (message to display when blocked)

---

## Optional Fields

### ui
- action_deck.cards[]: Action card array (3-6 recommended)
  - id: Unique card ID
  - label: Display label (English)
  - cost: {signal, memory_shard}
  - risk: "low" | "medium" | "high"
  - enabled: boolean
  - is_alternative: boolean (low-cost alternative flag)
- **Precise Analysis Card (U-076)**: When a scene image is present, you MUST include this card:
  - id: "deep_analyze"
  - label: "Precise Analysis"
  - cost: 1.5x the base signal cost (rounded up to integer)
  - risk: "low"
  - enabled: true
  - is_alternative: false
  - Only include this card when the scene has an image
  - Do NOT include this card when there is no image
- objects[]: Clickable scene objects
  - box_2d: {ymin, xmin, ymax, xmax} (0-1000 normalized coordinates)
- **Hotspot (objects) Generation Policy (U-090)**:
  - In normal turns, **NEVER add new objects** to the `objects` array. Always set it to an empty array (`[]`).
  - Hotspots/clickable objects are **ONLY created through the "Precise Analysis" action** on the server side.
  - The GM must NOT fabricate or imagine hotspot coordinates.
  - Previously discovered objects (from prior analysis) are automatically preserved on the client until the scene changes.

### world
- rules_changed[]: Changed world rules
- inventory_added[]: Added item information (U-075[Mvp])
  - id: Unique item ID
  - label: Display label (English)
  - description: Item description (for icon generation)
  - quantity: Quantity (default 1)
- inventory_removed[]: Removed item IDs
- quests_updated[]: Updated quests
- memory_pins[]: Pin candidates

### render
- image_job: Image generation job (optional)
  - should_generate: boolean
  - prompt: Image prompt (English preferred)

### agent_console
- current_phase: Current phase
- badges[]: Validation badges
- repair_count: Number of repair attempts

---

## Coordinate Convention (RULE-009)

- All coordinates use 0-1000 normalized coordinate system
- bbox order: [ymin, xmin, ymax, xmax]
- Do not use pixel coordinates

---

## Example Output

```json
{
  "language": "en-US",
  "narrative": "The old door creaks open. Cold air rushes out from within.",
  "economy": {
    "cost": {"signal": 5, "memory_shard": 0},
    "balance_after": {"signal": 95, "memory_shard": 5}
  },
  "safety": {"blocked": false, "message": null},
  "ui": {
    "action_deck": {
      "cards": [
        {"id": "enter", "label": "Step inside", "cost": {"signal": 10, "memory_shard": 0}, "risk": "medium", "enabled": true, "is_alternative": false},
        {"id": "peek", "label": "Peek cautiously", "cost": {"signal": 3, "memory_shard": 0}, "risk": "low", "enabled": true, "is_alternative": true}
      ]
    },
    "objects": []
  },
  "world": {
    "rules_changed": [],
    "inventory_added": [
      {
        "id": "iron_key",
        "label": "Iron Key",
        "description": "A heavy, rusted iron key.",
        "quantity": 1
      }
    ],
    "inventory_removed": [],
    "quests_updated": [],
    "memory_pins": []
  },
  "render": {"image_job": null},
  "agent_console": {"current_phase": "commit", "badges": ["schema_ok", "economy_ok", "safety_ok"], "repair_count": 0}
}
```
</prompt_body>
