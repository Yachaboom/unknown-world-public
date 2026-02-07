# U-096 아이템 사용 시 소비(삭제) 로직 실행 가이드

## 1. 개요

인벤토리 아이템을 핫스팟에 드래그&드롭하여 사용하면, GM이 `TurnOutput.world.inventory_removed`에 소비 대상 아이템 ID를 반환합니다. 프론트엔드에서는 fade-out 애니메이션(0.5초)을 재생한 뒤 인벤토리에서 실제 제거합니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-011[Mvp] (Inventory 패널), U-012[Mvp] (DnD 드롭 → TurnInput)
- 선행 완료 필요: 백엔드/프론트엔드 서버 구동

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
pnpm -C frontend install

# 백엔드 의존성 설치
cd backend
uv sync
```

### 2.2 서버 시작

```bash
# 터미널 1: 백엔드 시작 (mock 모드)
cd backend
cp .env.example .env  # UW_MODE=mock 설정
uv run uvicorn unknown_world.main:app --reload --port 8011

# 터미널 2: 프론트엔드 시작
pnpm -C frontend dev
```

### 2.3 접근

- 프론트엔드: http://localhost:8001
- 백엔드 헬스: http://localhost:8011/health

---

## 3. 핵심 기능 시나리오

### 시나리오 A: CSS 애니메이션 단독 검증

**목적**: `.item-consumed` 클래스 적용 시 fade-out 애니메이션이 올바르게 재생되는지 확인

**실행**:
1. 브라우저에서 http://localhost:8001 접근
2. 프로필 선택 후 게임 메인 화면 진입
3. DevTools 콘솔(F12)에서 다음 실행:

```javascript
// 첫 번째 인벤토리 아이템에 item-consumed 클래스 추가
document.querySelector('.inventory-item').classList.add('item-consumed');
```

**기대 결과**:
- 첫 번째 아이템이 0.5초 동안 fade-out 애니메이션 재생
- 불투명도 감소 + 크기 축소(0.6배) + 밝기 증가 + 경고색 테두리 깜빡임
- 애니메이션 완료 후 투명 상태 유지(DOM에 남아있지만 보이지 않음)
- `pointer-events: none`으로 클릭 불가

**확인 포인트**:
- ✅ fade-out 애니메이션 시각적 확인
- ✅ 애니메이션 후 아이템 영역이 투명해짐
- ✅ 마우스 인터랙션 차단됨

---

### 시나리오 B: Zustand 스토어 연동 검증

**목적**: `markConsuming` → `clearConsuming` 시퀀스가 정상 동작하는지 확인

**실행**:
1. DevTools 콘솔에서 다음 실행:

```javascript
// inventoryStore에 접근하여 현재 아이템 확인
const storeKey = Object.keys(window.__ZUSTAND_DEVTOOLS__ || {})
  .find(k => k.includes('inventory'));

// 대안: React DevTools 또는 직접 모듈 접근이 어려우므,
// applyTurnOutput을 시뮬레이션하는 방법을 사용합니다.
// 아래는 DOM 기반 확인 방법입니다.

// 1단계: 모든 인벤토리 아이템 확인
const items = document.querySelectorAll('.inventory-item');
console.log('인벤토리 아이템 수:', items.length);

// 2단계: 첫 번째 아이템에 consumed 클래스 추가 (markConsuming 시뮬레이션)
items[0].classList.add('item-consumed');

// 3단계: 500ms 후 DOM에서 제거 (clearConsuming 시뮬레이션)
setTimeout(() => {
  items[0].remove();
  console.log('남은 아이템 수:', document.querySelectorAll('.inventory-item').length);
}, 500);
```

**기대 결과**:
- 첫 번째 아이템에 fade-out 애니메이션 재생
- 500ms 후 해당 아이템이 DOM에서 제거됨
- 인벤토리 아이템 수가 1 감소

**확인 포인트**:
- ✅ fade-out 완료 후 아이템 제거
- ✅ 인벤토리 카운트 감소

---

### 시나리오 C: Real 모드 - GM 연동 E2E 확인

**목적**: 실제 Gemini GM이 `inventory_removed`를 올바르게 반환하는지 확인

**전제 조건**:
- `.env`에 `UW_MODE=real`, `GOOGLE_API_KEY` 설정 완료

**실행**:
1. 백엔드 real 모드로 재시작
2. 게임에서 일회용 아이템(열쇠, 물약 등)을 핫스팟에 드래그&드롭
3. GM 응답 후 인벤토리 변화 관찰

**기대 결과**:
- 일회용 아이템: fade-out 후 인벤토리에서 제거됨
- 재사용 가능 아이템(도구류): 사용 후에도 인벤토리에 유지됨
- 내러티브에 아이템 사용 결과가 자연스럽게 반영됨

**확인 포인트**:
- ✅ `TurnOutput.world.inventory_removed`에 소비된 아이템 ID 포함
- ✅ 프론트엔드에서 fade-out 애니메이션 재생 후 인벤토리 제거
- ✅ 재사용 가능 아이템은 `inventory_removed`에 미포함
- ✅ 내러티브에 소비/사용 결과 반영

---

### 시나리오 D: 영어 언어 설정 확인

**목적**: 아이템 소비 관련 i18n 메시지가 올바르게 표시되는지 확인

**실행**:
1. 프론트엔드에서 언어를 English로 변경
2. 아이템 소비 플로우 실행

**기대 결과**:
- 한국어: `"{{name}} 사용됨"` (예: "고대 열쇠 사용됨")
- 영어: `"{{name}} consumed"` (예: "Ancient Key consumed")

**확인 포인트**:
- ✅ 한국어 소비 메시지 정상 표시
- ✅ 영어 소비 메시지 정상 표시

---

## 4. 구현 상세

### 4.1 데이터 흐름

```
[플레이어] 아이템 드래그&드롭 → 핫스팟
    ↓
[프론트엔드] TurnInput { action: "drop", item_id, hotspot_id } 전송
    ↓
[백엔드 GM] TurnOutput 생성 (inventory_removed: ["item_id"])
    ↓
[프론트엔드 worldStore.applyTurnOutput]
    ├── inventoryStore.markConsuming(removedIds)  ← fade-out 시작
    └── setTimeout(500ms) → inventoryStore.clearConsuming(removedIds)  ← 실제 제거
    ↓
[UI] .item-consumed 클래스 → 0.5초 애니메이션 → DOM 제거
```

### 4.2 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `backend/prompts/turn/turn_output_instructions.ko.md` | GM에게 `inventory_removed` 사용 규칙 추가 |
| `backend/prompts/turn/turn_output_instructions.en.md` | 위 규칙 영문 버전 |
| `frontend/src/stores/inventoryStore.ts` | `consumingItemIds`, `markConsuming`, `clearConsuming` 추가 |
| `frontend/src/stores/worldStore.ts` | `applyTurnOutput`에 fade-out → 제거 시퀀스 구현 |
| `frontend/src/components/InventoryPanel.tsx` | `isConsuming` prop, `.item-consumed` 클래스 적용 |
| `frontend/src/style.css` | `.item-consumed` 애니메이션 스타일 |
| `frontend/src/locales/ko-KR/translation.json` | `inventory.item_consumed` 키 추가 |
| `frontend/src/locales/en-US/translation.json` | `inventory.item_consumed` 키 추가 |

---

## 5. 실행 결과 확인

### 5.1 성공/실패 판단 기준

**성공**:
- ✅ `.item-consumed` 클래스 적용 시 fade-out 애니메이션 재생
- ✅ 애니메이션 후 인벤토리에서 아이템 제거
- ✅ GM이 일회용 아이템에 대해 `inventory_removed` 반환 (Real 모드)
- ✅ 재사용 가능 아이템은 인벤토리에 유지
- ✅ i18n 소비 메시지 정상 (ko/en)

**실패 시 확인**:
- ❌ 애니메이션 미재생 → `style.css`에 `.item-consumed` 규칙 존재 여부 확인
- ❌ 아이템 미제거 → `worldStore.applyTurnOutput`에서 `clearConsuming` 호출 확인
- ❌ GM이 `inventory_removed` 미반환 → GM 프롬프트(`turn_output_instructions.*.md`) 확인
- ❌ 모든 아이템이 소비됨 → GM 프롬프트의 재사용 가능 아이템 규칙 확인

---

## 6. 문제 해결 (Troubleshooting)

### 6.1 일반적인 오류

**오류**: 아이템이 fade-out 없이 즉시 사라짐
- **원인**: `markConsuming` 호출 없이 `removeItems`가 직접 호출됨
- **해결**: `worldStore.applyTurnOutput`에서 `markConsuming` → `setTimeout` → `clearConsuming` 순서 확인

**오류**: fade-out 후에도 아이템이 인벤토리에 남아있음
- **원인**: `clearConsuming`이 호출되지 않거나 타이밍 불일치
- **해결**: `setTimeout` 콜백 내 `clearConsuming` 호출 확인, 500ms 일치 여부 확인

**오류**: GM이 재사용 가능 아이템도 소비시킴
- **원인**: GM 프롬프트에서 재사용 가능 아이템 규칙이 무시됨
- **해결**: `turn_output_instructions.*.md`에서 도구/재사용 아이템 규칙 강화

### 6.2 환경별 주의사항

- **Windows**: 경로 구분자 이슈 없음 (파일 수정만)
- **macOS/Linux**: 동일하게 동작

---

## 7. 다음 단계

- CP-MVP-03: 아이템 사용 시나리오 풍부화
- 향후: 아이템 소비 확인 다이얼로그(선택적), 다중 아이템 동시 소비 UX 개선
