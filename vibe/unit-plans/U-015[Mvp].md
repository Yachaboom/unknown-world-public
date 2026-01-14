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

- [ ] **Q1**: SaveGame 저장소는 무엇을 1순위로 둘까?
  - Option A: localStorage(권장: 단순/데모 적합)
  - Option B: IndexedDB(대용량에 유리하지만 초기 구현 부담)

## 참고 자료

- `vibe/prd.md` - Save/Load, Demo Profiles, Reset
- `.cursor/rules/00-core-critical.mdc` - RULE-010, RULE-006
