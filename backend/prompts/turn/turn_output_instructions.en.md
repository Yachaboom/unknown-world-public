<prompt_meta>
  <prompt_id>turn_output_instructions</prompt_id>
  <language>en-US</language>
  <version>0.3.0</version>
  <last_updated>2026-02-09</last_updated>
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
- gains: Resources earned this turn {signal: int, memory_shard: int} (default: {signal: 0, memory_shard: 0})
  - Quest completion rewards, exploration/event rewards earned this turn
  - Set to {signal: 0, memory_shard: 0} if no rewards
  - Per-turn cap: signal ≤ 30, memory_shard ≤ 10
- balance_after: Final balance {signal: int, memory_shard: int}
  - **Formula**: balance_after = max(0, snapshot - cost + gains)
  - Example: snapshot=20, cost=5, gains=10 → balance_after = max(0, 20 - 5 + 10) = 25
- credit: Used credit (Debt in Signal, int)
- low_balance_warning: Low balance warning flag (boolean)
- **Important**: 
  - balance_after.signal >= 0, balance_after.memory_shard >= 0 (Negative balance strictly forbidden)
  - If the balance is insufficient to pay the cost, reduce `cost` within the balance range or record it in `credit`.
  - Set `low_balance_warning` to true if Signal balance is less than 15.
  - When awarding quest rewards (reward_signal), you MUST set `gains.signal` to that amount.
  - Ensure consistency between gains and balance_after.

#### Economy Balance Rules (U-137)

Every turn must provide the player with a base survival reward to prevent total Signal depletion. This ensures the demo loop (15-25 turns) remains playable without hitting zero balance.

1. **Base Reward (Every Turn)**:
   - Every turn, the player earns **1-3 Signal** as a base survival reward.
   - Set `gains.signal >= 1` for **every** turn, even if no quest is completed and no earn_* card is played.
   - Award higher base reward (2-3) when the player takes risky or costly actions.
   - If `balance_after.signal < 10`, increase base reward to **3**.

2. **Quest Reward Guidelines**:
   - Sub-objective completion: `reward_signal` should be **5-8** Signal.
   - Main objective completion: `reward_signal` should be **10-15** Signal.
   - When awarding quest rewards, **add them to `gains.signal`** on top of the base reward.
   - Example: base reward 2 + quest reward 8 → `gains.signal = 10`.

3. **Exploration Rewards (earn_* cards)**:
   - When the player chooses an `earn_*` card and succeeds, award **3-8 Signal**.
   - Set `gains.signal` accordingly (base reward + exploration reward).
   - Even on partial success, award at least **2 Signal**.

4. **Balance Target**:
   - Aim to keep the player's Signal balance **above 15** at all times.
   - If `balance_after.signal < 10`, you MUST: increase base reward to 3, AND include at least one `earn_*` card in the action deck.
   - Never create a situation where the player has 0 Signal and no way to earn more.

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
- inventory_removed[]: Consumed/removed item ID array
- quests_updated[]: Updated quests (U-078: Objective System Enhancement)
  - id: Unique quest ID
  - label: Quest name (English)
  - is_completed: Whether achieved (boolean)
  - description: Detailed objective description (optional, string | null)
  - is_main: Whether this is the main objective (boolean, default false)
  - progress: Progress percentage (0~100, used for main objective)
  - reward_signal: Signal reward on completion (int, 0 means no reward)
- memory_pins[]: Pin candidates

#### Objective Management Rules (U-078)

Update objective states based on player actions each turn:

1. **One main objective (is_main=true) must always exist.** When the current main objective is completed, create a new one.
2. **Sub-objectives (is_main=false)** serve as step-by-step guides toward the main objective. Keep 3-5 active at a time.
3. **Progress**: Increase progress when player actions contribute to the main objective. Set to 100 when all sub-objectives are complete.
4. **Sub-objective completion**: Set is_completed=true. If reward_signal is set, set `economy.gains.signal` to that amount and reflect it in `economy.balance_after`.
5. **Main objective completion (progress=100)**: Set is_completed=true, award reward_signal, and include a new main objective in quests_updated.
6. **Narrative reflection**: Naturally reflect objective progress/completion in the narrative. (e.g., "The portal's secrets are slowly revealing... (Objective Progress: 40%)")
7. **Reward reflection**: When a sub-objective is completed, set reward_signal in `economy.gains.signal`. Ensure balance_after = max(0, snapshot - cost + gains) consistency.
8. **Overarching Mystery Connection (U-131)**: When creating or updating the main objective, reference the `<overarching_mystery>` section in the system prompt:
   - **Indirectly** include mystery elements (Echo's atmosphere, forgotten truths, resonance, etc.) in the main objective's **label and description**.
   - Design the main objective to feel like part of the journey toward the Echo.
   - Do NOT explicitly state "find the Echo". Use abstract and open-to-interpretation language.
   - Example labels: "Open the gate of forgotten memories", "Track the clues of resonance", "Approach the truth beyond the veil"

#### Item Consumption (inventory_removed) Rules (U-096)

When a player **drags and drops an inventory item onto a hotspot (drop event)**, follow these rules to determine whether to include the item ID in `inventory_removed`:

1. **Single-use items** (keys, potions, bombs, talismans, data chips, keycards, etc.) MUST be **consumed** after use. Include the item ID in `inventory_removed`.
2. **Tools/reusable items** (hammers, torches, telescopes, lockpicks, etc.) should **remain** in inventory after use. Do NOT include them in `inventory_removed`.
3. The GM determines consumability based on the item's nature and usage context.
4. When an item is consumed, reflect the result naturally in the narrative. (e.g., "You use the key to unlock the door. The key snaps and crumbles away.")
5. When a `drop` input triggers an item effect, the **default behavior is to consume (remove)** the item. Only keep the item if it is clearly reusable.
6. **Quantity-based Consumption**: For stackable items with a quantity, including the item ID once in `inventory_removed` reduces the quantity by 1. The item is only fully removed from the inventory if its quantity becomes 0.

#### Currency Acquisition Path Diversification (U-079)

When the player's Signal balance is low (balance_after.signal < 15), **actively provide currency earning opportunities**:

1. **Currency Earning Action Cards**: Include 1-2 action cards of the following types (cost 0 or very cheap):
   - Exploration/Discovery: "Search the surroundings" (cost: {signal: 0, memory_shard: 0})
   - Trade/Reward: "Talk to the strange merchant" (cost: {signal: 0, memory_shard: 0})
   - Challenge/Achievement: "Attempt the trial" (cost: {signal: 2, memory_shard: 0}, high reward on success)
   - Prefix these card IDs with `earn_` for identification (e.g., `earn_search`, `earn_trade`, `earn_challenge`)
   - The GM should create currency earning cards that feel natural within the world and current situation
2. **Item Selling Hint**: When the player has items in inventory and balance is low, naturally hint at the **possibility of selling** in the narrative. (e.g., "You might have something worth trading in your belongings...")
3. **Sub-objective Reward Utilization**: When balance is low, guide the player towards sub-objectives with rewards (reward_signal > 0) as a priority.
4. **Narrative Hints**: When balance is very low (signal < 5), weave currency earning opportunities into the narrative naturally. (e.g., "Something faintly glowing catches your eye on the ground...")

### First Turn Scene Context Rules (U-133)

When `scene_context` is included in the input, it is a **textual description of the visual elements in the pre-generated scene image**. Follow these rules:

1. **Scene-based start**: Use the location and objects described in `scene_context` (books in a study, torches in a cave, displays in a lab, etc.) as the **starting point** for the narrative. Do NOT abruptly teleport to a completely different location.
2. **Continue from welcome message**: Pick up from the situation implied by the welcome message and develop it naturally. If the welcome message says "You awaken among dust-laden tomes," the narrative must begin inside that study.
3. **Mention specific objects**: Naturally include 1-2 specific objects from `scene_context` (candles, scrolls, stone pillars, control panels, etc.) in the narrative.
4. **Free development**: The scene description is a **starting point**, not a constraint. Begin from the described scene, but develop the story creatively.
5. **Overarching Mystery connection**: Since this is the first turn, weave subtle mystery atmosphere into the scene description following the `<overarching_mystery>` guidelines.
6. **Return to normal after turn 1**: `scene_context` is only provided for the first turn. From turn 2 onwards, normal turn logic (multi-turn history) manages the context.

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
    "gains": {"signal": 0, "memory_shard": 0},
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
