# U-036[Mvp] 프롬프트 파일 분리/핫리로드 실행 가이드

## 1. 개요

스토리(텍스트) 및 이미지 생성에 사용되는 **핵심 프롬프트**를 **별도 `.md` 파일**로 분리하고, 한국어/영어 형태로 관리하여 **편집/튜닝/버전 관리**를 용이하게 합니다. 개발 모드에서는 서버 재시작 없이 프롬프트 파일 변경이 반영되는 핫리로드가 동작합니다.

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-017 (TurnOutput 생성), U-019 (이미지 생성)
- 선행 완료 필요: 없음 (독립 실행 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 백엔드 의존성 설치
cd backend
uv sync
```

### 2.2 핫리로드 모드 활성화

```bash
# 개발 모드로 환경변수 설정 (핫리로드 활성화)
export ENVIRONMENT=development
# Windows CMD: set ENVIRONMENT=development
# Windows PowerShell: $env:ENVIRONMENT="development"
```

### 2.3 프롬프트 로더 테스트 실행

```bash
cd backend
uv run python -c "
from unknown_world.orchestrator.prompt_loader import (
    load_prompt,
    load_prompt_with_metadata,
    load_image_prompt,
    is_hot_reload_enabled,
    clear_prompt_cache,
)
from unknown_world.models.turn import Language

# 핫리로드 상태 확인
print('=== 핫리로드 상태 ===')
print(f'핫리로드 활성화: {is_hot_reload_enabled()}')

# 시스템 프롬프트 로드 테스트
print()
print('=== 시스템 프롬프트 로드 ===')
prompt = load_prompt('system', 'game_master', Language.KO)
print(f'한국어 시스템 프롬프트 길이: {len(prompt)} 문자')
print(f'첫 100자: {prompt[:100]}...')

# 이미지 프롬프트 로드 테스트
print()
print('=== 이미지 프롬프트 로드 ===')
img_prompt = load_image_prompt(Language.KO)
print(f'한국어 이미지 프롬프트 길이: {len(img_prompt)} 문자')

# 메타데이터 포함 로드 테스트
print()
print('=== 메타데이터 포함 로드 ===')
data = load_prompt_with_metadata('image', 'scene_prompt', Language.KO)
print(f'prompt_id: {data.metadata.get(\"prompt_id\", \"N/A\")}')
print(f'version: {data.metadata.get(\"version\", \"N/A\")}')
print(f'language: {data.metadata.get(\"language\", \"N/A\")}')
print(f'본문 길이: {len(data.content)} 문자')

print()
print('=== 테스트 완료 ===')
"
```

### 2.4 첫 화면/결과 확인

- 성공 지표:
  - `핫리로드 활성화: True` (개발 모드일 때)
  - 한국어 시스템 프롬프트 길이가 0보다 큼
  - 이미지 프롬프트 길이가 0보다 큼
  - 메타데이터에서 `prompt_id`, `version` 등이 정상 출력

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 핫리로드 동작 확인

**목적**: 개발 모드에서 프롬프트 파일 변경이 서버 재시작 없이 반영되는지 확인

**실행**:

1. 개발 모드로 환경변수 설정
   ```bash
   export ENVIRONMENT=development
   ```

2. 프롬프트 로드 후 파일 수정
   ```bash
   cd backend
   uv run python -c "
   from unknown_world.orchestrator.prompt_loader import load_prompt
   from unknown_world.models.turn import Language
   
   # 첫 번째 로드
   prompt1 = load_prompt('image', 'scene_prompt', Language.KO)
   print(f'첫 번째 로드 길이: {len(prompt1)}')
   
   # 파일 수정 (수동으로 진행)
   print()
   print('이제 backend/prompts/image/scene_prompt.ko.md 파일을 수정하세요.')
   print('수정 후 Enter를 눌러 계속...')
   input()
   
   # 두 번째 로드 (핫리로드 확인)
   prompt2 = load_prompt('image', 'scene_prompt', Language.KO)
   print(f'두 번째 로드 길이: {len(prompt2)}')
   print(f'변경 감지: {\"예\" if len(prompt1) != len(prompt2) else \"아니오\"}')"
   ```

**기대 결과**:

- 파일 수정 후 두 번째 로드에서 변경된 내용이 반영됨
- 개발 모드에서는 캐시를 사용하지 않고 매번 파일을 다시 읽음

**확인 포인트**:

- ✅ 첫 번째 로드 성공
- ✅ 파일 수정 후 두 번째 로드에서 변경 감지

---

### 시나리오 B: 운영 모드 캐싱 확인

**목적**: 운영 모드에서 프롬프트가 캐싱되어 성능이 향상되는지 확인

**실행**:

```bash
# 운영 모드로 환경변수 설정 (또는 환경변수 미설정)
unset ENVIRONMENT
# 또는
export ENVIRONMENT=production

cd backend
uv run python -c "
import time
from unknown_world.orchestrator.prompt_loader import (
    load_prompt,
    clear_prompt_cache,
    is_hot_reload_enabled,
)
from unknown_world.models.turn import Language

print(f'핫리로드 활성화: {is_hot_reload_enabled()}')

# 캐시 클리어
clear_prompt_cache()

# 첫 번째 로드 (캐시 미스)
start = time.time()
for _ in range(100):
    load_prompt('system', 'game_master', Language.KO)
first_time = time.time() - start

# 두 번째 로드 (캐시 히트, 캐싱이 적용되면 더 빠름)
# 캐시 클리어 없이 다시 로드
start = time.time()
for _ in range(100):
    load_prompt('system', 'game_master', Language.KO)
second_time = time.time() - start

print(f'첫 번째 100회 로드 시간: {first_time:.4f}초')
print(f'두 번째 100회 로드 시간: {second_time:.4f}초')
print(f'캐싱 효과: {\"예\" if second_time < first_time * 0.5 else \"아니오 (핫리로드 모드이거나 이미 캐싱됨)\"}')"
```

**기대 결과**:

- 운영 모드에서는 캐싱이 적용되어 두 번째 로드가 더 빠름
- `핫리로드 활성화: False`

**확인 포인트**:

- ✅ 운영 모드에서 핫리로드 비활성화
- ✅ 캐싱으로 인한 성능 향상 (또는 이미 캐싱된 상태)

---

### 시나리오 C: 언어별 프롬프트 로드

**목적**: ko/en 언어별 프롬프트가 올바르게 로드되는지 확인

**실행**:

```bash
cd backend
uv run python -c "
from unknown_world.orchestrator.prompt_loader import load_prompt_with_metadata
from unknown_world.models.turn import Language

# 한국어 프롬프트 로드
ko_data = load_prompt_with_metadata('image', 'scene_prompt', Language.KO)
print('=== 한국어 프롬프트 ===')
print(f'language: {ko_data.metadata.get(\"language\")}')
print(f'본문 첫 50자: {ko_data.content[:50]}...')

print()

# 영어 프롬프트 로드
en_data = load_prompt_with_metadata('image', 'scene_prompt', Language.EN)
print('=== 영어 프롬프트 ===')
print(f'language: {en_data.metadata.get(\"language\")}')
print(f'본문 첫 50자: {en_data.content[:50]}...')

print()
print(f'ko/en 메타데이터 구분: {\"OK\" if ko_data.metadata.get(\"language\") != en_data.metadata.get(\"language\") else \"FAIL\"}')"
```

**기대 결과**:

- 한국어 프롬프트: `language: ko-KR`
- 영어 프롬프트: `language: en-US`
- 각 언어에 맞는 본문 로드

**확인 포인트**:

- ✅ 한국어 프롬프트 로드 성공
- ✅ 영어 프롬프트 로드 성공
- ✅ 언어별 메타데이터 구분 정확

---

> 참고: “분리 프롬프트를 JSON 포맷으로 전환/반환”하는 검증 시나리오는 제거했습니다.  
> 프롬프트 파일은 `.md`를 유지하며, 포맷 표준화는 **XML 태그 규격 통일(U-046)** 로 진행합니다.

## 4. 실행 결과 확인

### 4.1 생성된 파일 목록

- `backend/prompts/image/scene_prompt.ko.md` - 이미지 생성 프롬프트 (한국어)
- `backend/prompts/image/scene_prompt.en.md` - 이미지 생성 프롬프트 (영어)

### 4.2 수정된 파일

- `backend/src/unknown_world/orchestrator/prompt_loader.py` - 핫리로드/메타데이터 지원 확장

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 한국어/영어 프롬프트 파일이 존재하고 로드됨
- ✅ 프론트매터 메타데이터가 올바르게 파싱됨
- ✅ 개발 모드에서 핫리로드가 동작함
- ✅ 운영 모드에서 캐싱이 동작함

**실패 시 확인**:

- ❌ `FileNotFoundError` → 프롬프트 파일 경로 확인
- ❌ 메타데이터 파싱 실패 → 프롬프트 파일 상단 형식 확인
- ❌ 핫리로드 미동작 → `ENVIRONMENT=development` 환경변수 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `FileNotFoundError: 프롬프트 파일을 찾을 수 없습니다`

- **원인**: 프롬프트 파일이 없거나 경로가 잘못됨
- **해결**: `backend/prompts/` 디렉토리 구조 확인

**오류**: 메타데이터가 빈 딕셔너리로 반환됨

- **원인**: 프롬프트 파일 상단의 프론트매터 형식이 잘못됨
- **해결**: `- key: value` 형식으로 작성했는지 확인

**오류**: 핫리로드가 동작하지 않음

- **원인**: `ENVIRONMENT` 환경변수가 `development`로 설정되지 않음
- **해결**: `export ENVIRONMENT=development` 실행

### 5.2 환경별 주의사항

- **Windows**: 환경변수 설정 시 `set ENVIRONMENT=development` 또는 PowerShell에서 `$env:ENVIRONMENT="development"` 사용
- **macOS/Linux**: `export ENVIRONMENT=development` 사용

---

## 6. 다음 단계

- U-021(Scanner 이미지 이해)에서 이미지 분석 프롬프트도 동일 패턴으로 관리 가능
- MMP(U-104 장기 세션 메모리)에서 요약/핀 프롬프트 확장 시 동일 로더 재사용
