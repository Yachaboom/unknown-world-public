# U-046[Mvp] 프롬프트 XML 태그 규격 통일 실행 가이드

## 1. 개요

분리된 프롬프트 파일(`backend/prompts/**/*.md`)의 메타데이터/섹션 경계를 XML 태그로 통일하였습니다.
`prompt_loader`가 XML 태그 기반 메타를 우선 파싱하고, 레거시 포맷은 폴백으로 지원합니다.

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-036[Mvp] (프롬프트 분리/로더/핫리로드 기반)
- 선행 완료 필요: 없음 (독립 검증 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd backend
# Python 가상환경 활성화 (예시)
# Windows: .venv\Scripts\activate
# Unix: source .venv/bin/activate

# 의존성 설치
pip install -e .
```

### 2.2 즉시 실행 (테스트)

```bash
cd backend
python -m pytest tests/unit/orchestrator/test_prompt_loader.py -v
```

### 2.3 첫 결과 확인

- 모든 테스트가 PASSED로 표시됨
- 특히 `TestXmlParsing` 클래스의 테스트들이 통과해야 함

---

## 3. 핵심 기능 시나리오

### 시나리오 A: XML 태그 기반 메타데이터 파싱

**목적**: XML 태그 형식의 프롬프트가 올바르게 파싱되는지 검증

**실행**:

```python
from unknown_world.models.turn import Language
from unknown_world.orchestrator.prompt_loader import load_prompt_with_metadata

# 한국어 시스템 프롬프트 로드
data = load_prompt_with_metadata("system", "game_master", Language.KO)
print("Metadata:", data.metadata)
print("Content preview:", data.content[:200])
```

**기대 결과**:

```python
Metadata: {
    'prompt_id': 'game_master_system',
    'language': 'ko-KR',
    'version': '0.2.0',
    'last_updated': '2026-01-28',
    'policy_preset': 'default'
}
Content preview: ## 목적

에이전트형 Game Master로서 TurnOutput(JSON)을 생성합니다...
```

**확인 포인트**:

- ✅ `metadata` 딕셔너리에 필수 키들이 존재함 (prompt_id, language, version, last_updated, policy_preset)
- ✅ `content`에 `<prompt_meta>`, `<prompt_body>` 태그가 포함되지 않음
- ✅ `content`가 `## 목적`으로 시작함 (메타 블록 제거됨)

---

### 시나리오 B: 레거시 폴백 테스트

**목적**: XML 태그가 없는 레거시 프롬프트도 정상 파싱되는지 검증

**테스트 파일 생성**:

```bash
# 테스트용 레거시 프롬프트 생성
cat > backend/prompts/system/test_legacy.ko.md << 'EOF'
# [Prompt] Test Legacy (ko-KR)

- prompt_id: test_legacy
- language: ko-KR
- version: 0.1.0
- last_updated: 2026-01-28

## 목적
레거시 폴백 테스트용 프롬프트입니다.

## 내용
본문 내용입니다.
EOF
```

**실행**:

```python
from unknown_world.models.turn import Language
from unknown_world.orchestrator.prompt_loader import load_prompt_with_metadata

# 레거시 프롬프트 로드
data = load_prompt_with_metadata("system", "test_legacy", Language.KO)
print("Metadata:", data.metadata)
print("Format:", "legacy" if "version" in data.metadata else "unknown")
```

**기대 결과**:

```python
Metadata: {'prompt_id': 'test_legacy', 'language': 'ko-KR', 'version': '0.1.0', 'last_updated': '2026-01-28'}
Format: legacy
```

**정리**:

```bash
rm backend/prompts/system/test_legacy.ko.md
```

**확인 포인트**:

- ✅ 레거시 포맷도 메타데이터 추출 성공
- ✅ 에러 없이 폴백 동작

---

### 시나리오 C: 핫리로드 테스트 (개발 모드)

**목적**: 개발 모드에서 파일 수정 시 즉시 반영되는지 검증

**환경 설정**:

```bash
export ENVIRONMENT=development  # Unix
# set ENVIRONMENT=development  # Windows
```

**실행**:

```python
import os
os.environ["ENVIRONMENT"] = "development"

from unknown_world.models.turn import Language
from unknown_world.orchestrator.prompt_loader import (
    load_prompt_with_metadata,
    is_hot_reload_enabled,
)

print("Hot reload enabled:", is_hot_reload_enabled())

# 첫 번째 로드
data1 = load_prompt_with_metadata("system", "game_master", Language.KO)
print("Version (before):", data1.metadata.get("version"))

# 파일 수정 후 다시 로드하면 변경사항이 즉시 반영됨
# (실제 파일 수정 테스트는 생략, 위 단위 테스트에서 검증됨)
```

**확인 포인트**:

- ✅ `is_hot_reload_enabled()` == True (개발 모드)
- ✅ 파일 수정 시 캐시 없이 즉시 반영

---

### 시나리오 D: ko/en 언어 일관성 검증

**목적**: 언어별 프롬프트가 대칭으로 유지되는지 검증

**실행**:

```python
from unknown_world.models.turn import Language
from unknown_world.orchestrator.prompt_loader import load_prompt_with_metadata

categories = ["system", "turn", "image"]
names = {
    "system": "game_master",
    "turn": "turn_output_instructions",
    "image": "scene_prompt",
}

for cat in categories:
    name = names[cat]
    ko_data = load_prompt_with_metadata(cat, name, Language.KO)
    en_data = load_prompt_with_metadata(cat, name, Language.EN)
    
    print(f"\n[{cat}/{name}]")
    print(f"  KO: language={ko_data.metadata.get('language')}, version={ko_data.metadata.get('version')}")
    print(f"  EN: language={en_data.metadata.get('language')}, version={en_data.metadata.get('version')}")
    
    # 버전 일치 확인
    assert ko_data.metadata.get("version") == en_data.metadata.get("version"), "Version mismatch!"
    # 언어 코드 확인
    assert ko_data.metadata.get("language") == "ko-KR", "KO language mismatch!"
    assert en_data.metadata.get("language") == "en-US", "EN language mismatch!"

print("\n✅ All language pairs validated!")
```

**기대 결과**:

```
[system/game_master]
  KO: language=ko-KR, version=0.2.0
  EN: language=en-US, version=0.2.0

[turn/turn_output_instructions]
  KO: language=ko-KR, version=0.2.0
  EN: language=en-US, version=0.2.0

[image/scene_prompt]
  KO: language=ko-KR, version=0.2.0
  EN: language=en-US, version=0.2.0

✅ All language pairs validated!
```

**확인 포인트**:

- ✅ 모든 프롬프트 쌍의 버전이 일치
- ✅ 언어 코드가 파일명과 메타데이터에서 일치

---

## 4. 실행 결과 확인

### 4.1 단위 테스트 결과

```bash
cd backend
python -m pytest tests/unit/orchestrator/test_prompt_loader.py -v --tb=short
```

**성공 지표**:
- `TestPromptLoader`: 기존 테스트 모두 통과
- `TestXmlParsing`: 새 XML 파싱 테스트 모두 통과

### 4.2 변경된 파일

| 파일 | 변경 내용 |
|------|-----------|
| `backend/src/unknown_world/orchestrator/prompt_loader.py` | XML 태그 파싱 + 레거시 폴백 구현 |
| `backend/prompts/system/game_master.{ko,en}.md` | XML 태그 규격 적용 |
| `backend/prompts/turn/turn_output_instructions.{ko,en}.md` | XML 태그 규격 적용 |
| `backend/prompts/image/scene_prompt.{ko,en}.md` | XML 태그 규격 적용 |
| `backend/tests/unit/orchestrator/test_prompt_loader.py` | XML 파싱 테스트 추가 |
| `.cursor/rules/30-prompts-i18n.mdc` | 규칙 정합화 |

### 4.3 성공/실패 판단 기준

**성공**:

- ✅ 모든 단위 테스트 통과
- ✅ XML 태그 메타데이터 파싱 정상
- ✅ 레거시 폴백 동작 정상
- ✅ 핫리로드 동작 정상 (개발 모드)
- ✅ ko/en 언어 쌍 일관성 유지

**실패 시 확인**:

- ❌ 파싱 에러 → XML 태그 구문 확인 (`<prompt_meta>`, `<prompt_body>` 닫힘 여부)
- ❌ 메타데이터 누락 → 필수 태그 존재 확인
- ❌ 버전 불일치 → ko/en 파일 동시 업데이트 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: `FileNotFoundError: 프롬프트 파일을 찾을 수 없습니다`

- **원인**: 프롬프트 파일 경로/이름 불일치
- **해결**: `backend/prompts/` 디렉토리 구조 확인

**오류**: `KeyError: 'prompt_id'` (메타데이터 누락)

- **원인**: XML 태그가 올바르게 작성되지 않음
- **해결**: `<prompt_meta>` 내 필수 태그 확인

**오류**: 테스트 실패 - `AssertionError: 'xml_test' != 'legacy'`

- **원인**: XML 파싱이 실패하여 레거시 폴백됨
- **해결**: XML 태그 구문 오류 확인 (공백, 닫힘 태그 등)

### 5.2 환경별 주의사항

- **Windows**: 파일 경로에 백슬래시 사용 시 주의 (Python Path 객체 사용 권장)
- **macOS/Linux**: 특이사항 없음

---

## 6. 다음 단계

- CP-MVP-05(멀티모달 이미지 게이트)에서 프롬프트 로드/언어 인바리언트 검증 단순화
- 향후 신규 프롬프트 추가 시 XML 태그 규격 템플릿 사용
