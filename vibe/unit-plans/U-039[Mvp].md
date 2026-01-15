# U-039[Mvp]: i18n 언어 리소스 JSON 구조 도입(ko-KR/en-US, 확장 가능)

## 메타데이터

| 항목      | 내용       |
| --------- | ---------- |
| Unit ID   | U-039[Mvp] |
| Phase     | MVP        |
| 예상 소요 | 60분       |
| 의존성    | U-004      |
| 우선순위  | High       |

## 작업 목표

프론트 UI/시스템 문구를 **i18n 키 기반**으로 정리하고, 언어 리소스를 **JSON 파일 구조**(`ko-KR`, `en-US`)로 분리하여 **한/영 + 추후 언어 확장**이 “파일 추가”만으로 가능해지도록 기반을 만든다.

**배경**: PRD는 `ko-KR/en-US` 2개 국어를 기본 지원하고(3.1), 언어 혼합 출력 금지(RULE-006/007)를 요구한다. 현재는 일부 UI 문자열이 코드에 하드코딩되어(혼합 표기 포함) 정책 위반 리스크가 있으며, 리소스가 TS 인라인이면 언어 확장이 어렵다. 따라서 **JSON 리소스 SSOT + 키 기반 사용처 정리**가 필요하다.

**완료 기준**:

- `frontend/src/locales/{ko-KR,en-US}/translation.json` 형태의 **JSON 언어 파일 구조**가 생성되고, 최소 “Scene/Agent Console/공통 UI(입력/상태)” 키가 정의된다.
- `frontend/src/i18n.ts`가 TS 인라인 리소스 대신 **JSON 리소스**를 로드하며, 언어 코드를 `ko-KR`, `en-US`로 정합화한다(= TurnInput/SaveGame의 `language`와 동일 축).
- “중요 표면(critical)”의 UI 문자열(예: Agent Console 라벨/상태, 연결 상태, 커맨드 입력 placeholder/버튼)이 **하드코딩이 아닌 `t('...')` 키 기반**으로 렌더링된다.
- (권장) `frontend/src/locales/README.md`에 “새 언어 추가 절차/키 규칙/금지사항(텍스트를 이미지에 넣지 않기)”이 기록된다.

## 영향받는 파일

**생성**:

- `frontend/src/locales/ko-KR/translation.json` - 한국어 리소스(SSOT)
- `frontend/src/locales/en-US/translation.json` - 영어 리소스(SSOT)
- (권장) `frontend/src/locales/README.md` - 언어 파일 구조/키 규칙/추가 절차

**수정**:

- `frontend/src/i18n.ts` - JSON 리소스 로드 + `ko-KR/en-US` 코드 정합화 + fallback 설정
- `frontend/src/App.tsx` - 하드코딩 UI 문자열을 `t()`로 치환(혼합 표기 제거), (선택) TurnInput.language를 i18n 언어와 동기화할 준비
- `frontend/src/components/AgentConsole.tsx` - 라벨/상태/배지 영역을 `t()` 기반으로 전환(혼합 표기 제거)
- `frontend/src/components/SceneCanvas.tsx` - (필요 시) alt/상태 메시지 등 누락된 키 정리
- `frontend/src/components/*.test.tsx` - (필요 시) 번역 문자열 단언 방식 조정(키/번역값 기반)

**참조**:

- `vibe/prd.md` - 3.1(지원 언어), 7(언어 선택 흐름), 8.7(TurnInput.language), 10.2(Hot controls), 9장(고정 UI)
- `vibe/tech-stack.md` - i18next/react-i18next 스택(SSOT)
- `.cursor/rules/00-core-critical.mdc` - RULE-006/007(i18n/언어 혼합 금지)

## 구현 흐름

### 1단계: 언어 코드/키 체계 확정(SSOT)

- 언어 코드는 **BCP-47** 형태로 고정한다: `ko-KR`, `en-US` (TurnInput/SaveGame/백엔드 프롬프트 로더와 동일 축).
- 키 네이밍은 “도메인.섹션.항목” 형태를 유지한다(예: `scene.status.loading`, `agent.console.badges_empty`, `ui.execute`).
- MVP에서는 i18next 기본 네임스페이스(`translation`) 1개로 시작하고, 키가 200+로 커지면 `common/ui/agent/scene` 네임스페이스 분리를 고려한다(MMP 후보).

### 2단계: JSON 언어 파일 생성 + 기존 리소스 마이그레이션

- 기존 `frontend/src/i18n.ts`의 `resources`(TS 인라인) 내용을 `translation.json`으로 이동한다.
- 현재 하드코딩된 UI 문자열 중 “혼합 표기”가 있는 항목을 우선 키로 만든다:
  - Agent Console 라벨/상태(Idle/Processing, Queue/Badges/Auto-repair 등)
  - Header 연결 상태/재화 라벨, 커맨드 입력 영역(placeholder/버튼)
- **금지**: 텍스트를 아이콘/이미지에 박지 않는다(언어/i18n/리사이즈 문제, U-038 주의사항과 동일 원칙).

### 3단계: i18n 초기화 코드 정합화(ko-KR/en-US)

- `frontend/src/i18n.ts`에서 JSON 리소스를 import하여 `resources: { "ko-KR": { translation: ... }, "en-US": ... }`로 구성한다.
- 기본 언어는 `ko-KR`로 고정하되, 향후 U-015(SaveGame) 또는 별도 유닛에서 localStorage/SaveGame으로부터 복원하는 경로를 추가할 수 있게 설계한다.
- `fallbackLng`는 `en-US`로 설정하되, **언어 혼합 UI**가 발생하지 않도록 “언어 선택 UI(사용자 노출)”는 백엔드 언어 파이프라인(U-036)과 함께 enable 한다.

### 4단계: 핵심 UI 문자열을 `t()`로 전환(혼합 제거)

- `AgentConsole.tsx`의 라벨/상태/빈 상태 문구를 `t()`로 전환한다.
- `App.tsx`의 패널 타이틀/placeholder/버튼 라벨 등 사용자 노출 문자열을 키 기반으로 치환한다.
- (선택) TurnInput.language를 `i18n.resolvedLanguage`(또는 별도 state)와 동기화할 “훅/상태”를 추가한다.  
  단, U-036 완료 전에는 언어 토글을 사용자에게 노출하지 않도록 가드한다(혼합 출력 금지).

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - Header에 “언어 토글 자리”가 이미 정의되어 있음(노출 시점은 별도 가드)
- **결과물**: `frontend/src/i18n.ts`(현행 TS 인라인 리소스), `SceneCanvas`의 i18n 키 사용 패턴

**다음 작업에 전달할 것**:

- U-015(SaveGame)에서 `language` 저장/복원 시, UI i18n 언어를 동일 값으로 복원할 수 있는 기반
- U-036(프롬프트 ko/en 분리) 완료 후 “UI + 내러티브”를 **동일 언어로 end-to-end 전환**할 수 있는 프론트 기반
- 이후 유닛에서 하드코딩 문자열이 늘어나는 것을 방지하는 규칙/구조(키 기반 SSOT)

## 주의사항

**기술적 고려사항**:

- (RULE-006/007) UI/시스템 문구는 언어 선택에 따라 **단일 언어로만** 보여야 한다(동일 화면에 ko/en 혼합 금지).
- JSON 리소스는 “파일이 곧 SSOT”이므로, 키 변경/삭제는 최소화하고(추후 마이그레이션 비용), 신규 키는 도메인 기준으로 추가한다.
- 번역 누락 시 i18next fallback으로 “다른 언어 문자열”이 노출될 수 있음 → 사용자 노출 토글은 U-036과 함께 enable 하고, QA 체크리스트에 “누락 키 탐지”를 포함한다.

**잠재적 리스크**:

- UI 문자열을 일부만 키 기반으로 바꾸면 혼합 표기가 남음 → “critical 표면”부터 우선 전환하고, 신규 UI는 하드코딩 금지 원칙을 적용한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: i18n JSON 파일 구조를 어떻게 시작할까?
  - Option A: `translation.json` 1개(언어당)로 시작(권장: MVP 단순) ✅
  - Option B: `common/ui/agent/scene.json` 네임스페이스 분리(확장성 ↑, 초기 파일 수 ↑)
  **A1**: Option A

- [x] **Q2**: 기본 언어 결정은 어떻게 할까?
  - Option A: `ko-KR` 고정(권장: 데모 일관성) ✅
  - Option B: `navigator.language` 감지 + 로컬 저장(편의 ↑, 하지만 QA/데모 일관성 ↓)
  **A2**: Option A

## 참고 자료

- `vibe/prd.md` - 3.1(지원 언어), 8.7(TurnInput.language), 10.2(Hot controls)
- `vibe/tech-stack.md` - i18next/react-i18next 버전/사용
- `frontend/src/i18n.ts` - 현행 i18n 초기화(이 유닛에서 JSON 구조로 전환)

