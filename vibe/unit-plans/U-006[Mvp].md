# U-006[Mvp]: TurnInput/TurnOutput 스키마(Zod)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-006[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-002       |
| 우선순위  | ⚡ Critical |

## 작업 목표

프론트에서 TurnOutput을 렌더링하기 전에 **Zod로 strict 검증**하고, 실패 시에도 UI가 멈추지 않도록 **안전 폴백 경로**를 마련한다.

**배경**: “JSON처럼 보이는 텍스트”를 대충 파싱하면 UI/경제/안전 인바리언트가 깨진다. 클라이언트 검증은 Hard Gate의 일부다. (RULE-003)

**완료 기준**:

- TurnInput/TurnOutput Zod 스키마가 정의되고 `strict` 파싱을 수행한다.
- 스키마 실패 시에도 사용자에게 “Auto-repair/폴백” 상태를 보여주며, 최소 UI(로그/패널 자리)는 유지된다. (RULE-004/008)
- bbox/핫스팟 좌표 규약(0~1000, `[ymin,xmin,ymax,xmax]`)을 Zod 레벨에서 검증한다. (RULE-009)

## 영향받는 파일

**생성**:

- `frontend/src/schemas/turn.ts` - TurnInput/TurnOutput Zod 스키마 정의
- `frontend/src/schemas/index.ts` - 스키마 export(선택)

**수정**:

- 없음(실제 연결은 U-008에서 수행)

**참조**:

- `vibe/prd.md` 8.7 - TurnInput/TurnOutput 필드 방향
- `vibe/tech-stack.md` - Zod 버전 고정
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/006/009

## 구현 흐름

### 1단계: 서버(Pydantic) 스키마와 1:1 정합성 확보

- U-005에서 정의한 필드 구조를 기준으로 Zod 스키마를 설계한다(용어/키 이름 불일치 금지).
- enum/required 구조를 최대한 동일하게 맞춘다.

### 2단계: strict parse + 폴백 전략 정의

- `parse()` 실패 시 UI에 표시할 “안전 폴백 TurnOutput”의 최소 형태를 정의한다.
- 실패는 숨기지 않고 Agent Console에 `Schema FAIL → Auto-repair` 같은 상태로 노출한다(프롬프트 원문/CoT는 제외). (RULE-008)

### 3단계: 좌표/언어/경제 인바리언트 검증 훅 준비

- bbox 배열 길이/순서/범위를 검증한다(0~1000).
- `language`는 `"ko-KR" | "en-US"`로 고정하고 혼합 출력이 UI에 섞이지 않도록 기준을 둔다. (RULE-006)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-002[Mvp]](U-002[Mvp].md) - TypeScript 기반 프론트 실행 환경
- **계획서**: [U-005[Mvp]](U-005[Mvp].md) - 서버 스키마 구조(정합성 기준)

**다음 작업에 전달할 것**:

- U-008에서 SSE 최종 payload를 렌더링하기 전, Zod 검증/폴백을 적용할 수 있는 스키마/헬퍼

## 주의사항

**기술적 고려사항**:

- (RULE-006) UI 문자열 하드코딩을 최소화하고, language 정책과 충돌하지 않게 한다(본격 i18n은 이후 유닛에서).
- (RULE-004) 폴백도 “스키마 준수”를 목표로 하되, 최악의 경우에도 UI가 비지 않게 최소 패널을 유지한다.

**잠재적 리스크**:

- 서버/클라 스키마가 드리프트하면 repair 비용/디버깅 비용이 폭증 → RU-002/RU-010에서 “SSOT 강화”를 계획한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: TurnOutput에 `schema_version`을 포함할까?
  - Option A: 포함한다(권장: SaveGame/마이그레이션/검증에 유리)
  - Option B: 포함하지 않는다(초기 단순, 대신 앱 버전으로 관리)
  **A1**: Option A

## 참고 자료

- `vibe/prd.md` - Turn 계약/언어/좌표 규약
- `vibe/tech-stack.md` - Zod 버전 고정
- `.cursor/rules/00-core-critical.mdc` - RULE-003/004/006/009
