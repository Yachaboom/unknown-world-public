# Unknown World 부채 로그 (Debt Log)

이 문서는 발견되었으나 당장 해결하지 못한 기술 부채, 버그, 개선 사항을 기록합니다.
유닛 작업 중 발견된 이슈가 범위 밖일 경우 여기에 기록하고 다음 단계로 넘깁니다.

---

## 2026-01-26 이슈: ko/en 혼합 출력(내러티브/룰/퀘스트/UI) 발생

- **발견 위치**: `vibe/ref/en-ko-issue.png` (Quest/Rule Board/로그/시스템 메시지 등 한 화면 혼합)
- **현상**: 한 화면에 한국어/영어가 동시에 노출되어 RULE-006/007(혼합 출력 금지) 및 Hard Gate `Consistency OK` 기대를 위반할 수 있음.
- **추정 원인**:
  - TurnInput.language(클라)와 SaveGame.language(세션) 또는 i18n 상태가 드리프트하여, 서버 출력 언어와 기존 월드 상태 텍스트가 섞임
  - 언어 전환 시 기존 월드/로그/퀘스트/룰 텍스트를 즉시 번역하지 않아 “과거 언어 잔재”가 남음
  - 클라이언트 폴백/에러 문자열(예: malformed error event)이 일부 영문 하드코딩으로 남음
  - 모델이 내러티브/라벨을 혼합 언어로 생성(콘텐츠 레벨 검증 부재)
- **보류 사유**: 현재 진행 유닛 범위 밖(문서/로드맵 반영 후 별도 유닛으로 처리).

- **해결 계획**:
  - [U-043[Mvp]](unit-plans/U-043[Mvp].md): 서버 Hard Gate에 “언어(콘텐츠) 혼합” 검증 + Repair loop 추가
  - [U-044[Mvp]](unit-plans/U-044[Mvp].md): 세션 언어 SSOT(언어 전환=리셋) + 클라이언트 폴백/시스템 메시지 혼합 제거

## 2026-01-28 이슈: test_turn_streaming_success - badges 이벤트 수 불일치

- **발견 위치**: `backend/tests/integration/test_turn_streaming.py:50`
- **현상**: `assert len(badges_events) >= 2` 실패 - 2개 이상의 badges 이벤트가 기대되나 1개만 수신됨
- **추정 원인**: 스트리밍 파이프라인에서 badges 이벤트 발행 로직이 변경되었거나, 테스트 기대치가 현재 구현과 불일치
- **보류 사유**: U-046[Mvp] 범위 밖 (prompt_loader XML 태그 규격과 무관한 스트리밍 로직)

## 2026-01-24 이슈: 에셋 요청 스키마 검증 실패 (U-034 관련) ✅ 해결됨

- **발견 위치**: backend/tests/unit/test_u034_verification.py
- **현상**: test_schema_required_properties 테스트에서 'rembg_model' 필드가 스키마에 없다는 AssertionError 발생.
- **추정 원인**: vibe/ref/nanobanana-asset-request.schema.json 파일에 'rembg_model' 필드가 정의되지 않았거나 이름이 다름.
- **보류 사유**: 이번 유닛(U-016[Mvp]) 범위 밖이며, GenAI 클라이언트 구현과는 무관한 에셋 제작용 스키마 이슈임.

- **해결 완료**: [U-040[Mvp]](unit-plans/U-040[Mvp].md) (2026-01-28)
  - **SSOT 확정**: `rembg_options.model`을 rembg 모델 선택의 단일 기준 필드로 확정
  - **수정 파일**:
    - `backend/tests/unit/test_u034_verification.py`: `required_fields`에서 `rembg_model` 제거, `rembg_options` 구조 검증 추가
    - `vibe/unit-runbooks/U-034-nanobanana-template-runbook.md`: 스키마 주요 필드 표 및 확인 포인트 갱신
  - **재발 방지**: JSON Schema required와 "워크플로우 필수" 개념을 테스트 코드에 명확히 구분/문서화함
