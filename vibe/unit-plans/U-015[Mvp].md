# U-015[Mvp]: SaveGame(local) + Reset + Demo Profiles(3종)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-015[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-014,U-013,U-039 |
| 우선순위  | ⚡ Critical |

## 작업 목표

로그인 없이 즉시 시작 가능한 **데모 프로필 3종**(Narrator/Explorer/Tech Enthusiast)과 **즉시 리셋**, 그리고 SaveGame(JSON) 기반 **세이브/로드(로컬)** 를 제공한다.

**배경**: PRD는 심사자 이탈을 막기 위해 “데모 프로필 선택만으로 즉시 시작 + 리셋 1번”을 필수 요구한다. DB 없이 SaveGame 직렬화로 시작한다. (PRD 6.6/6.9, RULE-010)

**완료 기준**:

- 첫 화면(또는 시작 플로우)에서 데모 프로필 3종을 선택하면 즉시 플레이가 시작된다(로그인/가입 없음).
- Reset 버튼 1회로 해당 프로필의 초기 상태로 복구된다(데모 반복 가능).
- SaveGame(JSON)에 `language`, `world_state`, `history`, `economy_ledger`가 포함되고, 로컬 저장/복원이 가능하다.
- 복원/리셋 시 `language`가 UI i18n에도 적용되어(참조: U-039) UI/시스템 문구가 혼합되지 않는다. (RULE-006/007)

## 영향받는 파일

**생성**:

- `frontend/src/save/saveGame.ts` - SaveGame 직렬화/역직렬화 + 버전 필드
- `frontend/src/components/DemoProfileSelect.tsx` - 프로필 선택 UI(3종)
- `frontend/src/components/ResetButton.tsx` - 즉시 리셋 UI
- `frontend/src/data/demoProfiles.ts` - 프로필 프리셋(초기 재화/룰/퀘스트/세이브)

**수정**:

- `frontend/src/App.tsx` - 시작 플로우/프로필 적용/리셋/세이브 로드 연결
- `frontend/src/style.css` - 프로필 카드/리셋 버튼 스타일

**참조**:

- `vibe/prd.md` 6.6/6.9 - Save/Load, Demo Profiles, Reset 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-010(DB 금지), RULE-006(language)
- `vibe/tech-stack.md` - “즉시 시작/즉시 리셋” MVP 정책

## 구현 흐름

### 1단계: SaveGame 스키마(최소) 확정

- 최소 필드: `version`, `seed`, `language`, `world_state`, `history`, `economy_ledger`, `assets(선택)`
- 버전이 바뀌어도 복원 가능하도록 `version` 필드를 필수로 둔다.

### 2단계: Demo Profiles 3종 정의 및 적용

- 각 프로필은:
  - 초기 재화(Signal/Shard)
  - 초기 룰/퀘스트/인벤토리
  - 데모 10분 루프를 빠르게 보여줄 “시작 위치”가 달라야 한다
- 프로필 선택 시 해당 SaveGame을 즉시 로드하고, `language`에 맞춰 UI i18n 언어도 함께 적용한다(참조: U-039).

### 3단계: Reset 1회 복구 + 로컬 저장/로드

- Reset은 “현재 세션 스냅샷”이 아니라 “프로필 초기 SaveGame”으로 복구한다(반복 데모 안정).
- 로컬 저장은 localStorage(우선)로 시작하고, 확장(IndexedDB)은 MMP에서 고려한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-014[Mvp]](U-014[Mvp].md) - economy ledger/잔액 상태
- **계획서**: [U-013[Mvp]](U-013[Mvp].md) - 퀘스트/룰 패널 데이터 모델

**다음 작업에 전달할 것**:

- U-025(엔딩 리포트)에서 “세션 아티팩트”를 저장/리플레이하기 위한 SaveGame 기반
- CP-MVP-03에서 “10분 데모 루프 반복”을 보장하는 핵심 인프라

## 주의사항

**기술적 고려사항**:

- (RULE-010) DB/ORM 도입 금지: SaveGame JSON 직렬화가 기본이다.
- (RULE-006) SaveGame에는 `language`가 포함되어야 하며, 복원 시 UI/내러티브 언어가 혼합되지 않게 한다.
- (권장) U-039의 JSON locale 구조를 전제로, SaveGame 복원 시점에 i18n 언어를 먼저 적용한 뒤 UI를 렌더한다(혼합 방지).

**잠재적 리스크**:

- SaveGame이 커지면 로컬 저장이 불안정해질 수 있음 → MVP는 최소 필드만 저장하고, 압축/샤딩은 MMP로 미룬다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: SaveGame 저장소는 무엇을 1순위로 둘까?
  - Option A: localStorage(권장: 단순/데모 적합)
  - Option B: IndexedDB(대용량에 유리하지만 초기 구현 부담)
  **A1**: Option A

## 참고 자료

- `vibe/prd.md` - Save/Load, Demo Profiles, Reset
- `.cursor/rules/00-core-critical.mdc` - RULE-010, RULE-006

---

## 런북 (수동 검증 시나리오)

### 전제 조건

1. `cd frontend && pnpm dev --port 8001`로 개발 서버 실행
2. 브라우저에서 `http://localhost:8001` 접속
3. 브라우저 개발자 도구 열기 (localStorage 확인용)

### 시나리오 1: 프로필 선택 및 게임 시작

**절차**:

1. 첫 화면에서 "프로필을 선택하세요" 타이틀 확인
2. 3개의 프로필 카드 확인: 서사꾼(📖), 탐험가(🧭), 기술 전문가(⚙️)
3. "탐험가" 프로필 클릭

**기대 결과**:

- 게임 화면으로 전환됨
- 헤더에 Signal: 150, Shard: 5 표시
- 인벤토리: 나침반, 밧줄(x2), 랜턴, 지도 조각
- 퀘스트: 탈출구 찾기, 3개 구역 탐험하기 (진행중), 보급품 수집 (완료)
- 규칙: 중력 법칙, 어둠의 법칙
- 내러티브: "어두운 미로에서 눈을 떴습니다..."
- Scene Objects: 고대의 문, 이상한 장치, 숨겨진 통로

### 시나리오 2: localStorage 저장 확인

**절차**:

1. 시나리오 1 완료 후
2. 브라우저 개발자 도구 > Application > Local Storage 확인
3. `unknown_world_savegame` 키 확인
4. `unknown_world_current_profile` 키 확인

**기대 결과**:

- `unknown_world_savegame`: 전체 게임 상태 JSON (version, language, profileId, economy, inventory, quests, activeRules 등)
- `unknown_world_current_profile`: "explorer"

### 시나리오 3: 리셋 버튼 작동 확인

**절차**:

1. 게임 화면에서 리셋 버튼(🔄) 클릭
2. "다시 클릭하여 확인" 상태 확인
3. 취소 버튼(✕) 클릭으로 취소 테스트
4. 다시 리셋 버튼 클릭 후 확인 버튼 클릭

**기대 결과**:

- 첫 클릭: 확인 모드로 전환 (버튼 텍스트 변경, 취소 버튼 표시)
- 취소: 일반 모드로 복귀
- 확인: 프로필 초기 상태로 리셋 (턴 카운트 0, 초기 재화/인벤토리)

### 시나리오 4: 프로필 변경

**절차**:

1. 게임 화면에서 "프로필 변경" 버튼(👤) 클릭
2. 프로필 선택 화면으로 복귀 확인
3. "기술 전문가" 프로필 선택

**기대 결과**:

- 프로필 선택 화면 표시
- 기술 전문가 선택 시:
  - Signal: 80, Shard: 15
  - 인벤토리: 데이터 코어, 회로 기판(x2), 에너지 셀(x3), 스캐너 장치
  - 퀘스트: 시스템 분석 완료하기, 자원 효율 최적화하기
  - 규칙: 에너지 보존, 데이터 무결성, 시스템 한계 (3개)
  - 내러티브: "시스템 부팅 완료..."

### 시나리오 5: 저장된 게임 계속하기

**절차**:

1. 게임 진행 후 페이지 새로고침 (F5)
2. 자동으로 게임 화면 표시 확인 (프로필 선택 화면 건너뜀)
3. 프로필 변경 → localStorage 초기화 → 새로고침
4. 프로필 선택 화면 표시 확인

**기대 결과**:

- 저장된 게임이 있으면 자동으로 게임 화면 표시
- localStorage 초기화 후에는 프로필 선택 화면 표시

### 시나리오 6: 언어 일관성 확인 (RULE-006)

**절차**:

1. 한국어 환경에서 프로필 선택 및 게임 진행
2. localStorage에서 language 필드 확인: "ko-KR"
3. 모든 UI 텍스트가 한국어로 표시되는지 확인

**기대 결과**:

- SaveGame의 language 필드: "ko-KR"
- 프로필 이름, 인벤토리, 퀘스트, 규칙 등 모든 텍스트가 한국어
- ko/en 혼합 없음

---

## 구현 완료 상태

| 항목 | 상태 |
|------|------|
| SaveGame 스키마 정의 | ✅ 완료 |
| localStorage 유틸리티 | ✅ 완료 |
| Demo Profiles 3종 | ✅ 완료 |
| DemoProfileSelect 컴포넌트 | ✅ 완료 |
| ResetButton 컴포넌트 | ✅ 완료 |
| App.tsx 통합 | ✅ 완료 |
| i18n 리소스 (ko/en) | ✅ 완료 |
| CSS 스타일 | ✅ 완료 |
| 타입체크 통과 | ✅ 완료 |
| ESLint 통과 | ✅ 완료 |
| 브라우저 테스트 | ✅ 완료 |
