# U-044[Mvp]: 세션 언어 SSOT(토글=리셋) + 혼합 출력(상태/시스템) 제거

## 메타데이터

| 항목      | 내용             |
| --------- | ---------------- |
| Unit ID   | U-044[Mvp]       |
| Phase     | MVP              |
| 예상 소요 | 60분             |
| 의존성    | U-015,U-039,U-043 |
| 우선순위  | High             |

## 작업 목표

한 화면에서 ko/en이 섞여 보이는 문제(예: `vibe/ref/en-ko-issue.png`)를 프론트 관점에서 재발 방지하기 위해,
**세션 언어를 SSOT로 고정**하고(언어 전환은 “리셋/새 세션”로만 허용), 시스템/폴백 메시지의 하드코딩·드리프트를 제거한다.

**배경**:

- TurnInput 언어는 UI(i18n) 상태 변화/비동기 복원 타이밍에 따라 드리프트할 수 있고, 그 결과 서버 응답(영어)과 기존 월드 상태(한국어)가 동시에 노출될 수 있다.
- 클라이언트 폴백 메시지(네트워크/파싱 에러 등)에는 하드코딩된 영어 문구가 남아 있어, 언어 정책(RULE-006/007)을 깨기 쉽다.
- MVP에서 “기존 월드 텍스트를 즉시 번역”하는 것은 범위가 크므로, **언어 전환 = 새 세션(Reset/Change Profile)** 정책으로 단순화한다.

**완료 기준**:

- TurnInput.language가 “현재 세션 언어(SSOT)”를 따르며, i18n의 일시적인 resolvedLanguage 변화로 드리프트하지 않는다.
- 언어 전환 UI는 `profile_select`(게임 시작 전)에서만 안전하게 제공하거나, `playing` 중에는 **확인 후 리셋/새 세션**으로만 동작한다(기존 상태 번역 없음).
- `frontend/src/api/turnStream.ts` 내 클라이언트 폴백/에러 메시지의 하드코딩(영문 고정 포함)이 제거되어, 입력 언어 기준으로 단일 언어로만 노출된다.
- 재현 시나리오(언어 변경→턴 실행/오프라인 폴백)에서 한 화면에 ko/en 혼합이 발생하지 않는다.

## 영향받는 파일

**생성**:

- (선택) `frontend/src/components/LanguageToggle.tsx` - 프로필 선택 화면용 언어 선택(또는 헤더 컨트롤 확장)

**수정**:

- `frontend/src/save/sessionLifecycle.ts` - 세션 언어 SSOT(저장/복원/리셋/프로필 변경) 흐름에 “언어 전환=리셋” 정책을 명시하고 API 제공
- `frontend/src/App.tsx` - 세션 언어를 Turn Runner에 주입하고(의존성), `profile_select`에서 언어 선택 UI를 제공(또는 기존 버튼에 포함)
- `frontend/src/turn/turnRunner.ts` - `getResolvedLanguage()` 직접 호출 제거, 외부에서 주입된 “세션 언어”로 TurnInput 생성
- `frontend/src/api/turnStream.ts` - `'Unknown error (malformed error event)'` 등 하드코딩 에러/폴백 메시지 언어 분기
- (필요 시) `frontend/src/locales/{ko-KR,en-US}/translation.json` - 언어 선택 UI/에러 문구 키 추가(키 기반으로 정리할 경우)

**참조**:

- `vibe/ref/en-ko-issue.png` - 혼합 출력 사례
- `vibe/prd.md` - 3.1~3.3(언어 정책), 9.0/10.2(언어 토글), 10.5(Hard gate)
- `.cursor/rules/00-core-critical.mdc` - RULE-006/007(혼합 금지), RULE-004(폴백)
- `frontend/src/i18n.ts` - DEFAULT/FALLBACK 언어 정책(ko-KR 기본)

## 구현 흐름

### 1단계: “세션 언어” SSOT 확정 및 전파 경로 정리

- 세션 언어의 단일 출처를 `SaveGame.language`로 확정한다.
- 앱 부팅/Continue/Reset/Change Profile 흐름에서 i18n 언어와 SaveGame.language를 **항상 동기화**한다(드리프트 감지 시 강제 교정).

### 2단계: TurnInput.language를 “세션 언어 주입” 방식으로 고정

- `turnRunner.buildTurnInput()`에서 `getResolvedLanguage()` 호출을 제거한다.
- `createTurnRunner({ ..., language })`처럼 외부에서 언어를 주입받고, TurnInput 생성은 해당 값을 사용한다.
- App은 sessionLifecycle로부터 “현재 세션 언어”를 받아 TurnRunner 의존성으로 주입한다(렌더/스트림 중 드리프트 방지).

### 3단계: 언어 전환 정책 구현(토글=리셋)

- MVP 정책:
  - `profile_select`: 언어 선택 가능(즉시 i18n 적용, 이후 생성되는 SaveGame.language도 동일)
  - `playing`: 언어 변경은 “기존 상태 번역”이 아니라 **확인 후 reset(또는 profile_select로 복귀)** 로만 처리
- 언어 전환 시에는 다음을 보장한다:
  - 기존 narrative/quest/rule/inventory 텍스트 잔재가 남지 않는다
  - 다음 턴의 TurnInput.language가 확실히 새 언어로 전환된다

### 4단계: 클라이언트 폴백/에러 문자열의 혼합 제거

- `turnStream.ts`에서 언어 고정(영문 only) 메시지를 제거/분기 처리한다.
- 네트워크 오류/파싱 오류/Invalid error event 등도 입력 언어 기준으로 단일 언어로만 사용자에게 노출되게 한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-015[Mvp]](U-015[Mvp].md) - SaveGame/Reset/프로필 선택(세션 경계)
- **계획서**: [U-039[Mvp]](U-039[Mvp].md) - i18n JSON 리소스/언어 코드 SSOT
- **계획서**: [U-043[Mvp]](U-043[Mvp].md) - 서버 측 언어 혼합 게이트(Repair)
- **결과물**: `sessionLifecycle`의 언어 복원(`await changeLanguage`) 패턴(RU-004-S1) 및 Turn Runner 구조(RU-003)

**다음 작업에 전달할 것**:

- CP-MVP-05/CP-MVP-03에서 “언어 혼합 없음”을 UI까지 포함해 재현 가능하게 검증할 수 있는 기준선
- 이후 헤더에 언어 토글을 넣더라도(PRD 9.0/10.2), 혼합 출력 없이 안전하게 동작하는 정책(토글=리셋)

## 주의사항

**기술적 고려사항**:

- “언어 전환 즉시 번역”은 MVP 범위 밖으로 두고, 세션 경계로 문제를 제거한다(혼합 출력 방지 우선).
- 에러/폴백 메시지도 사용자 노출 텍스트이므로 i18n 정책을 적용한다(영문 하드코딩 금지).

**잠재적 리스크**:

- 언어 전환이 잦으면 리셋이 번거로울 수 있음 → MVP에서는 “데모/심사자 오해 방지(혼합 금지)”가 더 우선이며, MMP에서 “상태 번역/마이그레이션”을 별도 유닛으로 고려

## 페어링 질문 (결정 필요)

- [x] **Q1**: 언어 전환 UI를 어디에 둘까?
  - Option A: `profile_select`에서만 제공(권장: 혼합 원천 차단)
  - Option B: 헤더에도 제공하되, `playing`에서는 “리셋 동반” 강제
  **A1**: Option A

- [x] **Q2**: 클라이언트 에러 메시지를 i18n 키로 관리할까?
  - Option A: 단순 분기(ko/en)로 시작(빠름, MVP)
  - Option B: `translation.json` 키로 승격(일관성↑, 키 추가 필요)
  **A2**: Option B

## 참고 자료

- `vibe/ref/en-ko-issue.png` - 혼합 출력 사례
- `frontend/src/turn/turnRunner.ts` - TurnInput 생성(언어 포함) 경로
- `frontend/src/api/turnStream.ts` - 클라이언트 폴백/에러 문자열
- `frontend/src/save/sessionLifecycle.ts` - 세션 경계(부팅/복원/리셋) SSOT

