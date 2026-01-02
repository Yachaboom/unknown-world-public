# U-103[Mmp]: 이미지 편집(멀티턴, REF 유지)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-103[Mmp]  |
| Phase     | MMP         |
| 예상 소요 | 75분        |
| 의존성    | U-019,U-102 |
| 우선순위  | High        |

## 작업 목표

이미지 생성 이후 “멀티턴 편집”을 지원해, 참조 이미지(REF) 기반으로 장면 일관성을 유지하며 수정할 수 있게 한다.

**배경**: PRD는 “대화형 편집(멀티턴)”과 장면 일관성을 요구하며, 이미지 모델은 `gemini-3-pro-image-preview`로 고정이다. (PRD 8.5, RULE-010)

**완료 기준**:

- 기존 장면 이미지 + 편집 지시를 입력으로 받아 수정 이미지를 생성할 수 있다.
- 모델/ID 혼용 없이 `gemini-3-pro-image-preview`만 사용한다. (RULE-010)
- 실패 시 텍스트-only로 진행 가능하며, UI는 “이미지 없이도 플레이”를 유지한다. (RULE-004)

## 영향받는 파일

**생성**:

- `backend/src/unknown_world/services/image_editing.py` - 이미지 편집 호출/저장
- `backend/src/unknown_world/api/image_edit.py` - 편집 요청 엔드포인트

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - (선택) 편집 요청 UI 트리거(버튼/모달)
- `frontend/src/style.css` - (선택) 편집 UI 스타일

**참조**:

- `vibe/prd.md` 8.5 - 멀티턴 편집/일관성 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/010/008

## 구현 흐름

### 1단계: 편집 요청 계약 정의

- 입력: `base_image`(URL/핸들), `edit_instruction`, (선택) `mask/region`
- 출력: `edited_image_url`, `status`, 실패 시 `message`

### 2단계: 참조 이미지/시그니처(멀티턴) 관리

- SDK 사용을 전제로 히스토리/참조를 유지해 일관성을 높인다(가능 범위).
- UI/로그에는 “REF 라벨” 같은 메타만 표시하고 프롬프트 원문은 숨긴다. (RULE-008)

### 3단계: 경제/폴백 연계

- 편집은 고비용일 수 있으므로 예상 비용/대안을 노출하는 정책을 연결한다(경제 시스템).
- 실패 시 `should_generate=false` 또는 이전 이미지 유지로 폴백한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 엔드포인트/잡
- **계획서**: [U-102[Mmp]](U-102[Mmp].md) - GCS 스토리지(에셋 저장)

**다음 작업에 전달할 것**:

- U-104(장기 세션)에서 “장면 일관성”을 강화할 도구

## 주의사항

**기술적 고려사항**:

- (RULE-010) 이미지 모델 ID 고정: 다른 모델로 우회 금지.
- (RULE-008) 프롬프트/내부 추론 노출 금지: 메타 라벨만.

**잠재적 리스크**:

- 편집 UX가 복잡해질 수 있음 → MMP에서는 최소 “지시 기반 편집”만 제공하고, 영역 편집은 후순위로 둔다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: MMP에서 편집 UI를 어디에 둘까?
  - Option A: SceneCanvas 내 간단 버튼/모달(권장: 접근성)
  - Option B: 별도 “에셋 편집” 패널(확장 용이, UI 부담↑)

## 참고 자료

- `vibe/prd.md` - 이미지 편집/일관성 요구
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008/010
