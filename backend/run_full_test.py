"""정확한 재현: uvicorn CLI처럼 서버를 시작하고 테스트합니다."""
import subprocess
import time
import json
import sys
import httpx
import signal
import os

def main():
    # 서버 시작 (사용자와 동일한 명령어)
    env = os.environ.copy()
    proc = subprocess.Popen(
        ["uv", "run", "uvicorn", "src.unknown_world.main:app",
         "--host", "0.0.0.0", "--port", "8011"],
        cwd=r"D:\Dev\unknown-world\backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
    )
    print(f"Server PID: {proc.pid}")

    # 서버 시작 대기
    for i in range(15):
        time.sleep(1)
        try:
            r = httpx.get("http://localhost:8011/health", timeout=2.0)
            if r.status_code == 200:
                print(f"Server ready after {i+1}s")
                break
        except Exception:
            pass
    else:
        print("Server failed to start!")
        proc.terminate()
        stderr = proc.stderr.read().decode("utf-8", errors="replace")
        print(f"STDERR:\n{stderr[:2000]}")
        return

    # API 테스트
    print("\n=== API Test ===")
    try:
        r = httpx.post("http://localhost:8011/api/turn", json={
            "language": "ko-KR",
            "text": "문을 열어본다",
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
                print(f"  FINAL badges={fc.get('badges')} repair={fc.get('repair_count')}")
                print(f"  NARRATIVE: {narr}")
            elif t == "error":
                print(f"  ERROR: {d.get('message')} code={d.get('code')}")
    except Exception as e:
        print(f"  EXCEPTION: {e}")

    # 서버 stderr 출력 (디버그 로그 포함)
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()

    stderr = proc.stderr.read().decode("utf-8", errors="replace")
    print(f"\n=== Server STDERR (last 3000 chars) ===")
    print(stderr[-3000:])


if __name__ == "__main__":
    main()
