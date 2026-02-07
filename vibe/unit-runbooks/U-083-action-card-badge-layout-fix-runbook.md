# U-083[Mvp] 액션 카드 대안 뱃지 레이아웃 깨짐 수정 실행 가이드

## 1. 개요

액션 카드에 대안 뱃지(Alternative, QUALITY, VISION, EARN)가 표시될 때 레이아웃이 깨지는 문제를 수정하였습니다.

**핵심 변경**:
- 뱃지를 `position: absolute`에서 비용 아래 **별도 행(flex 컨테이너)**으로 이동
- 최대 2개 뱃지 표시 + 초과 시 "외 N개" 표시 (Q1: Option B)
- 긴 텍스트는 ellipsis + 툴팁으로 처리 (Q2: Option A)
- 뱃지 위치: 비용 아래 별도 행 (Q3: Option C)

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-009[Mvp] (Action Deck 기본 구조)
- 선행 완료 필요: U-009[Mvp] 완료 상태

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
cd ..
pnpm dev:front
```

### 2.3 첫 화면 확인

- 브라우저에서 `http://localhost:8001` 접속
- 화면 하단 Action Deck에 기본 카드 3장(탐색하기/조사하기/대화하기) 확인
- 성공 지표: 카드에 뱃지가 없을 때 레이아웃이 기존과 동일

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 뱃지 없는 기본 카드

**목적**: 뱃지 변경이 기본 카드 레이아웃에 영향을 주지 않는지 확인

**실행**: 브라우저 콘솔(F12)에서:
```javascript
const mod = await import('/src/stores/actionDeckStore.ts');
mod.useActionDeckStore.getState().setCards([]); // 기본 카드 복원
```

**확인 포인트**:
- ✅ 기본 카드 3장(탐색하기/조사하기/대화하기)이 표시됨
- ✅ 카드 하단에 뱃지 영역이 렌더링되지 않음 (불필요한 공간 차지 없음)
- ✅ 카드 크기가 일정하게 유지됨

---

### 시나리오 B: 다양한 뱃지 카드 표시

**목적**: QUALITY, VISION, EARN, 대안 뱃지가 각각 올바르게 표시되는지 확인

**실행**: 브라우저 콘솔에서:
```javascript
const mod = await import('/src/stores/actionDeckStore.ts');
mod.useActionDeckStore.getState().setCards([
  { id: 'test-normal', label: '일반 탐색', cost: { signal: 1, memory_shard: 0 }, risk: 'low', enabled: true, is_alternative: false },
  { id: 'deep_investigate', label: '정밀 조사', cost: { signal: 3, memory_shard: 1 }, risk: 'high', enabled: true, is_alternative: false },
  { id: 'deep_analyze', label: '정밀 분석', cost: { signal: 2, memory_shard: 0 }, risk: 'medium', enabled: true, is_alternative: false },
  { id: 'earn_signal', label: '재화 수집', cost: { signal: 0, memory_shard: 0 }, risk: 'low', enabled: true, is_alternative: false },
  { id: 'alt-text', label: '텍스트만 보기', cost: { signal: 0, memory_shard: 0 }, risk: 'low', enabled: true, is_alternative: true },
  { id: 'alt-low', label: '저해상도 이미지로 진행', cost: { signal: 1, memory_shard: 0 }, risk: 'low', enabled: true, is_alternative: true },
]);
```

**확인 포인트**:
- ✅ "일반 탐색": 뱃지 없음
- ✅ "정밀 조사": **★ QUALITY** 뱃지 (골드 색상) 비용 아래 표시
- ✅ "정밀 분석": **🔍 정밀분석** 뱃지 (시안 색상) 비용 아래 표시
- ✅ "재화 수집": **⚡ SIGNAL 획득** 뱃지 (노란 글로우) 표시
- ✅ "텍스트만 보기": **대안** 뱃지 (녹색) + 점선 테두리
- ✅ "저해상도 이미지로 진행": **대안** 뱃지 + 점선 테두리
- ✅ 모든 카드 크기가 일관되게 유지됨
- ✅ 뱃지가 비용/위험도와 겹치지 않음

---

### 시나리오 C: 비활성화 카드 + 뱃지

**목적**: 비활성화 카드에서도 뱃지가 올바르게 표시되는지 확인

**실행**: 브라우저 콘솔에서:
```javascript
const mod = await import('/src/stores/actionDeckStore.ts');
mod.useActionDeckStore.getState().setCards([
  { id: 'test-normal', label: '일반 탐색', cost: { signal: 1, memory_shard: 0 }, risk: 'low', enabled: true, is_alternative: false },
  { id: 'alt-disabled', label: '고급 대안', cost: { signal: 999, memory_shard: 99 }, risk: 'high', enabled: false, is_alternative: true },
]);
```

**확인 포인트**:
- ✅ "고급 대안" 카드가 반투명(비활성) 상태로 표시
- ✅ "대안" 뱃지가 비활성 오버레이 뒤에서 보임
- ✅ 비활성 사유("사용 불가")가 오버레이에 표시

---

### 시나리오 D: 긴 뱃지 텍스트 처리 (Q2 검증)

**목적**: ellipsis + 툴팁이 정상 동작하는지 확인

**실행**: 위 시나리오 B의 카드에서 뱃지에 마우스를 올려봅니다.

**확인 포인트**:
- ✅ 뱃지 텍스트가 max-width(90px) 내에서 잘림(ellipsis)
- ✅ 마우스 호버 시 title 속성으로 전체 텍스트가 툴팁으로 표시

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 뱃지가 표시되어도 카드 크기가 일정하게 유지됨
- ✅ 뱃지가 다른 요소(비용, 설명)와 겹치지 않음
- ✅ 뱃지가 길어도 텍스트가 잘리고 툴팁으로 확인 가능
- ✅ 여러 뱃지가 동시에 표시되어도 안정적 (최대 2개)
- ✅ 기존 기본 카드 동작에 변화 없음

**실패 시 확인**:
- ❌ 뱃지가 카드 밖으로 넘침 → CSS `.action-card-badge`의 `max-width` 조정
- ❌ 뱃지 색상이 안 보임 → CRT 테마 변수 확인
- ❌ 카드 높이가 비일관적 → `.action-card`의 min-height/max-height 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 뱃지가 표시되지 않음
- **원인**: CSS 파일이 캐시됨
- **해결**: 브라우저 캐시 비우기 (Ctrl+Shift+R)

**오류**: 뱃지 색상이 보이지 않음
- **원인**: CRT 테마 CSS 변수 누락
- **해결**: `style.css`에서 `.action-card-badge` 관련 색상 확인

### 5.2 환경별 주의사항
- **Windows**: 개발 서버 포트 8001 사용 (RULE-011)
- **모든 환경**: 뱃지 텍스트는 i18n 키 기반이므로 언어 변경 시에도 동작 확인 필요
