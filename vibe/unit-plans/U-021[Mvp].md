# U-021[Mvp]: 이미지 이해(Scanner) 백엔드 엔드포인트

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-021[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-016                             |
| 우선순위  | High                              |

## 작업 목표

사용자가 업로드한 이미지를 분석(캡션/오브젝트 bbox 등)해 “단서/아이템 후보”로 변환하는 **Scanner 백엔드 엔드포인트**를 구현한다.

**배경**: PRD는 Scanner 슬롯(이미지 드랍/업로드)을 데모 표면 핵심으로 요구하며, bbox 좌표 규약은 0~1000 정규화 + `[ymin,xmin,ymax,xmax]` 고정이다. (PRD 6.7, RULE-009)

**완료 기준**:

- 이미지 업로드 요청을 받아 캡션/오브젝트(선택: bbox 포함) 결과를 JSON으로 반환한다.
- bbox는 반드시 0~1000 정규화 + `[ymin,xmin,ymax,xmax]`를 준수한다. (RULE-009)
- 실패/차단 시에도 스키마 준수 + 안전한 대체 결과(예: 텍스트-only 캡션)로 응답한다. (RULE-004)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/api/scanner.py` - 이미지 업로드 엔드포인트(예: `/api/scan`)
- `backend/src/unknown_world/services/image_understanding.py` - 비전 호출/후처리(bbox 정규화 포함)
- (선택) `backend/src/unknown_world/models/scanner.py` - Scanner 응답 모델(Pydantic)

**수정**:

- `backend/src/unknown_world/main.py` - 라우터 등록

**참조**:

- `vibe/prd.md` 8.6/6.7 - 이미지 이해/Scanner 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/007/009
- `vibe/tech-stack.md` - 비전 모델/Files API 입력 방식 참고

## 구현 흐름

### 1단계: 업로드/응답 계약 확정

- 입력: 이미지 파일(multipart) + (선택) `language`
- 출력(최소): `caption`, `objects[] { label, box_2d }`, `item_candidates[]`
- 파일 크기/타입 제한을 두고, 제한 초과 시 안전한 오류 응답을 반환한다.

### 2단계: 비전 호출 + bbox 정규화/검증

- 비전 모델(FAST 라벨)을 사용해 캡션/오브젝트를 추출한다(모델 고정은 tech-stack 준수).
- bbox는 항상 0~1000 정규화 + `[ymin,xmin,ymax,xmax]`로 저장/반환한다.

### 3단계: 실패/안전 폴백

- 모델 호출 실패/안전 차단 시:
  - `objects=[]`, `caption`만 제공 등 텍스트-only 폴백
  - UI가 계속 진행 가능한 형태로 응답한다. (RULE-004)

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-016[Mvp]](U-016[Mvp].md) - GenAI 클라이언트/인증/모델 라벨

**다음 작업에 전달할 것**:

- U-022에서 Scanner 슬롯 UI가 결과를 받아 아이템화/인벤토리 반영할 수 있는 API
- RU-006에서 정리할 media 저장/제한/보안 기준

## 주의사항

**기술적 고려사항**:

- (RULE-007) 업로드된 파일/자격증명/프롬프트를 로그에 남기지 않는다(메타만).
- (RULE-009) bbox 포맷/좌표계 혼용 금지.

**잠재적 리스크**:

- 업로드/처리 시간이 길어 UX가 끊길 수 있음 → 프론트에서 진행 표시/비동기 처리(U-022)와 함께 설계한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: MVP에서 이미지 입력 처리 방식은?
  - Option A: multipart 업로드로 처리(권장: 단순)
  - Option B: Files API 업로드 + URI 참조(대용량/재사용에 유리, 구현 부담↑)

## 참고 자료

- `vibe/prd.md` - Scanner/이미지 이해 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/007/009

