# U-016 GenAI 클라이언트 실행 가이드

## 1. 개요

Vertex AI 서비스 계정 인증 기반의 `google-genai` 클라이언트 래퍼를 구현했습니다.
이 런북은 **`.env` 파일을 통한 환경 변수 설정**과 **실제 사양 모델(Gemini 3)**을 이용한 테스트 방법을 안내합니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-003[Mvp] (FastAPI 백엔드 골격)
- 서비스 계정 키 파일: `unknown-world-key-dev.key`

---

## 2. 환경 변수 및 .env 설정

백엔드 루트(`backend/`) 디렉토리에 `.env` 파일을 생성하거나 수정하여 아래 변수들을 설정하세요.

### 2.1 주요 환경 변수 상세 안내

| 환경 변수 | 권장 값 / 예시 | 설명 |
| :--- | :--- | :--- |
| `UW_MODE` | `real` 또는 `mock` | 클라이언트 동작 모드. 실제 API 호출 시 `real`, 로컬 테스트 시 `mock` 설정. |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./unknown-world-key-dev.key` | GCP 서비스 계정 키 파일의 경로. (상대/절대 경로 모두 가능) |
| `VERTEX_PROJECT` | (프로젝트 ID) | 사용할 GCP 프로젝트 ID. 설정하지 않으면 키 파일에서 자동 추출. |
| `VERTEX_LOCATION` | `global` | Vertex AI 서비스 지역. **Gemini 3 프리뷰 모델은 `global` 설정을 권장합니다.** |

### 2.2 .env 파일 예시

```bash
# backend/.env
UW_MODE=real
GOOGLE_APPLICATION_CREDENTIALS=./unknown-world-key-dev.key
VERTEX_PROJECT=your-project-id
VERTEX_LOCATION=global
```

---

## 3. 사전 준비

### 3.1 패키지 설치

```bash
cd backend
uv sync
# 스크립트에서 .env를 명시적으로 로드하려면 python-dotenv가 필요할 수 있습니다.
uv add python-dotenv
```

### 3.2 설정 확인

```bash
cd backend
uv run python -c "
import os
from dotenv import load_dotenv
load_dotenv()

# .env 로드 여부 및 변수 확인
mode = os.environ.get('UW_MODE', 'Not set')
cred = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'Not set')
loc = os.environ.get('VERTEX_LOCATION', 'Not set')

print(f'UW_MODE: {mode}')
print(f'LOCATION: {loc}')
print(f'CREDENTIALS: {cred}')
print(f'Key File Exists: {os.path.exists(cred) if cred != \"Not set\" else \"N/A\"}')
"
```

---

## 4. 모델 사양 및 상수 확인 (SSOT 검증)

**목적**: `tech-stack.md` 기준 모델 ID가 올바르게 고정되었는지 확인합니다.

```bash
cd backend
uv run python -c "
from unknown_world.config import MODEL_FAST, MODEL_QUALITY, MODEL_IMAGE, ModelLabel, get_model_id

print('=== 모델 상수 (tech-stack SSOT) ===')
print(f'FAST 모델:    {MODEL_FAST}')
print(f'QUALITY 모델: {MODEL_QUALITY}')
print(f'IMAGE 모델:   {MODEL_IMAGE}')
print()
print('=== 라벨 -> ID 매핑 ===')
for label in ModelLabel:
    print(f'{label.value:10}: {get_model_id(label)}')
"
```

---

## 5. 실모델 호출 테스트 시나리오 (Real 모드)

**전제 조건**: `.env`에 `UW_MODE=real` 및 유효한 키 파일 경로가 설정되어 있어야 합니다.

### 시나리오 A: FAST 모델 텍스트 생성
**목적**: `gemini-3-flash-preview` 모델을 호출하여 텍스트 응답을 확인합니다.

```bash
cd backend
uv run python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from unknown_world.services import get_genai_client, GenerateRequest
from unknown_world.config import ModelLabel

async def test():
    client = get_genai_client()
    print(f'Current Mode: {client.mode}')
    
    response = await client.generate(GenerateRequest(
        prompt='Say \"Verified\" in one word.',
        model_label=ModelLabel.FAST
    ))
    print(f'Response: {response.text}')
    print(f'Usage: {response.usage}')

asyncio.run(test())"
```

### 시나리오 B: QUALITY 모델 스트리밍 생성
**목적**: `gemini-3-pro-preview` 모델의 스트리밍 응답 동작을 확인합니다.

```bash
cd backend
uv run python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from unknown_world.services import get_genai_client, GenerateRequest
from unknown_world.config import ModelLabel

async def test():
    client = get_genai_client()
    print(f'Testing Streaming with {ModelLabel.QUALITY}...')
    
    # generate_stream은 비동기 제너레이터를 반환하므로 await 없이 호출합니다.
    stream = client.generate_stream(GenerateRequest(
        prompt='Count from 1 to 5 slowly.',
        model_label=ModelLabel.QUALITY
    ))
    
    async for chunk in stream:
        print(chunk, end='', flush=True)
    print('\nDone.')

asyncio.run(test())"
```

---

## 6. 통합 테스트 및 싱글톤 검증

**목적**: 전체 시스템의 일관성과 인스턴스 관리 정책을 검증합니다.

```bash
cd backend
uv run python -c "
import asyncio
from dotenv import load_dotenv
load_dotenv()
from unknown_world.services import get_genai_client, reset_genai_client, GenerateRequest
from unknown_world.config import ModelLabel

async def run_integration():
    print('=' * 60)
    print('U-016 GenAI 클라이언트 통합 테스트')
    print('=' * 60)
    
    # 1. 싱글톤 검증
    reset_genai_client()
    c1 = get_genai_client()
    c2 = get_genai_client()
    assert c1 is c2, 'Singleton pattern failed!'
    print('✓ 싱글톤 인스턴스 재사용 확인')
    
    # 2. 모델 매핑 및 호출 검증
    response = await c1.generate(GenerateRequest(
        prompt='ping',
        model_label=ModelLabel.FAST,
        max_tokens=5
    ))
    assert response.text, 'Empty response from model'
    print(f'✓ {ModelLabel.FAST} 모델 호출 성공 (Mode: {c1.mode})')
    
    print('=' * 60)
    print('✅ 모든 통합 테스트 통과!')
    print('=' * 60)

asyncio.run(run_integration())"
```

---

## 7. 문제 해결 (Troubleshooting)

### 7.1 권한 및 인증 오류
- **DefaultCredentialsError**: `.env`의 `GOOGLE_APPLICATION_CREDENTIALS` 경로를 다시 확인하세요.
- **Permission Denied (403)**: 서비스 계정에 `Vertex AI User` 권한이 할당되어 있는지 확인하세요. 만약 API가 활성화되지 않았다면 메시지의 링크를 통해 활성화해야 합니다.

### 7.2 모델을 찾을 수 없음 (404 NOT_FOUND)
- **리전 불일치**: `gemini-3-*` 프리뷰 모델은 특정 리전에서 접근이 제한될 수 있습니다. `.env`의 `VERTEX_LOCATION`을 `global`로 설정하여 재시도하세요.
- **모델 명칭**: `tech-stack.md`에 정의된 모델 ID가 정확한지 확인하세요.

### 7.3 인코딩 문제 (Windows)
Windows 터미널에서 한글 출력이 깨지는 경우 실행 전 아래 명령어를 입력하세요.
```bash
# PowerShell
$env:PYTHONIOENCODING = "utf-8"
# CMD
set PYTHONIOENCODING=utf-8
```

---

## 8. 생성 파일 목록
- `backend/src/unknown_world/config/models.py`: 모델 ID 상수 및 매핑
- `backend/src/unknown_world/services/genai_client.py`: GenAI 클라이언트 래퍼 및 팩토리
- `backend/.env.example`: 환경 변수 설정 템플릿

```