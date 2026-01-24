# U-041[Mvp]: SaveGame 마이그레이션 - migrateSaveGame 버전별 변환 로직 구현

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-041[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | RU-004      |
| 우선순위  | High        |

## 작업 목표

SaveGame 스키마(`SAVEGAME_VERSION`)가 변해도 데모 루프가 끊기지 않도록, `migrateSaveGame()`에 **버전별 마이그레이션 로직**을 구현한다. (현재는 버전 불일치 시 `null` 반환 → 리셋 유도)

**배경**: 현재 `frontend/src/save/saveGame.ts`는 `SaveGameSchema.safeParse`(strict)로 **현재 스키마만** 먼저 검증한 뒤에 `migrateSaveGame`을 호출한다. 따라서 WorldState/SaveGame 스키마가 “대폭 변경”되면 구버전 SaveGame은 parse 단계에서 탈락하고, 마이그레이션이 실행되지 못해 저장 데이터가 사실상 폐기된다. RU-004에서 “마이그레이션 훅(최소)”은 준비되었으므로, 이제 실제 변환 경로를 구현해야 한다.

**완료 기준**:

- `loadSaveGame()`이 **구버전 SaveGame을 마이그레이션한 뒤** 최신 `SaveGameSchema` 검증을 통과시켜 정상 복원된다(= “검증 → 마이그레이션”이 아니라 “버전 판별 → 마이그레이션 → 검증” 흐름).
- 최소 1개 이상의 “실제 마이그레이션 단계”가 구현되어 테스트로 검증된다(예: `1.0.0 -> 1.1.0`에서 필드 rename/default 주입).
- 지원하지 않는 버전/손상 데이터는 **안전 폴백**으로 처리된다(클린업 + profile_select 복귀 + 사용자에게 이유를 명시적으로 안내할 수 있는 훅 유지).

## 영향받는 파일

**생성**:

- (권장) `frontend/src/save/migrations.ts` - 버전별 변환 함수/체인(업그레이드 스텝) SSOT

**수정**:

- `frontend/src/save/saveGame.ts` - `loadSaveGame()`에서 버전 판별/마이그레이션을 **스키마 검증 이전**에 수행하도록 리팩토링, `migrateSaveGame` 구현 확장
- `frontend/src/save/constants.ts` - `SAVEGAME_VERSION`, `SUPPORTED_SAVEGAME_VERSIONS` 갱신 및 “지원 버전 ↔ 마이그레이션 가능 범위” 정합화
- `frontend/src/save/saveGame.test.ts` - 구버전 샘플 SaveGame 마이그레이션 테스트 추가
- (필요 시) `frontend/src/save/sessionLifecycle.ts` - 마이그레이션 실패 시 UX(안내/클린업) 경로 정합화(현재는 `null` 반환 후 profile_select 복귀)

**참조**:

- `frontend/src/save/sessionLifecycle.ts` - 복원 시 언어 적용(`changeLanguage`) 및 store hydrate 순서(SSOT)
- `vibe/refactors/RU-004-S2.md` - “Validation-First Loading + migrateSaveGame 내장” 현행 정책(업데이트 필요 지점)
- `vibe/prd.md` 6.6/8.7 - SaveGame 버전/복원 정책(마이그레이션/폴백)

## 구현 흐름

### 1단계: “버전 판별”용 최소 파서 도입

- JSON 파싱 결과에서 최소한 `version`(string)을 안전하게 추출한다(타입 가드/최소 Zod).
- `version === SAVEGAME_VERSION`이면 기존처럼 최신 스키마로 strict 검증 후 사용한다.
- 그 외의 버전이면 “구버전 마이그레이션 파이프라인”으로 진입한다.

### 2단계: 버전별 마이그레이션 체인 구현

- `migrations.ts`(권장)에 다음 형태로 변환 체인을 둔다:
  - `type Migration = { from: string; to: string; migrate: (input: unknown) => unknown }`
  - `upgradeToLatest(input, fromVersion)`이 `from -> to -> ... -> SAVEGAME_VERSION`로 순차 적용
- 각 단계에서 “누락 필드 default 주입”, “필드명 변경(예: economyLedger ↔ economy_ledger)” 등 실제 변환을 수행한다.
- 마지막에 `SaveGameSchema.safeParse`로 최신 스키마를 검증한다.

### 3단계: 테스트/폴백 UX 고정

- 최소 1개 구버전 샘플 JSON을 fixture로 두고, 마이그레이션 후 최신 스키마를 통과하는지 테스트한다.
- 실패 시 동작을 고정한다:
  - `loadSaveGame()`은 `null` 반환
  - 호출자(`sessionLifecycle`)는 `clearSaveGame()` 후 profile_select로 안전 복귀
  - (권장) “마이그레이션 실패”를 구분 가능한 로그/코드로 남겨 디버그 가능하게 한다(프롬프트/내부추론 노출 금지)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [RU-004[Mvp]](RU-004[Mvp].md) - SaveGame 생성/복원/리셋 SSOT 및 마이그레이션 훅 준비
- **결과물**: `frontend/src/save/saveGame.ts`, `frontend/src/save/constants.ts`, `frontend/src/save/sessionLifecycle.ts`

**다음 작업에 전달할 것**:

- U-025(엔딩 리포트), U-026(리플레이)에서 “세션 영속/재현성”을 깨지 않고 확장할 수 있는 기반
- CP-MVP-03(10분 데모 루프)에서 “새로고침/복원/리셋” 회귀를 줄이는 안정성 레이어

## 주의사항

**기술적 고려사항**:

- `SaveGameSchema`가 `.strict()`이므로, 마이그레이션은 “최신 스키마 검증 전”에 수행되어야 한다(현재 구조 그대로면 구버전이 영구 폐기됨).
- (RULE-006/007) 언어 혼합이 발생하지 않도록, 복원 시 `changeLanguage` 완료 후 스토어 hydrate 순서를 유지한다(`sessionLifecycle.ts` SSOT).
- (RULE-005) economy/ledger는 잔액 음수 금지 등 인바리언트를 유지해야 하며, 마이그레이션 중에도 기본값/보정 규칙을 명확히 한다.

**잠재적 리스크**:

- 마이그레이션 버그가 데모 데이터 손상/리셋 루프를 유발할 수 있음 → “버전별 단계 + 테스트 + 실패 시 안전 리셋” 3중 가드로 완화한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: 지원하지 않는 버전/손상 데이터는 어떻게 처리할까?
  - Option A: 즉시 `null` 반환 + 저장 데이터 클린업 + profile_select 복귀(권장: 데모 안정) ✅
  - Option B: 부분 복구(가능한 필드만 살려서 시작, 하지만 일관성 리스크 ↑)
  **A1**: Option A

## 참고 자료

- `frontend/src/save/saveGame.ts` - `migrateSaveGame` 현 구현(버전 불일치 시 null)
- `vibe/prd.md` - SaveGame 필드/정책(버전/폴백)
- `vibe/refactors/RU-004-S2.md` - 복원/검증 정책 히스토리
