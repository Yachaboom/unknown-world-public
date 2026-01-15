# U-039[Mvp]: i18n 언어 리소스 JSON 구조 도입 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-039[Mvp]
- **단계 번호**: 4.1 (i18n 인프라)
- **작성 일시**: 2026-01-15 11:30
- **담당**: AI Agent

---

## 1. 작업 요약

프론트엔드 UI 및 시스템 문구를 i18n 키 기반으로 체계화하고, 언어 리소스를 JSON 파일 구조(`ko-KR`, `en-US`)로 분리하여 다국어 지원 및 확장성을 확보했습니다. 하드코딩된 문자열을 제거하고 `i18next`를 통한 동적 렌더링 체계를 구축했습니다.

---

## 2. 작업 범위

- **i18n 초기화 모듈 구축**: `frontend/src/i18n.ts`에서 BCP-47 언어 코드(`ko-KR`, `en-US`) 기반 초기화 및 JSON 리소스 동적 로드 구현.
- **언어 리소스 분리**: 하드코딩된 문자열을 `frontend/src/locales/` 디렉토리 하위의 `translation.json` 파일로 이관.
- **UI 컴포넌트 리팩토링**: `App.tsx`, `AgentConsole.tsx` 등 주요 컴포넌트에서 하드코딩된 텍스트를 `useTranslation` 훅의 `t()` 함수로 교체.
- **규약 준수**: RULE-006(ko/en 혼합 출력 금지) 및 PRD의 언어 지원 정책(3.1, 8.7)을 기술적으로 강제.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/i18n.ts` | 수정 | JSON 리소스 기반 i18n 초기화 및 유틸리티 함수(changeLanguage 등) 추가 |
| `frontend/src/locales/ko-KR/translation.json` | 신규 | 한국어(ko-KR) UI/내러티브 리소스 SSOT |
| `frontend/src/locales/en-US/translation.json` | 신규 | 영어(en-US) UI/내러티브 리소스 SSOT |
| `frontend/src/locales/README.md` | 신규 | i18n 리소스 관리 규칙 및 추가 절차 가이드 |
| `frontend/src/App.tsx` | 수정 | UI 레이아웃 및 하드코딩 문자열 i18n 전환 |
| `frontend/src/components/AgentConsole.tsx` | 수정 | 에이전트 상태/배지/큐 라벨 i18n 전환 |
| `frontend/src/main.tsx` | 수정 | i18n 모듈 임포트 확인 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**i18n 초기화 및 타입 정의 (`frontend/src/i18n.ts`)**:
- `SupportedLanguage = 'ko-KR' | 'en-US'`: TurnInput과 일치하는 언어 코드 정의.
- `DEFAULT_LANGUAGE = 'ko-KR'`, `FALLBACK_LANGUAGE = 'en-US'`: 폴백 정책 수립.
- `changeLanguage(lang)`: 비동기 언어 전환 인터페이스 제공.

**리소스 계층 구조**:
- `scene.*`: 장면 이미지 상태 및 메타데이터 관련
- `agent.console.*`: 에이전트 오케스트레이션 단계 및 배지 관련
- `panel.*`: 각 사이드바 패널의 타이틀 및 플레이스홀더
- `economy.*`: 재화 라벨 및 비용 관련
- `narrative.*`: 내레이션 및 턴 정보 관련

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `vibe/prd.md`의 언어 규약에 맞춰 `ko`, `en` 대신 `ko-KR`, `en-US`를 사용하도록 정합화되었습니다.
- **프론트엔드**: 모든 신규 UI 작업 시 `t()` 함수 사용이 강제되며, JSON 리소스에 키를 추가하지 않으면 경고가 발생합니다.

### 4.3 가정 및 제약사항

- **가정**: 사용자는 기본적으로 한국어(`ko-KR`) 환경에서 시작하며, 필요 시 수동으로 영어로 전환할 수 있습니다.
- **제약**: 현재 UI에는 언어 전환 토글이 없으며(U-036 예정), 개발자 콘솔이나 API 호출을 통해서만 변경 가능합니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-039-i18n-json-structure-runbook.md`
- **실행 결과**: 한국어/영어 전환 및 리소스 로드 정상 작동 확인. 콘솔 경고 없음.
- **참조**: 상세 테스트 시나리오는 위 런북 파일 참조.

---

## 6. 리스크 및 주의사항

- **키 누락**: 새로운 UI 요소 추가 시 JSON 리소스에 키를 누락할 경우 텍스트 대신 키 이름이 표시될 수 있습니다. (개발 모드 콘솔 경고로 감지 가능)
- **언어 코드 일관성**: 서버 응답(`TurnOutput`)의 `language` 필드와 프론트엔드의 i18n 언어 코드가 BCP-47 형식(`ko-KR`, `en-US`)으로 일치해야 합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-036**: Header에 실제 언어 전환 UI 토글 구현.
2. **U-015**: SaveGame(로컬 스토리지)에 선택된 언어 상태 저장 및 복구 기능 추가.

### 7.2 의존 단계 확인

- **선행 단계**: U-004[Mvp] (완료)
- **후속 단계**: U-036 (로드맵 참조)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지 (BCP-47)
- [x] 하드코딩 문자열 100% 제거 (주요 컴포넌트 기준)

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
