# U-020[Mvp]: 프론트 이미지 Lazy Render(placeholder/폴백)

## 메타데이터

| 항목      | 내용        |
| --------- | ----------- |
| Unit ID   | U-020[Mvp]  |
| Phase     | MVP         |
| 예상 소요 | 60분        |
| 의존성    | U-010,U-019 |
| 우선순위  | ⚡ Critical |

## 작업 목표

Scene Canvas에 (조건부) 장면 이미지를 표시하되, 이미지 생성 지연/실패가 UX를 망치지 않도록 **Lazy loading + placeholder + 텍스트-only 폴백**을 구현한다.

**배경**: PRD는 “텍스트 우선 출력 + 이미지 Lazy Loading”을 핵심 UX로 요구한다. (PRD 6.3, RULE-008)

**완료 기준**:

- 이미지가 있을 때는 Scene Canvas에 렌더되고, 없거나 로딩 중이면 placeholder(또는 이전 이미지 유지)가 표시된다.
- 이미지 실패 시에도 핫스팟/패널/로그는 계속 동작하며, 텍스트-only로 안전하게 진행된다. (RULE-004)
- 핫스팟 오버레이는 이미지 유무와 무관하게 정확히 렌더된다(좌표 정규화 유지). (RULE-009)

## 영향받는 파일

**생성**:

- (선택) `frontend/src/components/SceneImage.tsx` - 이미지 로딩/에러/placeholder 처리 분리

**수정**:

- `frontend/src/components/SceneCanvas.tsx` - 이미지 레이어 + 핫스팟 레이어 결합
- `frontend/src/style.css` - 이미지/placeholder/로딩 상태 스타일

**참조**:

- `vibe/prd.md` 6.3 - 텍스트 우선 + Lazy 이미지 정책
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008/009

## 구현 흐름

### 1단계: 이미지 상태 모델 확정

- 상태 최소:
  - `current_scene_image_url` (또는 `image_job_id`)
  - `loading/error` 플래그
- 이미지가 없는 경우에도 SceneCanvas가 빈 공간이 아니라 “장면 프레임”을 유지한다.

### 2단계: Lazy loading + placeholder 구현

- 이미지 로딩 동안 placeholder를 보여주고, 로딩 완료 시 교체한다.
- 실패 시에는 오류 배지를 표시하되, 게임 진행을 막지 않는다(텍스트-only). (RULE-004)

### 3단계: 핫스팟 오버레이 정합 유지

- 이미지가 바뀌어도 box_2d는 정규화 값으로 유지하고, 렌더 시 캔버스 크기에 맞춰 변환한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-010[Mvp]](U-010[Mvp].md) - Hotspot overlay 렌더/좌표 변환
- **계획서**: [U-019[Mvp]](U-019[Mvp].md) - 이미지 생성 엔드포인트/잡

**다음 작업에 전달할 것**:

- U-022(Scanner 슬롯)에서 “이미지 기반 상호작용”이 추가되어도 Canvas UX가 흔들리지 않는 기반
- CP-MVP-03 데모에서 “이미지 실패해도 진행되는” 안정성 증거

## 주의사항

**기술적 고려사항**:

- (RULE-008) 이미지 생성은 느릴 수 있으므로, 텍스트/단계/배지가 먼저 보여야 한다.
- 이미지 레이어가 오버레이 클릭/드래그를 가로채지 않도록 레이어링을 조절한다.

**잠재적 리스크**:

- 이미지 로딩 상태가 길면 “멈춤”으로 인식될 수 있음 → Agent Console/상태 라벨로 “지연 작업 진행 중”을 사용자 친화적으로 표시한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 이미지가 새로 오기 전까지 “이전 이미지 유지”를 할까?
  - Option A: 유지한다(권장: 화면 안정, 깜빡임 감소)
  - Option B: 항상 placeholder로 전환한다(상태는 명확, 하지만 깜빡임 가능)

## 참고 자료

- `vibe/prd.md` - Lazy 이미지 정책
- `.cursor/rules/00-core-critical.mdc` - RULE-004/008/009
