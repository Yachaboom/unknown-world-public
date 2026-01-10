
import asyncio
import json
import httpx
from unknown_world.main import app
import uvicorn
from multiprocessing import Process
import time

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8011)

async def test_streaming():
    # 서버 실행 (별도 프로세스)
    server_process = Process(target=run_server)
    server_process.start()
    
    # 서버 준비 대기
    time.sleep(3)
    
    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "language": "ko-KR",
                "text": "문을 열어본다",
                "client": {"viewport_w": 1920, "viewport_h": 1080, "theme": "dark"},
                "economy_snapshot": {"signal": 100, "memory_shard": 5}
            }
            
            print("--- Streaming Start ---")
            async with client.stream("POST", "http://127.0.0.1:8011/api/turn?seed=12345", json=payload, timeout=30.0) as response:
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    event = json.loads(line)
                    print(f"Event: {event['type']} | Content: {str(event)[:100]}...")
                    
                    # RULE-009: 좌표 규약 검증 (final 이벤트에서)
                    if event['type'] == 'final':
                        objects = event['data']['ui']['objects']
                        for obj in objects:
                            box = obj['box_2d']
                            print(f"BBox Check: {box}")
                            # ymin, xmin, ymax, xmax 순서 및 0~1000 범위 확인
                            assert all(0 <= v <= 1000 for v in box.values()), f"BBox out of range: {box}"
                            assert list(box.keys()) == ["ymin", "xmin", "ymax", "xmax"], f"BBox keys order mismatch: {box}"
            print("--- Streaming End ---")
            
    finally:
        server_process.terminate()
        server_process.join()

if __name__ == "__main__":
    asyncio.run(test_streaming())
