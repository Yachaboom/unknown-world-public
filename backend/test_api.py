import httpx, json
r = httpx.post("http://localhost:8011/api/turn", json={
    "language": "ko-KR", "text": "문을 열어본다",
    "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
    "economy_snapshot": {"signal": 100, "memory_shard": 5},
}, timeout=30.0)
for line in r.text.strip().split("\n"):
    d = json.loads(line)
    t = d.get("type")
    if t in ("repair","badges","error","final"):
        if t == "final":
            fc = d.get("data",{}).get("agent_console",{})
            print(f"{t}: badges={fc.get('badges')} repair={fc.get('repair_count')}")
        else:
            print(f"{t}: {json.dumps(d, ensure_ascii=False)}")
