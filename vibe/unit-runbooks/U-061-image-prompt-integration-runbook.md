# U-061 이미지 생성 지침 파이프라인 통합 실행 가이드

## 1. 개요

이미지 생성 가이드라인(`scene_prompt.md`)을 Game Master 시스템 프롬프트에 통합하여, LLM이 이미지 모델에 최적화된 고품질 프롬프트를 일관되게 생성하도록 합니다. 또한 i18n 정합성을 강화하여 세션 언어에 따라 올바른 지침이 로드됩니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-055[Mvp] (이미지 파이프라인 통합 검증), U-036[Mvp] (프롬프트 파일 분리)
- 선행 완료 필요: 없음 (독립 검증 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트에서 의존성 확인
cd d:\Dev\unknown-world

# 백엔드 의존성 동기화
cd backend && uv sync
```

### 2.2 개발 서버 실행

```bash
# 프로젝트 루트에서
pnpm dev:back   # 백엔드 (포트 8011)
pnpm dev:front  # 프론트엔드 (포트 8001)
```

### 2.3 정상 동작 확인

- 백엔드 로그에 `UW_MODE: mock` 또는 `UW_MODE: real` 표시
- 프론트엔드: http://localhost:8001/ 접근 가능

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 프롬프트 로더 이미지 가이드라인 로드 확인

**목적**: 언어별 이미지 가이드라인이 정상 로드되는지 확인

**실행**:

```bash
cd backend
uv run python -c "
from unknown_world.orchestrator.prompt_loader import load_image_prompt
from unknown_world.models.turn import Language

ko_prompt = load_image_prompt(Language.KO)
en_prompt = load_image_prompt(Language.EN)

print('KO 가이드라인 길이:', len(ko_prompt), 'chars')
print('EN 가이드라인 길이:', len(en_prompt), 'chars')
print('KO에 cinematic lighting 포함:', 'cinematic lighting' in ko_prompt)
print('EN에 Base Style Guidelines 포함:', 'Base Style Guidelines' in en_prompt)
"
```

**기대 결과**:

```
KO 가이드라인 길이: ~2030 chars
EN 가이드라인 길이: ~2900 chars
KO에 cinematic lighting 포함: True
EN에 Base Style Guidelines 포함: True
```

**확인 포인트**:

- ✅ KO/EN 모두 정상 로드
- ✅ 핵심 키워드(cinematic lighting, dark fantasy) 포함

---

### 시나리오 B: Game Master 시스템 프롬프트 통합 확인

**목적**: `_build_prompt` 함수에서 이미지 가이드라인이 시스템 프롬프트에 통합되는지 확인

**실행**:

```bash
cd backend
uv run python -c "
from unknown_world.orchestrator.generate_turn_output import TurnOutputGenerator
from unknown_world.models.turn import TurnInput, Language, EconomySnapshot, ClientInfo

gen = TurnOutputGenerator(force_mock=True)

# 한국어 테스트
ko_input = TurnInput(
    language=Language.KO,
    text='탐색한다',
    action_id='explore',
    economy_snapshot=EconomySnapshot(signal=200, memory_shard=10),
    client=ClientInfo(viewport_w=1920, viewport_h=1080)
)
ko_prompt = gen._build_prompt(ko_input)

# 영문 테스트
en_input = TurnInput(
    language=Language.EN,
    text='explore',
    action_id='explore',
    economy_snapshot=EconomySnapshot(signal=200, memory_shard=10),
    client=ClientInfo(viewport_w=1920, viewport_h=1080)
)
en_prompt = gen._build_prompt(en_input)

print('=== 한국어 세션 ===')
print('이미지 생성 지침 포함:', '이미지 생성 지침' in ko_prompt)
print('cinematic lighting 포함:', 'cinematic lighting' in ko_prompt)
print('프롬프트 길이:', len(ko_prompt), 'chars')

print()
print('=== 영문 세션 ===')
print('Image Generation Guidelines 포함:', 'Image Generation Guidelines' in en_prompt or 'cinematic lighting' in en_prompt)
print('Base Style Guidelines 포함:', 'Base Style Guidelines' in en_prompt)
print('프롬프트 길이:', len(en_prompt), 'chars')
"
```

**기대 결과**:

```
=== 한국어 세션 ===
이미지 생성 지침 포함: True
cinematic lighting 포함: True
프롬프트 길이: ~6200 chars

=== 영문 세션 ===
Image Generation Guidelines 포함: True
Base Style Guidelines 포함: True
프롬프트 길이: ~8100 chars
```

**확인 포인트**:

- ✅ 한국어/영문 세션 모두 이미지 가이드라인 포함
- ✅ 핵심 스타일 키워드가 시스템 프롬프트에 통합됨

---

### 시나리오 C: 하드코딩 제거 확인

**목적**: `image_generation.py`에서 `Language.KO` 하드코딩이 제거되었는지 확인

**실행**:

```bash
cd backend
# image_generation.py에서 Language 참조 검색
grep -n "Language" src/unknown_world/services/image_generation.py
```

**기대 결과**:

```
(결과 없음 - Language import 및 사용이 모두 제거됨)
```

**확인 포인트**:

- ✅ `Language.KO` 하드코딩 없음
- ✅ 미사용 `load_image_prompt` import 없음

---

### 시나리오 D: 통합 API 테스트 (선택)

**목적**: 전체 턴 API가 정상 작동하는지 확인

**전제 조건**:

- 백엔드 서버 실행 중 (포트 8011)

**실행 (Python 권장 - Windows/Linux 공통)**:

```bash
cd backend
uv run python -c "
import httpx
import json

payload = {
    'language': 'ko-KR',
    'text': '주변을 탐색한다',
    'action_id': 'explore',
    'economy_snapshot': {'signal': 200, 'memory_shard': 10},
    'client': {'viewport_w': 1920, 'viewport_h': 1080}
}

with httpx.Client(timeout=30.0) as client:
    response = client.post('http://localhost:8011/api/turn', json=payload)
    print('Status:', response.status_code)
    for line in response.text.strip().split('\n'):
        data = json.loads(line)
        print('Event:', data.get('type'))
"
```

**실행 (PowerShell - Windows)**:

```powershell
$body = @{
    language = "ko-KR"
    text = "주변을 탐색한다"
    action_id = "explore"
    economy_snapshot = @{ signal = 200; memory_shard = 10 }
    client = @{ viewport_w = 1920; viewport_h = 1080 }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:8011/api/turn" -Method POST -Body $body -ContentType "application/json"
```

**기대 결과**:

```
Status: 200
Event: stage
Event: badges
Event: narrative_delta
Event: final
```

**확인 포인트**:

- ✅ 응답에 `"type": "final"` 이벤트 포함
- ✅ 에러 없이 JSON 응답 수신

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:

- ✅ 언어별 이미지 가이드라인 로드 성공 (KO/EN)
- ✅ 시스템 프롬프트에 이미지 가이드라인 섹션 포함
- ✅ 핵심 키워드(cinematic lighting, dark fantasy, Base Style Guidelines) 포함
- ✅ `Language.KO` 하드코딩 제거 확인

**실패 시 확인**:

- ❌ `FileNotFoundError` 발생 → `backend/prompts/image/scene_prompt.{ko,en}.md` 파일 존재 확인
- ❌ 가이드라인 미포함 → `generate_turn_output.py`의 `_build_prompt` 수정 확인
- ❌ import 오류 → `load_image_prompt` import 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `FileNotFoundError: 프롬프트 파일을 찾을 수 없습니다`

- **원인**: 이미지 가이드라인 파일이 없거나 경로가 잘못됨
- **해결**: `backend/prompts/image/` 디렉토리에 `scene_prompt.ko.md`, `scene_prompt.en.md` 파일 존재 확인

**오류**: 가이드라인이 시스템 프롬프트에 포함되지 않음

- **원인**: `_build_prompt` 함수 수정 누락
- **해결**: `generate_turn_output.py`에서 `load_image_prompt` 호출 및 시스템 프롬프트 결합 코드 확인

---

## 6. 관련 파일

- `backend/prompts/image/scene_prompt.ko.md` - 한국어 이미지 가이드라인
- `backend/prompts/image/scene_prompt.en.md` - 영문 이미지 가이드라인
- `backend/src/unknown_world/orchestrator/generate_turn_output.py` - 시스템 프롬프트 구성
- `backend/src/unknown_world/orchestrator/prompt_loader.py` - 프롬프트 로더
- `backend/src/unknown_world/services/image_generation.py` - 이미지 생성 서비스

---

## 7. 다음 단계

- **U-064**: Real 모드 이미지 생성 시 개선된 프롬프트 품질 확인
- **CP-MVP-03**: 10분 데모 루프에서 이미지 품질 향상 체감
