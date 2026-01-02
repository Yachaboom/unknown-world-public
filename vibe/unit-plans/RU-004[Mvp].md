# RU-004[Mvp]: 리팩토링 - SaveGame/초기상태/데모 프로필 정리

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | RU-004[Mvp] |
| Phase     | MVP         |
| 예상 소요 | 45분        |
| 의존성    | U-015       |
| 우선순위  | High        |

## 작업 목표

Demo Profiles/Reset/SaveGame이 추가되며 생기는 중복/불일치를 제거하고, “데모 반복성”을 최우선으로 구조를 정리한다(동작 변경 없이).

**배경**: 데모 프로필은 심사자 경험의 핵심이며, 리셋이 불안정하면 데모가 곧바로 무너진다. (PRD 6.9)

**완료 기준**:

- 프로필 프리셋/초기 SaveGame/리셋 로직이 단일 소스로 정리되어 중복이 줄어든다.
- SaveGame `version`/마이그레이션 훅(최소)이 준비되어 이후 스키마 변경에 대비한다.
- 로드/리셋/저장 흐름이 “채팅 앱” 방향으로 UI가 퇴행하지 않도록 HUD 중심 플로우가 유지된다. (RULE-002)

## 영향받는 파일

**생성**:

- (선택) `frontend/src/save/migrations.ts` - SaveGame 버전 마이그레이션 훅

**수정**:

- `frontend/src/save/saveGame.ts` - 버전/기본값/검증 정리
- `frontend/src/data/demoProfiles.ts` - 프로필 프리셋 중복 제거
- `frontend/src/App.tsx` - 초기화/리셋/로드 경계 정리

**참조**:

- `vibe/prd.md` 6.6/6.9 - Save/Load, Demo Profiles, Reset 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-010(DB 금지), RULE-006(language)

## 구현 흐름

### 1단계: “초기 상태의 SSOT”를 명확히 하기

- Reset의 SSOT는 “프로필 초기 SaveGame”임을 코드 구조로 고정한다.
- 임시 스냅샷/전역 변수 등으로 리셋을 구현하지 않도록 정리한다.

### 2단계: SaveGame 검증/기본값 정리

- `version` 기반으로 기본값/누락 필드를 보정하는 최소 로직을 둔다.
- 향후 TurnOutput/WorldState 스키마 확장 시에도 리셋/로드가 깨지지 않게 대비한다.

### 3단계: 데모 반복성(회귀) 관점에서 단순화

- 프로필별로 “10분 루프” 데모가 빠르게 가능한지 다시 점검하고, 과도한 분기/복잡도를 줄인다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-015[Mvp]](U-015[Mvp].md) - Demo Profiles/Reset/SaveGame 초기 구현

**다음 작업에 전달할 것**:

- U-025(엔딩 리포트) 및 U-026(리플레이)에서 사용할 “안정적 세션/아티팩트 기반”
- CP-MVP-03에서 “반복 데모”의 신뢰성 기준선

## 주의사항

**기술적 고려사항**:

- (RULE-010) DB/ORM을 도입해 리셋/세이브를 해결하려 하지 않는다(문서 합의 전 금지).
- (RULE-006) 언어 정책은 SaveGame 복원에도 그대로 적용되어야 한다(혼합 출력 금지).

**잠재적 리스크**:

- 리팩토링 중 “리셋 결과”가 미묘하게 바뀔 수 있음 → Behavior Preservation을 지키고, CP-MVP-02 시나리오로 재검증한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: Demo Profiles 프리셋은 어디에 두는 게 좋을까?
  - Option A: `frontend/src/data/demoProfiles.ts` 같은 코드 기반(권장: 타입 안정)
  - Option B: `frontend/public/demo-profiles/*.json` 같은 데이터 파일(편집 용이)

## 참고 자료

- `vibe/prd.md` - 데모프로필/리셋 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-010, RULE-006
