# U-010[Mvp] Scene Canvas + Hotspot Overlay 실행 가이드

## 1. 개요

Scene Canvas에 클릭 가능한 핫스팟 오버레이를 구현했습니다. TurnOutput의 `objects[]`를 기반으로 핫스팟을 렌더링하고, 클릭 시 `object_id + box_2d`를 TurnInput에 포함해 서버로 전송합니다.

**핵심 기능**:
- 0~1000 정규화 좌표 → 픽셀 좌표 변환 (RULE-009 준수)
- 핫스팟 호버 시 하이라이트 + 툴팁 표시
- 핫스팟 클릭 시 turn 실행 트리거

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-004[Mvp] (고정 HUD 레이아웃), U-008[Mvp] (turn 실행/스트림)
- 선행 완료 필요: 프론트엔드 빌드 환경

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트에서
cd frontend
pnpm install
```

### 2.2 개발 서버 실행

```bash
pnpm run dev
```

- 기본 포트: http://localhost:8001

### 2.3 첫 화면/결과 확인

- Scene Canvas에 "📡 데이터 대기 중" 표시
- placeholder 배경 이미지 위에 **2개의 핫스팟 버튼** 표시:
  - "터미널" (좌측 영역)
  - "문" (우측 영역)

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 핫스팟 호버 테스트

**목적**: 핫스팟 호버 시 하이라이트 및 툴팁 표시 확인

**실행**:
1. 브라우저에서 http://localhost:8001 접속
2. Scene Canvas 영역의 "터미널" 핫스팟에 마우스를 올림

**기대 결과**:
- 핫스팟 테두리 색상: 초록 → 마젠타
- 핫스팟 배경: 반투명 마젠타 글로우
- 툴팁 표시:
  - 라벨: "터미널"
  - 힌트: "힌트: 활성화된 터미널이다"

**확인 포인트**:
- ✅ 호버 시 CSS 전환 애니메이션 동작
- ✅ 툴팁이 핫스팟 위에 정확히 위치
- ✅ 마우스 벗어나면 원래 상태로 복귀

---

### 시나리오 B: 핫스팟 클릭 테스트

**목적**: 핫스팟 클릭 시 turn 실행 트리거 확인

**실행**:
1. "터미널" 핫스팟 클릭

**기대 결과**:
1. Scene Canvas: "⏳ 동기화 중..." 상태로 변경
2. Agent Console: "처리 중" 상태로 변경
3. Action Deck: 모든 버튼 비활성화
4. 입력 필드: "처리 중..." placeholder로 비활성화
5. 네트워크: `POST /api/turn` 요청 전송

**TurnInput 예시** (개발자 도구 Network 탭에서 확인):
```json
{
  "language": "ko",
  "text": "터미널",
  "action_id": null,
  "click": {
    "object_id": "demo-terminal",
    "box_2d": {
      "ymin": 300,
      "xmin": 100,
      "ymax": 600,
      "xmax": 400
    }
  },
  "client": {
    "viewport_w": 1280,
    "viewport_h": 720,
    "theme": "dark"
  },
  "economy_snapshot": {
    "signal": 100,
    "memory_shard": 5
  }
}
```

**확인 포인트**:
- ✅ click 객체에 `object_id`와 `box_2d` 모두 포함 (Q1 결정: Option B)
- ✅ box_2d 값이 0~1000 정규화 좌표 유지 (RULE-009)
- ✅ 스트리밍 중 핫스팟 클릭 불가 (disabled)

---

### 시나리오 C: 에러 처리 테스트

**목적**: 백엔드 미실행 시 에러 처리 확인

**전제 조건**: 백엔드 서버 미실행 상태

**실행**:
1. 핫스팟 클릭
2. 2~3초 대기 (연결 타임아웃)

**기대 결과**:
1. Agent Console: "⚠ Failed to fetch [STREAM_ERROR]" 표시
2. Narrative Feed: "[시스템] 서버 연결에 실패했습니다. 다시 시도해 주세요." 추가
3. 자동 복구 카운터: "#1 (복구됨)"
4. 연결 상태: "오프라인"
5. Action Deck/입력: 다시 활성화

**확인 포인트**:
- ✅ 에러 후 UI가 정상 상태로 복구
- ✅ 자동 복구 메커니즘 작동

---

### 시나리오 D: 좌표 변환 검증

**목적**: 0~1000 정규화 좌표가 픽셀로 정확히 변환되는지 확인

**실행**:
1. 브라우저 개발자 도구 열기
2. Scene Canvas 요소 검사
3. 핫스팟 요소의 `style` 속성 확인

**기대 결과** (예: 캔버스 크기 800x600px 기준):
```
터미널 핫스팟:
- box_2d: {ymin:300, xmin:100, ymax:600, xmax:400}
- 픽셀: top=180px, left=80px, width=240px, height=180px

문 핫스팟:
- box_2d: {ymin:200, xmin:600, ymax:800, xmax:900}
- 픽셀: top=120px, left=480px, width=240px, height=360px
```

**확인 포인트**:
- ✅ 핫스팟 위치가 캔버스 비율에 맞게 조정됨
- ✅ 윈도우 리사이즈 시 핫스팟 위치 재계산

---

## 4. 실행 결과 확인

### 4.1 생성 파일

| 파일 | 설명 |
|------|------|
| `frontend/src/utils/box2d.ts` | 0~1000 ↔ px 좌표 변환 유틸 |
| `frontend/src/components/SceneCanvas.tsx` | 핫스팟 오버레이 렌더링/클릭 처리 (수정) |
| `frontend/src/App.tsx` | 핫스팟 클릭 → turn 실행 연결 (수정) |
| `frontend/src/style.css` | 핫스팟 스타일 추가 (수정) |
| `frontend/src/locales/*/translation.json` | i18n 키 추가 (수정) |

### 4.2 성공/실패 판단 기준

**성공**:
- ✅ 핫스팟 2개가 Scene Canvas에 표시됨
- ✅ 호버 시 하이라이트 + 툴팁 표시
- ✅ 클릭 시 turn 스트림 시작
- ✅ TurnInput에 `click.object_id`와 `click.box_2d` 포함
- ✅ box_2d 값이 0~1000 범위 유지

**실패 시 확인**:
- ❌ 핫스팟이 보이지 않음 → `objects` 배열이 비어있거나 `status !== 'default'`
- ❌ 클릭이 안됨 → `disabled` prop이 true이거나 `onHotspotClick` 미연결
- ❌ 좌표가 이상함 → `canvasSize`가 0이거나 변환 로직 오류

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 핫스팟이 보이지 않음

**원인**: `shouldRenderHotspots` 조건 불충족

**확인**:
```javascript
// 브라우저 콘솔에서 실행
document.querySelector('.scene-canvas').classList
// has-hotspots 클래스가 있어야 함
```

**해결**:
- `objects` prop이 비어있지 않은지 확인
- `canvasSize.width > 0`인지 확인 (ResizeObserver 동작 확인)

### 5.2 클릭 이벤트가 발생하지 않음

**원인**: `disabled` prop 또는 이벤트 버블링 문제

**해결**:
- `isStreaming` 상태 확인
- `pointer-events` CSS 속성 확인

### 5.3 좌표가 틀림

**원인**: box_2d 형식 오류 (ymin/xmin/ymax/xmax vs top/left/width/height)

**확인**:
- RULE-009: `bbox=[ymin,xmin,ymax,xmax]` 순서 준수
- `box2dToPixel()` 함수 반환값 확인

---

## 6. 다음 단계

- **U-014[Mvp]**: Scene Canvas에 실제 장면 이미지 렌더링
- **백엔드 연동**: TurnOutput의 `ui.objects`에서 핫스팟 데이터 수신
