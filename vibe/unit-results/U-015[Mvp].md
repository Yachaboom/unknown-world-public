# [SaveGame(local) + Reset + Demo Profiles(3종)] 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-015[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-19 14:30
- **담당**: AI Agent

---

## 1. 작업 요약

로그인 없이 즉시 시작 가능한 **데모 프로필 3종**(Narrator/Explorer/Tech Enthusiast)과 **즉시 리셋**, 그리고 SaveGame(JSON) 기반 **세이브/로드(로컬)** 기능을 구현하여 심사자 온보딩 10초 및 데모 반복 가능성을 확보함.

---

## 2. 작업 범위

- **SaveGame 시스템**: Zod 스키마 기반의 상태 직렬화 및 localStorage 연동 유틸리티 구현.
- **데모 프로필**: 페르소나별 초기 상태(재화, 인벤토리, 퀘스트, 룰, 씬 오브젝트) 정의 및 i18n 통합.
- **프로필 선택 UI**: 게임 시작 전 프로필을 선택하거나 기존 게임을 계속할 수 있는 랜딩 화면 구현.
- **리셋/변경 기능**: 플레이 중 즉시 초기 상태로 복구하거나 프로필을 변경할 수 있는 UI 및 로직 구현.
- **상태 통합**: `App.tsx`에서 세션 생명주기 관리 및 턴 완료 시 자동 저장 기능 연동.

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/save/saveGame.ts` | 신규 | SaveGame 스키마 정의 및 localStorage 저장/로드 유틸리티 |
| `frontend/src/data/demoProfiles.ts` | 신규 | 데모 프로필 3종 초기 데이터 및 변환 로직 |
| `frontend/src/components/DemoProfileSelect.tsx` | 신규 | 프로필 선택 및 계속하기 랜딩 UI 컴포넌트 |
| `frontend/src/components/ResetButton.tsx` | 신규 | 즉시 리셋(확인 모드 포함) 및 프로필 변경 버튼 |
| `frontend/src/App.tsx` | 수정 | 게임 페이즈(profile_select/playing) 관리 및 스토어 동기화 |
| `frontend/src/style.css` | 수정 | 프로필 카드, 리셋 버튼 및 랜딩 화면 스타일 추가 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**SaveGame 데이터 구조**:
- `version`: '1.0.0' (스키마 마이그레이션 대비)
- `language`: 'ko-KR' | 'en-US' (복원 시 UI 언어 동기화, RULE-006 준수)
- `world_state`: 턴 카운트, 퀘스트, 활성 규칙, 타임라인, 씬 오브젝트 포함
- `economy`: Signal/Shard 잔액 및 Ledger(원장) 이력 포함

**데모 프로필 전략**:
- **Narrator**: 재화 풍부(Signal 200), 스토리 중심 아이템/퀘스트.
- **Explorer**: 균형 잡힌 상태, 탐색 도구 및 구역 탐험 퀘스트.
- **Tech Enthusiast**: 제한된 재화(Signal 80), 시스템 분석 및 자원 최적화 퀘스트.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `localStorage`의 `unknown_world_savegame` 키를 사용하여 약 5~10KB 내외의 JSON 데이터 저장.
- **i18n**: 프로필 데이터 로드 시점에 `i18next` 언어를 동기화하여 혼합 출력 방지.
- **상태 관리**: `worldStore`, `inventoryStore`, `economyStore`의 `reset()` 및 `setState()`를 통한 원자적 상태 복원.

### 4.3 가정 및 제약사항

- MVP 단계에서는 `localStorage` 용량 제한을 고려하여 세이브 데이터 압축은 생략함.
- 브라우저 시크릿 모드 등 `localStorage` 접근 불가 환경에서는 세이브 기능이 동작하지 않으며, 메모리 내 세션으로만 유지됨.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-plans/U-015[Mvp].md` 내 런북 섹션 참조
- **실행 결과**: 프로필 선택 → 게임 진행 → 새로고침 → 복원 → 리셋으로 이어지는 데모 루프 검증 완료
- **테스트 결과**: 타입체크(tsc) 및 린트(ESLint) 통과 확인

---

## 6. 리스크 및 주의사항

- **스키마 변경**: 향후 `TurnOutput`이나 스토어 구조 변경 시 `SaveGameSchema`도 함께 업데이트하고 마이그레이션 로직을 보강해야 함.
- **언어 동기화**: `changeLanguage` 호출 시 비동기 로딩 지연이 발생할 수 있으므로, 중요 텍스트 렌더링 전 언어 확정 보장 필요.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-016[Mvp]**: Vertex AI 서비스 계정 연동 및 실모델 API 클라이언트 구축.
2. **U-017[Mvp]**: Structured Output 기반의 실모델 턴 생성 파이프라인 연결.

### 7.2 의존 단계 확인

- **선행 단계**: U-014[Mvp] (Economy Ledger) 완료
- **후속 단계**: U-016[Mvp] (Vertex AI Setup)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인 (프로필 3종, 리셋, 세이브)
- [x] RULE-010(DB 금지) 및 RULE-006(언어 일관성) 준수
- [x] 테마 및 스타일 가이드(CRT 미학) 유지
- [x] 저장된 게임 복원 시 모든 스토어 동기화 확인

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._