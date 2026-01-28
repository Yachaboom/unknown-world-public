# U-046[Mvp] 프롬프트 XML 태그 규격 통일 개발 완료 보고서

## 메타데이터

- **작업 ID**: U-046[Mvp]
- **단계 번호**: 2.3
- **작성 일시**: 2026-01-28 14:15
- **담당**: AI Agent

---

## 1. 작업 요약

분리된 프롬프트 파일(`backend/prompts/**/*.md`)의 메타데이터와 섹션 경계를 **XML 태그 규격으로 통일**하고, `prompt_loader`가 이를 우선 파싱하도록 구현하여 메타 추적성과 ko/en 운영 안정성을 확보했습니다.

---

## 2. 작업 범위

- **프롬프트 규격 표준화**: 6개 핵심 프롬프트 파일에 XML 태그(`prompt_meta`, `prompt_body`) 적용
- **로더 파싱 로직 개선**: XML 태그 파싱 우선 및 레거시 포맷(Frontmatter 스타일) 폴백 지원
- **검증 체계 강화**: XML 파싱 및 레거시 호환성을 검증하는 단위 테스트 추가
- **규칙 동기화**: 프롬프트 작성 규칙(`.cursor/rules/30-prompts-i18n.mdc`)을 새로운 표준에 맞게 갱신

---

## 3. 생성/수정 파일

| 파일 경로 | 유형 | 목적 |
| --- | --- | --- |
| `backend/src/unknown_world/orchestrator/prompt_loader.py` | 수정 | XML 태그 파싱 로직 추가 및 레거시 폴백 구현 |
| `backend/tests/unit/orchestrator/test_prompt_loader.py` | 수정 | XML 파싱 테스트 케이스 추가 및 기존 테스트 갱신 |
| `backend/prompts/system/game_master.{ko,en}.md` | 수정 | 시스템 프롬프트에 XML 태그 규격 적용 |
| `backend/prompts/turn/turn_output_instructions.{ko,en}.md` | 수정 | 턴 출력 지침 프롬프트에 XML 태그 규격 적용 |
| `backend/prompts/image/scene_prompt.{ko,en}.md` | 수정 | 이미지 생성 프롬프트에 XML 태그 규격 적용 |
| `.cursor/rules/30-prompts-i18n.mdc` | 수정 | 프롬프트 작성 규칙 SSOT 업데이트 |
| `vibe/unit-runbooks/U-046-prompt-xml-tags-runbook.md` | 신규 | XML 태그 포맷 및 파싱 검증 절차 문서화 |

---

## 4. 구현 상세

### 4.1 핵심 설계

**XML 태그 규격 (SSOT)**:

```xml
<prompt_meta>
  <prompt_id>game_master_system</prompt_id>
  <language>ko-KR</language>
  <version>0.2.0</version>
  <last_updated>2026-01-28</last_updated>
  <policy_preset>default</policy_preset>
</prompt_meta>

<prompt_body>
## 목적
...
</prompt_body>
```

**파싱 전략**:
1.  파일 내용에서 `<prompt_meta>`와 `<prompt_body>` 태그를 정규식으로 추출
2.  존재할 경우 XML 파싱으로 메타데이터 구성, 본문은 `<prompt_body>` 내부 내용 사용
3.  실패하거나 태그가 없을 경우 기존의 `Key: Value` 형태 파싱 시도 (하위 호환성)

### 4.2 외부 영향 분석

- **데이터/파일 시스템**: 프롬프트 파일 포맷 변경 (내용은 유지되나 구조가 명시적으로 변경됨)
- **호환성**: 기존 레거시 포맷 프롬프트도 계속 로드 가능 (데모 및 개발 중단 방지)

### 4.3 가정 및 제약사항

- **규격 준수**: 향후 추가되는 모든 프롬프트는 `.cursor/rules/30-prompts-i18n.mdc`에 정의된 XML 규격을 따라야 함
- **언어 일치**: 파일명(`*.ko.md`)과 내부 `<language>ko-KR</language>` 태그가 일치해야 함

---

## 5. 런북(Runbook) 정보

- **파일 경로**: `vibe/unit-runbooks/U-046-prompt-xml-tags-runbook.md`
- **실행 결과**:
  - `TestXmlParsing` 테스트 통과 확인
  - 레거시 폴백 시나리오 검증 완료
  - ko/en 언어 쌍 일관성 확인 완료
- **참조**: 상세 테스트 실행 방법 및 시나리오는 런북 파일 참조

---

## 6. 리스크 및 주의사항

- **파싱 에러**: XML 태그 오타(예: 닫는 태그 누락) 시 파싱 실패 가능성 → 단위 테스트로 사전 방지 필요
- **토큰 증가**: 메타데이터 태그 자체는 모델에 전달되지 않으므로 토큰 비용 증가는 없음 (로더가 제거함)

---

## 7. 다음 단계 안내

### 7.1 후속 작업

1.  **CP-MVP-05(멀티모달 이미지 게이트)** 진행 시 변경된 프롬프트 규격 준수 확인

### 7.2 의존 단계 확인

- **선행 단계**: U-036[Mvp] (완료)
- **후속 단계**: CP-MVP-05

---

## 8. 자체 점검 결과

- [x] 런북 기반 요구사항 충족 확인
- [x] Repomix 최신 구조 반영 확인
- [x] 아키텍처/네이밍/경로 일관성 유지
- [x] 파괴적 변경/리스크/가정 명시

---

_본 보고서는 AI Agent에 의해 자동 생성되었습니다._
