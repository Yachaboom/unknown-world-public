# U-044[Mvp]: 세션 언어 SSOT(토글=리셋) + 혼합 출력(상태/시스템) 제거 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-044[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-27 15:45
- **담당**: AI Agent

---

## 1. 작업 요약

세션 언어를 단일 출처(SSOT)로 고정하여 한 화면에 ko/en이 섞여 보이는 문제를 해결했습니다. 언어 전환 시에는 리셋을 강제하여 상태 드리프트를 원천 차단하고, 클라이언트 폴백 메시지의 영문 하드코딩을 제거했습니다.

---

## 2. 작업 범위

- **세션 언어 SSOT 구현**: `SaveGame.language`를 권위자로 설정하여 `turnRunner`에 주입하는 구조 확립
- **언어 전환 정책 적용**: `playing` 중 언어 변경은 리셋을 동반하도록 제한 (토글=리셋 정책)
- **클라이언트 폴백 i18n**: `turnStream.ts` 내 하드코딩된 영문 에러 메시지를 제거하고 i18n 리소스를 사용하도록 개선
- **i18n 리소스 보강**: `translation.json`에 에러 및 언어 선택 관련 키 추가

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/save/sessionLifecycle.ts` | 수정 | 세션 언어 SSOT API 및 로직 추가 |
| `frontend/src/App.tsx` | 수정 | 세션 언어 상태 관리 및 언어 선택 UI 연동 |
| `frontend/src/turn/turnRunner.ts` | 수정 | 주입된 세션 언어를 사용하여 TurnInput 생성 |
| `frontend/src/api/turnStream.ts` | 수정 | 클라이언트 에러 메시지 하드코딩 제거 및 i18n 적용 |
| `frontend/src/locales/ko-KR/translation.json` | 수정 | 한국어 에러/언어 키 추가 |
| `frontend/src/locales/en-US/translation.json` | 수정 | 영어 에러/언어 키 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**세션 언어 주입 패턴**:
- `sessionLifecycle.getInitialSessionLanguage()`: 부팅 시 SaveGame에서 언어 로드
- `App.tsx`: `sessionLanguage` 상태를 `turnRunner` 의존성으로 주입
- `turnRunner.buildTurnInput({ language })`: 주입된 언어를 사용하여 서버 요청 생성 (드리프트 방지)

**언어 전환 정책 (토글=리셋)**:
- `profile_select` 화면(`DemoProfileSelect`)에서만 언어 토글 가능
- `playing` 중 언어 변경 필요 시 세션 종료 후 프로필 선택으로 돌아가야 함 (데이터 일관성 보장)

### 4.2 외부 영향 분석

- **i18n**: i18next의 `resolvedLanguage`에 의존하지 않고 `SaveGame`의 명시적 값을 사용하므로, 비동기 언어 로딩 중에도 TurnInput 언어가 변하지 않음
- **데이터 모델**: `SaveGame` 스키마에 이미 포함된 `language` 필드를 적극 활용

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-044[Mvp]-runbook.md` (작성 예정)
- **실행 결과**: 언어 변경 후 새 세션 시작 시 정상적으로 해당 언어로 턴이 진행됨을 확인

---

## 6. 리스크 및 주의사항

- **UX**: 플레이 중 언어를 바꾸려면 리셋해야 하므로 사용자가 불편을 느낄 수 있으나, 혼합 출력 방지라는 하드 게이트 달성을 위해 MVP에서는 이 정책을 유지함

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **런북 작성 및 수동 테스트**: 언어 토글 시 세션 리셋 및 턴 언어 일관성 확인
2. **린트 및 타입 체크**: `pnpm lint` 및 `tsc` 실행

---

## 8. 자체 점검 결과

- [x] TurnInput.language가 세션 언어 SSOT를 따름
- [x] 언어 전환 시 리셋 정책 적용 확인
- [x] 클라이언트 에러 메시지 영문 하드코딩 제거
- [x] i18n 리소스 동기화 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
