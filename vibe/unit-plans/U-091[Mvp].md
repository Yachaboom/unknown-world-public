# U-091[Mvp]: 런타임 rembg 파이프라인 일괄 제거

## 메타데이터

| 항목      | 내용                                            |
| --------- | ----------------------------------------------- |
| Unit ID   | U-091[Mvp]                                      |
| Phase     | MVP                                             |
| 예상 소요 | 60분                                            |
| 의존성    | U-035[Mvp], U-045[Mvp], U-075[Mvp]              |
| 우선순위  | High (런타임 의존성 단순화/안정화)              |

## 작업 목표

런타임(서버 실행 중)에서 `rembg` 배경 제거 파이프라인을 **일괄 제거**하여, 서버 시작 시간 단축, 의존성 단순화, 런타임 안정성 향상을 달성한다. 배경 제거가 필요한 에셋은 **개발 시점(Dev-only)**에서 미리 처리하거나, 프리셋 이미지를 사용한다.

**배경**: U-035에서 rembg 런타임 통합, U-045에서 preflight 다운로드를 구현했으나, 실제 운영에서 (1) rembg 모델 다운로드(100~200MB)로 서버 시작이 느리고, (2) 아이콘 생성 시 rembg 호출이 추가 지연/실패 원인이 되며, (3) MVP에서는 프리셋 아이콘(U-092)으로 대체 가능하므로 **런타임 rembg를 제거**하는 것이 합리적이다.

**완료 기준**:

- 서버 시작 시 rembg 모델 다운로드/사전 점검(preflight) 코드 제거
- `ItemIconGenerator`에서 rembg 배경 제거 호출 제거
- 이미지 생성 파이프라인에서 rembg 의존 코드 제거
- `requirements.txt`/`pyproject.toml`에서 rembg를 **런타임 의존에서 제거** (dev 의존으로 이동 또는 완전 제거)
- 서버 시작 시간이 rembg 로딩 없이 단축됨
- 기존 기능(이미지 생성/아이콘 표시)에 회귀 없음

## 영향받는 파일

**수정**:

- `backend/pyproject.toml` (또는 `requirements.txt`) - rembg를 런타임 의존에서 제거
- `backend/src/unknown_world/services/item_icon_generator.py` - rembg 호출 제거, 배경 제거 없이 이미지 저장
- `backend/src/unknown_world/services/image_generation.py` - rembg 관련 배경 제거 로직 제거
- `backend/src/unknown_world/main.py` - (또는 startup 이벤트) rembg preflight 호출 제거
- `backend/src/unknown_world/config/settings.py` - rembg 관련 설정 필드 제거 (있는 경우)

**삭제 대상**:

- rembg preflight 함수/모듈 (U-045에서 추가한 부분)
- rembg 모델 파일 캐시 디렉토리 참조

**참조**:

- `vibe/unit-results/U-035[Mvp].md` - rembg 런타임 통합 결과 (제거 대상)
- `vibe/unit-results/U-045[Mvp].md` - rembg preflight 결과 (제거 대상)
- `vibe/unit-results/U-075[Mvp].md` - 아이콘 동적 생성 (rembg 제거 후 동작 확인)
- `vibe/ref/rembg-guide.md` - rembg 가이드 (Dev-only 사용으로 제한 표기)

## 구현 흐름

### 1단계: rembg preflight 제거

- `main.py`(또는 startup 훅)에서 rembg 모델 사전 다운로드/점검 코드 제거
- 관련 로그 메시지 정리

### 2단계: ItemIconGenerator에서 rembg 제거

- `_remove_background()` 메서드 제거 또는 no-op으로 변경
- 아이콘 생성 후 배경 제거 단계 건너뛰기
- 프롬프트를 "투명 배경" 또는 "단순 배경" 스타일로 조정하여 배경 제거 없이도 아이콘이 자연스럽도록

### 3단계: 이미지 생성 파이프라인 rembg 제거

- `image_generation.py`에서 rembg 관련 import/호출 제거
- Scene 이미지 생성에서는 원래 배경 제거를 하지 않았으므로 영향 없음

### 4단계: 의존성 정리

- `pyproject.toml`에서 `rembg` 패키지를 런타임 의존에서 제거
- (선택) dev 의존(`[dev]` 또는 `[tool.uv.dev-dependencies]`)으로 이동 (개발 시 에셋 제작용)
- `uv sync` 실행하여 lock 파일 갱신

### 5단계: 검증

- 서버 시작 → rembg 관련 로그 없음 확인
- 아이콘 생성 → 배경 제거 없이 정상 생성/표시 확인
- 이미지 생성 → 정상 동작 확인
- 서버 시작 시간 비교 (개선 확인)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **결과물**: [U-035[Mvp]](../unit-results/U-035[Mvp].md) - rembg 런타임 통합 (제거 대상 식별)
- **결과물**: [U-045[Mvp]](../unit-results/U-045[Mvp].md) - rembg preflight (제거 대상 식별)
- **결과물**: [U-075[Mvp]](../unit-results/U-075[Mvp].md) - 아이콘 생성 (rembg 제거 후 동작 보장)

**다음 작업에 전달할 것**:

- U-092: rembg 없이 아이콘을 사용하므로, 프리셋 이미지 방식으로 보완
- U-093: 아이콘 생성 파이프라인 단순화(rembg 없는 환경)

## 주의사항

**기술적 고려사항**:

- Dev-only 에셋 제작에서 rembg가 필요한 경우, 개발자가 `pip install rembg`로 수동 설치하도록 가이드
- nanobanana mcp로 생성한 에셋의 배경 제거는 **개발 시점**에 완료하고, 결과물만 레포에 커밋
- 아이콘 프롬프트를 "pixel art, simple background, centered item" 등으로 조정하여 배경 제거 없이도 사용 가능하게
- `vibe/ref/rembg-guide.md`에 "런타임 제거됨, Dev-only 사용" 메모 추가

**잠재적 리스크**:

- 런타임 rembg 제거 후 아이콘 배경이 깔끔하지 않을 수 있음 → 프롬프트 조정 + 프리셋 이미지(U-092)로 보완
- MMP에서 rembg 런타임이 다시 필요해질 수 있음 → 그때 재도입 검토 (dev 의존은 유지)

## 페어링 질문 (결정 필요)

- [x] **Q1**: rembg 패키지 처리?
  - ✅ Option A: 완전 제거 (`pyproject.toml`에서 삭제)
  - Option B: dev 의존으로 이동 (개발 시 에셋 제작용)
  - Option C: optional 의존으로 분리 (`pip install unknown-world[rembg]`)

- [x] **Q2**: 아이콘 배경 처리 대안?
  - ✅ Option A: 프롬프트로 "투명/단색 배경" 유도 (배경 제거 없이) - 이건 이미 프롬프트로 그렇게 하는중
  - Option B: 프리셋 아이콘만 사용 (동적 생성 시 배경 그대로)
  - Option C: CSS mask/clip으로 프론트에서 원형 크롭

## 참고 자료

- `vibe/unit-results/U-035[Mvp].md` - rembg 런타임 통합 결과
- `vibe/unit-results/U-045[Mvp].md` - rembg preflight 결과
- `vibe/ref/rembg-guide.md` - rembg 사용 가이드
- `vibe/prd.md` - 6.3(멀티모달), 9.7(에셋 파이프라인)
