# [U-041[Mvp]] SaveGame 마이그레이션 - migrateSaveGame 버전별 변환 로직 구현 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-041[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-31 23:25
- **담당**: AI Agent

---

## 1. 작업 요약

SaveGame 스키마(`SAVEGAME_VERSION`)가 변경되어도 기존 저장 데이터가 폐기되지 않고 최신 스키마로 변환되어 정상 복원될 수 있도록, "버전 판별 → 마이그레이션 → 검증" 흐름의 마이그레이션 엔진을 구현하였습니다.

---

## 2. 작업 범위

- **마이그레이션 엔진 구현**: 버전별 변환 체인(`migrations.ts`)을 도입하여 순차적 업그레이드 경로 확보.
- **로딩 파이프라인 리팩토링**: `loadSaveGame()`에서 스키마 검증 전에 버전을 먼저 판별하고 마이그레이션을 수행하도록 구조 개선.
- **0.9.0 → 1.0.0 마이그레이션**: 누락 필드(`sceneObjects` 등) 추가 및 필드명 오타(`memory_shards`) 보정 로직 구현.
- **안전 폴백 강화**: 지원하지 않는 버전이나 손상된 데이터 유입 시 명확한 로그와 함께 안전하게 리셋(profile_select)되도록 처리.

---

## 3. 생성/수정 파일

_(Repomix 결과 및 실제 파일 시스템 분석 기반)_

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `frontend/src/save/migrations.ts` | 신규 | 버전별 마이그레이션 로직 및 유틸리티 SSOT |
| `frontend/src/save/migrations.test.ts` | 신규 | 마이그레이션 엔진 단위 테스트 |
| `frontend/src/save/saveGame.ts` | 수정 | `loadSaveGame` 리팩토링 및 마이그레이션 통합 |
| `frontend/src/save/constants.ts` | 수정 | 지원 버전 관련 상수 및 가이드 추가 |
| `frontend/src/save/saveGame.test.ts` | 수정 | 구버전 데이터 로드 통합 테스트 추가 |
| `vibe/unit-runbooks/U-041-runbook.md` | 신규 | 마이그레이션 검증 런북 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**주요 계약**:
- `extractVersion(data: unknown): string | null`: 최소 파싱으로 버전 식별.
- `upgradeToLatest(input: unknown, fromVersion: string): MigrationOutcome`: 최신 버전까지의 변환 체인 실행.
- `migrateSaveGame(data: unknown, version: string): unknown | null`: `saveGame.ts`에서 사용하는 마이그레이션 인터페이스.

**설계 패턴/원칙**:
- **Chain of Responsibility**: 버전별 `Migration` 객체를 연결하여 단계적 업그레이드 수행.
- **Validation-Last**: 마이그레이션이 완료된 후에만 엄격한 Zod 스키마 검증(`SaveGameSchema.safeParse`)을 수행.
- **RULE-005 준수**: 마이그레이션 과정에서 재화 잔액이 음수인 경우 기본값으로 보정하여 경제 인바리언트 보호.

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: `localStorage`의 `unknown_world_savegame` 데이터가 로드 시점에 자동으로 최신 버전으로 변환되어 다시 저장될 수 있는 기반 마련.
- **UX**: 구버전 사용자가 업데이트 후에도 세션을 잃지 않고 플레이를 지속할 수 있음.

### 4.3 가정 및 제약사항

- 다운그레이드(예: 1.0.0 → 0.9.0)는 지원하지 않으며, 무시됩니다.
- 마이그레이션 도중 발생하는 예외는 전체 복원 실패(`null`)로 간주되어 안전하게 리셋됩니다.

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-041-savegame-migration-runbook.md`
- **실행 결과**: 구버전(0.9.0) 주입 후 새로고침 시 1.0.0으로의 변환 및 정상 복원 확인 완료.
- **참조**: 상세 테스트 시나리오는 해당 런북 파일 참조.

---

## 6. 리스크 및 주의사항

- **스키마 불일치**: 마이그레이션 결과물이 `SaveGameSchema`와 일치하지 않으면 로드가 실패하므로, 스키마 변경 시 `migrations.ts`도 반드시 함께 업데이트해야 합니다.

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1. **U-025[Mvp]**: 엔딩 리포트 생성 로직에 마이그레이션된 상태 반영 확인.
2. **CP-MVP-03**: 10분 데모 루프에서 세션 복원 안정성 최종 점검.

### 7.2 의존 단계 확인

- **선행 단계**: RU-004[Mvp] (완료)
- **후속 단계**: U-042[Mvp] (용어 정리)

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
