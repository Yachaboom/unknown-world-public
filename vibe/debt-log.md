# Unknown World 부채 로그 (Debt Log)

이 문서는 발견되었으나 당장 해결하지 못한 기술 부채, 버그, 개선 사항을 기록합니다.
유닛 작업 중 발견된 이슈가 범위 밖일 경우 여기에 기록하고 다음 단계로 넘깁니다.

---

## 2026-01-24 이슈: 에셋 요청 스키마 검증 실패 (U-034 관련)

- **발견 위치**: backend/tests/unit/test_u034_verification.py
- **현상**: test_schema_required_properties 테스트에서 'rembg_model' 필드가 스키마에 없다는 AssertionError 발생.
- **추정 원인**: vibe/ref/nanobanana-asset-request.schema.json 파일에 'rembg_model' 필드가 정의되지 않았거나 이름이 다름.
- **보류 사유**: 이번 유닛(U-016[Mvp]) 범위 밖이며, GenAI 클라이언트 구현과는 무관한 에셋 제작용 스키마 이슈임.
