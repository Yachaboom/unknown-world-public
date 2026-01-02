# U-010[Mvp]: Scene Canvas + Hotspot Overlay(0~1000 bbox)

## 메타데이터

| 항목      | 내용                              |
| --------- | --------------------------------- |
| Unit ID   | U-010[Mvp]                        |
| Phase     | MVP                               |
| 예상 소요 | 75분                              |
| 의존성    | U-004,U-008                       |
| 우선순위  | ⚡ Critical                        |

## 작업 목표

Scene Canvas(장면 영역)에 **핫스팟 오버레이**를 그리고, 핫스팟 클릭으로 TurnInput(click)을 전송해 “클릭 가능한 세계”를 만든다.

**배경**: PRD의 MVP 핵심은 오브젝트/핫스팟 좌표를 구조화하여 “플레이 가능한 화면”을 만드는 것이다. 좌표 규약은 0~1000 정규화 + `[ymin,xmin,ymax,xmax]` 고정이다. (RULE-009)

**완료 기준**:

- TurnOutput의 `objects[]`/`hotspots[]`를 기반으로 오버레이가 렌더되고 hover 하이라이트가 동작한다.
- 핫스팟 클릭 시 `object_id`(+ 선택적으로 box_2d)가 TurnInput에 포함되어 `/api/turn`으로 전송된다.
- 좌표는 저장/전송/세이브에서 끝까지 0~1000 정규화 규약을 유지하고, 렌더 시에만 px로 변환한다. (RULE-009)

## 영향받는 파일

**생성**:

- `frontend/src/components/SceneCanvas.tsx` - Scene Canvas + 오버레이 렌더/클릭 처리
- `frontend/src/utils/box2d.ts` - box_2d(0~1000) → px 변환 유틸

**수정**:

- `frontend/src/App.tsx` - Scene Canvas 배치 및 클릭→turn 실행 연결
- `frontend/src/style.css` - 오버레이(테두리/호버/툴팁) 스타일

**참조**:

- `vibe/prd.md` 6.2 - 구조화 UI(핫스팟) 요구
- `.cursor/rules/10-frontend-game-ui.mdc` - 좌표 규약/핫스팟 렌더 원칙
- `.cursor/rules/00-core-critical.mdc` - RULE-009/002/008

## 구현 흐름

### 1단계: box_2d 변환 규칙 구현(정규화 유지)

- 서버/세이브에는 항상 box_2d(0~1000)를 유지한다.
- 렌더에서만 viewport 크기(canvasW/H)에 맞춰 px로 변환한다.

### 2단계: 오버레이 렌더 + 상호작용(hover/click)

- 각 오브젝트에 대해 overlay 박스를 그린다(테두리/글로우).
- hover 시 툴팁/하이라이트를 보여준다(게임스러운 피드백).
- click 시 TurnInput(click) 생성 → U-008의 turn 실행 함수로 전달한다.

### 3단계: “채팅 UI로 보이지 않게” 피드백을 게임 UI에 고정

- 클릭 결과는 “채팅 답변” 대신 로그 피드/패널 변화(퀘스트/인벤토리/룰)에 반영되도록 경로를 유지한다.

## 의존성 & 연결

**이전 작업에서 가져올 것**:

- **계획서**: [U-004[Mvp]](U-004[Mvp].md) - Scene Canvas 자리/레이아웃
- **계획서**: [U-008[Mvp]](U-008[Mvp].md) - turn 실행/스트리밍 표시

**다음 작업에 전달할 것**:

- U-012에서 핫스팟을 “드롭 타겟”으로 확장(DnD)
- CP-MVP-02에서 클릭 데모 케이스로 사용

## 주의사항

**기술적 고려사항**:

- (RULE-009) bbox 순서/좌표계 혼용 금지: `[ymin,xmin,ymax,xmax]` + 0~1000만 허용한다.
- 오버레이 요소는 클릭/드래그를 방해하지 않게 CSS를 설계한다(필요 시 pointer-events 조절).

**잠재적 리스크**:

- 반응형 리사이즈에서 좌표 변환이 흔들릴 수 있음 → 변환은 항상 “현재 캔버스 크기” 기반으로 계산하고, 정규화 값은 그대로 유지한다.

## 페어링 질문 (결정 필요)

- [ ] **Q1**: 클릭 이벤트에 box_2d를 함께 보낼까?
  - Option A: `object_id`만 전송(단순, 서버 SSOT)
  - Option B: `object_id + box_2d` 전송(선택: 서버가 “클릭 위치 맥락”을 더 잘 이해)

## 참고 자료

- `vibe/prd.md` - 핫스팟/좌표 규약 요구
- `.cursor/rules/10-frontend-game-ui.mdc` - 좌표 변환/렌더 원칙
- `.cursor/rules/00-core-critical.mdc` - RULE-009

