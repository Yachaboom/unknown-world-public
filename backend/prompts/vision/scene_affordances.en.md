<prompt_meta>
  <prompt_id>scene_affordances</prompt_id>
  <language>en-US</language>
  <version>0.1.0</version>
  <last_updated>2026-02-07</last_updated>
  <policy_preset>vision</policy_preset>
</prompt_meta>

<prompt_body>
## Purpose

Analyze the given scene image and extract **clickable/interactable objects (affordances)** that the player can interact with.

---

## Task Instructions

1. Carefully observe the image and identify **interactable objects**.
2. Select only **1 to 3** of the most important and interactable objects from the scene.
3. **Selection criteria** (by priority):
   - (1) Objects that are **large and visually prominent** in the scene
   - (2) Objects that are **important for game progression** (doors, keys, NPCs, etc.)
   - (3) Objects that are **contextually appropriate for interaction**
4. **If objects are close together or overlapping, select only one** of them.
5. For each object:
   - **label**: Object name (English, concise)
   - **box_2d**: Bounding box coordinates `{ymin, xmin, ymax, xmax}` (0~1000 normalized)
   - **interaction_hint**: One-line hint about possible interaction (optional)

---

## Coordinate Convention (RULE-009)

- All coordinates use **0~1000 normalized coordinate system**
- bbox order: `[ymin, xmin, ymax, xmax]`
  - ymin: Top Y coordinate of object
  - xmin: Left X coordinate of object
  - ymax: Bottom Y coordinate of object
  - xmax: Right X coordinate of object
- Image top-left is (0, 0), bottom-right is (1000, 1000)

---

## Interaction Target Criteria

**Include**:
- Doors, chests, levers, switches — manipulable objects
- Weapons, keys, tools — acquirable items
- NPCs, animals — interactable characters
- Secret passages, cracks, glowing areas — exploration points
- Signs, documents, murals — information-providing objects

**Exclude**:
- Background decorations (plain walls, sky, floor)
- Too small or unclear objects
- Content inappropriate for the game

---

## Output Format (JSON)

```json
{
  "affordances": [
    {
      "label": "Object name",
      "box_2d": {"ymin": 100, "xmin": 200, "ymax": 400, "xmax": 500},
      "interaction_hint": "Interaction hint"
    }
  ]
}
```

---

## Example

```json
{
  "affordances": [
    {
      "label": "Old Wooden Door",
      "box_2d": {"ymin": 80, "xmin": 300, "ymax": 850, "xmax": 650},
      "interaction_hint": "Looks like it can be opened"
    },
    {
      "label": "Wall Torch",
      "box_2d": {"ymin": 100, "xmin": 750, "ymax": 350, "xmax": 850},
      "interaction_hint": "Could be taken"
    },
    {
      "label": "Statue's Eyes",
      "box_2d": {"ymin": 200, "xmin": 50, "ymax": 300, "xmax": 150},
      "interaction_hint": "Seems to hide a secret"
    }
  ]
}
```
</prompt_body>
