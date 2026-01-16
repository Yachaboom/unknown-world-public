# U-012[Mvp] DnD 드롭(아이템→핫스팟) TurnInput 이벤트 실행 가이드

## 1. 개요

인벤토리 아이템을 씬 캔버스의 핫스팟에 드래그 앤 드롭하면 `TurnInput` 이벤트가 발생하여 턴 실행이 트리거되는 기능입니다. 드롭 시 `item_id`, `target_object_id`, `target_box_2d`를 포함한 구조화된 입력이 서버로 전송됩니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-010 (Scene Canvas + Hotspot Overlay), U-011 (Inventory Panel + DnD), U-008 (HTTP Streaming Client)
- 선행 완료 필요: 의존 유닛들의 런북 실행 완료

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend
pnpm install
```

### 2.2 의존 유닛 확인

```bash
# 백엔드 서버 실행 여부 확인 (선택사항 - 서버 없이도 드롭 UI 테스트 가능)
curl http://localhost:8000/health

# 프론트엔드 빌드 확인
pnpm run typecheck && pnpm run lint
```

### 2.3 즉시 실행

```bash
cd frontend
pnpm run dev
```

### 2.4 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001` 접속
- 왼쪽 인벤토리 패널에 아이템 목록 표시 확인
- 중앙 씬 캔버스에 핫스팟(녹색 테두리) 표시 확인
- 성공 지표: 인벤토리 아이템 드래그 시 커서 변경 및 핫스팟 하이라이트

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 아이템 드래그 시 핫스팟 하이라이트

**목적**: 인벤토리 아이템을 드래그하여 핫스팟 위로 이동 시 시각적 피드백 확인

**실행**:
1. 인벤토리의 "키카드 A" 아이템을 클릭하고 드래그 시작
2. 씬 캔버스의 "터미널" 핫스팟 위로 마우스 이동

**기대 결과**:
- 핫스팟이 **마젠타/핑크색 테두리**로 변경
- 핫스팟 배경이 살짝 밝아짐 (rgba(255, 0, 255, 0.15))
- 핫스팟이 약간 확대됨 (scale 1.03 → 1.05)

**확인 포인트**:
- ✅ 드래그 중 핫스팟에 `.droppable-active` 클래스 적용
- ✅ 드래그 종료 시 원래 스타일로 복귀
- ✅ 여러 핫스팟이 있을 때 마우스가 위치한 핫스팟만 하이라이트

---

### 시나리오 B: 아이템 드롭 → TurnInput 발생

**목적**: 핫스팟에 아이템 드롭 시 턴 실행 트리거 확인

**실행**:
1. "키카드 A"를 "터미널" 핫스팟에 드래그 앤 드롭

**기대 결과**:
- 콘솔에 `TurnInput` 전송 로그 출력
- TurnInput 구조:
```json
{
  "language": "ko-KR",
  "text": "키카드 A을(를) 터미널에 사용",
  "action_id": null,
  "click": null,
  "drop": {
    "item_id": "keycard-alpha",
    "target_object_id": "terminal",
    "target_box_2d": [100, 200, 400, 500]
  },
  "client": { "viewport_w": 1920, "viewport_h": 1080, "theme": "dark" },
  "economy_snapshot": { "signal": 100, "memory_shard": 5 }
}
```

**확인 포인트**:
- ✅ `drop.item_id`가 드래그한 아이템 ID와 일치
- ✅ `drop.target_object_id`가 드롭 대상 핫스팟 ID와 일치
- ✅ `drop.target_box_2d`가 핫스팟의 bbox 좌표 포함 (0-1000 정규화)
- ✅ `text` 필드에 i18n 키 `inventory.drop_action` 적용

---

### 시나리오 C: 핫스팟 외 영역 드롭 시 피드백

**목적**: 유효하지 않은 드롭 대상에서의 동작 확인

**실행**:
1. "손전등"을 씬 캔버스의 빈 영역(핫스팟이 아닌 곳)에 드롭

**기대 결과**:
- 턴 실행이 트리거되지 않음
- 아이템이 원래 위치로 복귀
- 에러 메시지 없음 (정상 동작)

**확인 포인트**:
- ✅ `executeTurn` 호출 안됨
- ✅ 인벤토리 상태 변경 없음
- ✅ UI 깜빡임 없음

---

### 시나리오 D: 스트리밍 중 드래그 비활성화

**목적**: 턴 실행 중 드래그 앤 드롭 방지 확인

**전제 조건**:
- 백엔드 서버가 실행 중이어야 함

**실행**:
1. "탐색하기" 액션 카드 클릭하여 턴 실행 시작
2. 스트리밍 중에 인벤토리 아이템 드래그 시도

**기대 결과**:
- 인벤토리 아이템 드래그 불가
- 핫스팟 하이라이트 없음

**확인 포인트**:
- ✅ `isStreaming=true` 동안 드래그 비활성화
- ✅ 핫스팟에 `disabled` 속성 적용

---

## 4. 실행 결과 확인

### 4.1 브라우저 DevTools 확인

**Network 탭**:
- `/api/turn` POST 요청 확인
- Request Payload에 `drop` 필드 포함 확인

**Console 탭**:
- `[TurnStream] Starting stream...` 로그
- `[TurnStream] Stage: ...` 로그

### 4.2 React DevTools 확인

**Components 탭**:
- `App` → `DndContext` → `SceneCanvas` → `HotspotOverlay` 구조 확인
- `HotspotOverlay`의 `isOver` 상태 확인

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 드래그 시 핫스팟 하이라이트 (마젠타색)
- ✅ 드롭 시 TurnInput 이벤트 발생
- ✅ TurnInput에 `drop` 필드 포함
- ✅ i18n 텍스트 정상 표시 ("키카드 A을(를) 터미널에 사용")
- ✅ 스트리밍 중 드래그 비활성화

**실패 시 확인**:
- ❌ 핫스팟 하이라이트 안됨 → `useDroppable` 훅 연결 확인
- ❌ 드롭 후 턴 실행 안됨 → `handleDragEnd` 로직 확인
- ❌ `drop` 필드 없음 → `TurnInputSchema` 업데이트 확인
- ❌ i18n 키 누락 → `translation.json` 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 드래그 시 핫스팟 하이라이트 안됨
- **원인**: `useDroppable` 훅의 `id`가 중복되거나 비어있음
- **해결**: `HotspotOverlay`의 `id` prop이 `hotspot-${object.id}` 형식인지 확인

**오류**: 드롭 후 턴 실행 안됨
- **원인**: `event.over.data.current.type`이 `hotspot`이 아님
- **해결**: `useDroppable`의 `data` 객체에 `type: 'hotspot'` 포함 확인

**오류**: TypeScript 에러 `Property 'drop' is missing`
- **원인**: `TurnInputSchema`에 `drop` 필드 누락
- **해결**: `frontend/src/schemas/turn.ts`에 `DropInputSchema` 추가 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 이슈 없음 (Vite 자동 처리)
- **macOS/Linux**: 특이사항 없음
- **모바일**: 터치 이벤트로 자동 변환 (@dnd-kit 기본 지원)

---

## 6. 관련 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/schemas/turn.ts` | `DropInputSchema` 추가, `TurnInputSchema`에 `drop` 필드 추가 |
| `frontend/src/components/SceneCanvas.tsx` | `useDroppable` 통합, `onHotspotDrop` prop 추가 |
| `frontend/src/App.tsx` | `handleDragEnd`에서 핫스팟 드롭 처리, `executeTurn`에 `dropData` 파라미터 추가 |
| `frontend/src/style.css` | `.droppable-active` 스타일 추가 |
| `frontend/src/locales/ko-KR/translation.json` | `inventory.drop_action` 키 추가 |
| `frontend/src/locales/en-US/translation.json` | `inventory.drop_action` 키 추가 |
