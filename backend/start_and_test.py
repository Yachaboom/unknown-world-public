"""서버를 직접 시작하고, 요청을 보내고, 종료합니다."""
import asyncio
import json
import sys
import os
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

import httpx
import uvicorn
from multiprocessing import Process


def run_server():
    """서버 프로세스."""
    uvicorn.run(
        "src.unknown_world.main:app",
        host="0.0.0.0",
        port=8011,
        log_level="warning",
    )


def test_api():
    """API 테스트."""
    time.sleep(4)  # 서버 시작 대기

    print("=== Testing API ===")
    try:
        r = httpx.post("http://localhost:8011/api/turn", json={
            "language": "ko-KR", "text": "문을 열어본다",
            "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
            "economy_snapshot": {"signal": 100, "memory_shard": 5},
        }, timeout=60.0)

        for line in r.text.strip().split("\n"):
            d = json.loads(line)
            t = d.get("type")
            if t == "repair":
                print(f"  REPAIR: attempt={d.get('attempt')} msg={d.get('message')}")
            elif t == "badges":
                print(f"  BADGES: {d.get('badges')}")
            elif t == "final":
                fc = d.get("data", {}).get("agent_console", {})
                narr = d.get("data", {}).get("narrative", "")[:80]
                print(f"  FINAL: badges={fc.get('badges')} repair={fc.get('repair_count')}")
                print(f"  NARRATIVE: {narr}")
            elif t == "error":
                print(f"  ERROR: {d.get('message')} code={d.get('code')}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")


if __name__ == "__main__":
    server = Process(target=run_server, daemon=True)
    server.start()
    print(f"Server PID: {server.pid}")

    try:
        test_api()
    finally:
        server.terminate()
        server.join(timeout=5)
        print("\nServer stopped.")
