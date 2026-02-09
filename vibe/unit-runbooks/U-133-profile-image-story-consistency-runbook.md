# U-133 프로필 시작 이미지-스토리 정합성 강화 — 첫 턴 맥락 주입 실행 가이드

## 1. 개요

프로필 선택 시 보이는 사전 생성 이미지(U-124)의 시각적 맥락이 첫 턴 내러티브에 자연스럽게 이어지도록 `scene_context`를 GM 프롬프트에 주입합니다.

- `initialSceneDescription` (ko/en) → `worldStore` → 첫 턴 `TurnInput.scene_context` → GM 프롬프트 맥락 주입
- 환영 메시지도 이미지 요소를 반영하도록 보강

**예상 소요 시간**: 10분

**의존성**:

- 의존 유닛: U-124[Mvp] (프로필별 첫 씬 이미지), U-131[Mvp] (Overarching Mystery)
- 선행 완료 필요: U-124, U-131 구현 완료 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드
cd frontend && pnpm install

# 백엔드
cd backend && pip install -e ".[dev]"
```

### 2.2 서버 실행

```bash
# 터미널 1 - 백엔드
cd backend && python -m uvicorn unknown_world.main:app --reload --port 8000

# 터미널 2 - 프론트엔드
cd frontend && pnpm dev
```

### 2.3 첫 화면 확인

- 브라우저에서 `http://localhost:5173` 접속
- 프로필 선택 화면이 표시되는지 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 서사꾼(Narrator) 프로필 — 첫 턴 이미지-스토리 정합성

**목적**: 서사꾼 프로필 선택 → 환영 메시지 → 첫 턴 내러티브가 이미지의 시각적 요소를 반영하는지 확인

**실행**:

1. 프로필 선택 화면에서 **서사꾼** 선택
2. 환영 메시지 확인: "먼지 낀 고서들 사이에서 눈을 떴습니다..." 등 서재 맥락
3. 초기 이미지가 Scene Canvas에 표시되는지 확인 (고풍스러운 서재)
4. 첫 액션 입력 (예: "주변을 둘러본다")
5. 첫 턴 내러티브가 반환됨

**확인 포인트**:

- ✅ 환영 메시지에 서재/촛불/고서 등 이미지 요소가 언급됨
- ✅ 첫 턴 내러티브에 서재/촛불/두루마리/달빛 등의 시각적 요소가 포함됨
- ✅ 장소가 갑자기 바뀌지 않고 이미지 맥락에서 자연스럽게 이어짐
- ✅ Overarching Mystery 분위기가 은은하게 반영됨 (서가 사이 빛, 미스터리한 두루마리 등)

---

### 시나리오 B: 탐험가(Explorer) 프로필 — 동굴 맥락 정합성

**목적**: 탐험가 프로필의 동굴 이미지와 첫 턴 내러티브 연결 확인

**실행**:

1. 프로필 선택에서 **탐험가** 선택
2. 환영 메시지: 동굴 입구/석조 기둥/문양 관련 맥락 확인
3. 첫 액션 입력 → 내러티브 확인

**확인 포인트**:

- ✅ 환영 메시지에 동굴/안개/석조 기둥/문양 요소 포함
- ✅ 첫 턴 내러티브가 동굴 입구에서 시작
- ✅ 이미지에 보이는 횃불/이끼/물방울 등의 요소가 반영됨

---

### 시나리오 C: 기술자(Tech) 프로필 — 실험실 맥락 정합성

**목적**: 기술자 프로필의 실험실 이미지와 첫 턴 내러티브 연결 확인

**실행**:

1. 프로필 선택에서 **기술자** 선택
2. 환영 메시지: 홀로그램/제어 패널/기계음 관련 맥락 확인
3. 첫 액션 입력 → 내러티브 확인

**확인 포인트**:

- ✅ 환영 메시지에 홀로그래픽 디스플레이/청록색 제어 패널 요소 포함
- ✅ 첫 턴 내러티브가 첨단 실험실에서 시작
- ✅ 이미지에 보이는 회로/빛나는 튜브/데이터 스트림 등이 반영됨

---

### 시나리오 D: 2턴 이후 scene_context 클리어 확인

**목적**: 2턴부터는 scene_context가 전달되지 않음을 확인

**실행**:

1. 아무 프로필 선택 → 첫 턴 완료
2. 2번째 액션 입력

**확인 포인트**:

- ✅ 2턴 요청 시 Network 패널에서 `scene_context: null` 확인
- ✅ 내러티브가 첫 턴의 결과에 기반하여 자연스럽게 진행됨 (장면 고정 없음)

---

### 시나리오 E: 영어(en-US) 환경 테스트

**목적**: 영어 환경에서도 동일하게 이미지-스토리 정합성 동작 확인

**실행**:

1. 언어를 English로 변경
2. 서사꾼(Narrator) 프로필 선택
3. 환영 메시지가 영어로 이미지 맥락을 포함하는지 확인
4. 첫 액션 입력 → 영문 내러티브에 dust-laden tomes, candlelight, parchment 등 포함 확인

**확인 포인트**:

- ✅ 영어 환영 메시지에 이미지 요소 반영
- ✅ 첫 턴 영문 내러티브가 이미지 맥락에서 시작
- ✅ ko/en 혼합 없이 순수 영문 출력

---

## 4. 실행 결과 확인

### 4.1 Network 탭 확인

- 첫 턴 POST 요청의 `scene_context` 필드에 씬 설명 텍스트가 포함됨
- 2턴 이후 `scene_context` 는 `null`

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 3종 프로필 모두 환영 메시지가 이미지 맥락 반영
- ✅ 첫 턴 내러티브가 이미지의 시각적 요소를 자연스럽게 포함
- ✅ 장면 전환 없이 이미지 → 환영 메시지 → 첫 턴이 매끄럽게 이어짐
- ✅ 2턴 이후에는 scene_context 미전달
- ✅ ko/en 양 언어 정상 동작

**실패 시 확인**:

- ❌ 첫 턴 내러티브가 이미지와 무관한 장소에서 시작 → scene_context 전달 경로 확인 (worldStore → turnRunner → backend)
- ❌ scene_context가 null로 전달됨 → sessionLifecycle.ts의 initialSceneDescription 세팅 로직 확인
- ❌ 2턴에서도 scene_context가 전달됨 → turnRunner의 클리어 로직 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 첫 턴 내러티브가 이미지와 관계없는 장소에서 시작됨

- **원인**: scene_context가 GM 프롬프트에 주입되지 않음
- **해결**:
  1. Network 탭에서 POST body의 `scene_context` 값 확인
  2. `worldStore.initialSceneDescription` 값 확인 (DevTools Console: `useWorldStore.getState().initialSceneDescription`)
  3. 백엔드 로그에서 `scene_context` 수신 여부 확인

**오류**: scene_context가 항상 null

- **원인**: sessionLifecycle.ts에서 initialSceneDescription을 worldStore에 저장하지 않음
- **해결**:
  1. demoProfiles.ts의 해당 프로필에 `initialSceneDescription` 필드 존재 여부 확인
  2. sessionLifecycle.ts의 language → ko/en 분기 로직 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 이슈 없음 (URL 기반 동작)
- **API 키**: 백엔드 Gemini API 키가 설정되어 있어야 첫 턴 생성 가능

---

## 6. 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `frontend/src/data/demoProfiles.ts` | 수정 | `initialSceneDescription` (ko/en) 필드 추가 |
| `frontend/src/schemas/turn.ts` | 수정 | `TurnInputSchema`에 `scene_context` 필드 추가 |
| `frontend/src/stores/worldStore.ts` | 수정 | `WorldState`에 `initialSceneDescription` 필드 추가 |
| `frontend/src/save/sessionLifecycle.ts` | 수정 | 프로필 시작 시 씬 설명을 worldStore에 저장 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 첫 턴에서 scene_context 주입 + 사용 후 클리어 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 환영 메시지 이미지 맥락 보강 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 환영 메시지 이미지 맥락 보강 |
| `frontend/src/api/turnStream.economy.test.ts` | 수정 | `scene_context` 필드 추가 (타입 호환) |
| `frontend/src/api/turnStream.test.ts` | 수정 | `scene_context` 필드 추가 (타입 호환) |
| `backend/src/unknown_world/models/turn.py` | 수정 | `TurnInput`에 `scene_context` 필드 추가 |
| `backend/src/unknown_world/orchestrator/generate_turn_output.py` | 수정 | scene_context를 GM 프롬프트에 주입 |
| `backend/prompts/turn/turn_output_instructions.ko.md` | 수정 | 첫 턴 씬 설명 활용 규칙 추가 |
| `backend/prompts/turn/turn_output_instructions.en.md` | 수정 | First Turn Scene Context Rules 추가 |
