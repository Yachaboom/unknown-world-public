# U-046[Mvp]: 분리 프롬프트(.md) XML 태그 규격 통일(메타/섹션) + 로더 파싱 단일화

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-046[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 75분        |
| 의존성    | U-036[Mvp]  |
| 우선순위  | High        |

## 작업 목표

분리된 프롬프트 파일(`backend/prompts/**/*.md`)의 **메타데이터/섹션 경계를 XML 태그로 통일**하여, 장기 튜닝(버전/정책)과 ko/en 분리 정책을 더 안정적으로 운영한다.

**배경**: 현재 프롬프트는 “마크다운 + 메타(레거시 프론트매터)” 형태로 운용 중이며, 향후 프롬프트 편집/확장 과정에서 포맷이 섞이거나 드리프트되면 메타 추적/검증/핫리로드가 흔들릴 수 있다. 또한 “프롬프트를 JSON 파일로 전환”하는 접근은 문서/운영 복잡도를 증가시키므로 제거하고, **.md 유지 + XML 태그 표준**으로 정리한다. (PRD 3.2/10.4, R-008)

**완료 기준**:

- `backend/prompts/**`의 주요 프롬프트(시스템/턴/이미지)가 **동일한 XML 태그 규격**(메타/본문 구분, 필수 메타 키)을 따른다.
- `prompt_loader`가 XML 태그 기반 메타를 안정적으로 추출하고(또는 레거시 포맷 폴백), 모델에 전달되는 프롬프트 본문이 의도대로 유지된다.
- ko/en 혼합 정책이 깨지지 않는다: `language` 메타가 파일/세션 언어와 정합이며, 한 파일에 2개 언어 콘텐츠를 섞지 않는다.
- 프롬프트 원문이 로그/스트림으로 노출되지 않는다(메타만 기록). (RULE-007/008)

## 영향받는 파일

**생성**:

- (권장) `vibe/unit-runbooks/U-046-prompt-xml-tags-runbook.md` - XML 태그 포맷/파싱 검증 런북

**수정**:

- `backend/prompts/system/game_master.ko.md` - XML 태그 메타/섹션 규격 적용
- `backend/prompts/system/game_master.en.md` - XML 태그 메타/섹션 규격 적용
- `backend/prompts/turn/turn_output_instructions.ko.md` - XML 태그 메타/섹션 규격 적용
- `backend/prompts/turn/turn_output_instructions.en.md` - XML 태그 메타/섹션 규격 적용
- `backend/prompts/image/scene_prompt.ko.md` - XML 태그 메타/섹션 규격 적용
- `backend/prompts/image/scene_prompt.en.md` - XML 태그 메타/섹션 규격 적용
- `backend/src/unknown_world/orchestrator/prompt_loader.py` - XML 태그 메타 파싱 + 레거시 폴백(필요 시) 단일화
- `backend/tests/unit/orchestrator/test_prompt_loader.py` - XML 태그 메타 파싱 케이스 추가(또는 갱신)
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트 작성 규칙(신규 표준/레거시) 정합화

**참조**:

- `vibe/prd.md` - 3.2(프롬프트 관리), 10.4(버저닝/메타)
- `vibe/unit-plans/U-036[Mvp].md` - 프롬프트 분리/로더/핫리로드 선행
- `.cursor/rules/00-core-critical.mdc` - RULE-006/007/008/010

## 구현 흐름

### 1단계: XML 태그 규격(SSOT) 정의

- **필수 메타 태그**를 고정한다(예: `<prompt_id>`, `<language>`, `<version>`, `<last_updated>`, `<policy_preset>`).
- 메타/본문 경계를 고정한다(예: `<prompt_meta>...</prompt_meta>`, `<prompt_body>...</prompt_body>`).
- 본문 내부 섹션 태그는 “선택적”로 두되, 최소한 `purpose/input/output_contract/constraints`는 통일하도록 가이드한다(문서/예시 포함).

### 2단계: prompt_loader 파싱 단일화(레거시 폴백 포함)

- XML 태그 메타가 존재하면 이를 우선 파싱해 `PromptData.metadata`를 채운다.
- XML 태그가 없으면 레거시(`- key: value`) 파싱으로 폴백한다(마이그레이션 기간 안정성).
- 모델에 전달할 “본문(content)”에는 메타 블록이 포함되지 않도록 정리한다(불필요한 토큰/혼선 방지).

### 3단계: 프롬프트 파일 마이그레이션(6개) + 검증

- `backend/prompts/**`의 6개 프롬프트를 XML 태그 규격으로 정리한다(ko/en 대칭 유지).
- 테스트/런북으로 다음을 확인한다:
  - (dev) 핫리로드 동작, (prod) 캐싱 동작
  - 메타 추출(prompt_id/language/version) 정상
  - ko/en 혼합/누락 시 폴백/에러 정책이 일관됨

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-036[Mvp]](U-036[Mvp].md) - `backend/prompts/**` 분리/로더/핫리로드 기반

**다음 작업에 전달할 것**:

- CP-MVP-05(멀티모달 이미지 게이트)에서 “프롬프트 로드/언어 인바리언트” 검증 포인트가 단순화됨
- 향후 신규 프롬프트 추가(Scanner/Autopilot/요약 등) 시 포맷 드리프트 방지(규격 재사용)

## 주의사항

**기술적 고려사항**:

- (RULE-006) ko/en 혼합 금지: 파일 단위로 언어를 고정하고, 메타 `language`와 파일명(`*.ko.md`/`*.en.md`)이 충돌하지 않게 한다.
- (RULE-007/008) 프롬프트 원문은 로그/스트림/프론트 UI에 노출하지 않는다(메타만).
- 파서는 “엄격”과 “관대”의 균형이 필요하다: 마이그레이션 기간에는 레거시 폴백으로 서비스 중단을 피한다.

**잠재적 리스크**:

- 파싱 실패 시 본문이 깨져 모델 출력 품질이 급락할 수 있음 → XML/레거시 모두에 대해 단위 테스트 + 런북 검증을 포함한다.

## 페어링 질문 (결정 필요)

- [x] **Q1**: prompt_loader가 `<prompt_meta>`를 모델 입력에서 제거할까?
  - Option A: 제거한다(권장: 토큰/혼선 최소화)
  - Option B: 유지한다(모델이 메타를 참고하도록, 대신 토큰 증가)
  **A1**: Option A

- [x] **Q2**: XML 태그 파싱 실패 시 정책은?
  - Option A: 레거시 폴백 후 진행(권장: 데모 루프 유지)
  - Option B: 에러로 중단(엄격, 품질은 높지만 UX 리스크)
  **A2**: Option A

## 참고 자료

- `vibe/prd.md` - 3.2(프롬프트 관리 원칙), 10.4(버저닝/메타)
- `.cursor/rules/30-prompts-i18n.mdc` - 프롬프트 작성 규칙(SSOT)
- `.cursor/rules/00-core-critical.mdc` - RULE-006/007/008/010

