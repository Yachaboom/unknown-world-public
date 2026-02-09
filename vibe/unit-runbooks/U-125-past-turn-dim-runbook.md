# U-125 이전턴 텍스트 주목성 제거 실행 가이드

## 1. 개요

NarrativeFeed의 이전 턴 텍스트를 시각적으로 약화(dim 색상 + 폰트 0.85em + opacity 0.75)하여, 현재 턴(스트리밍/타이핑 중) 텍스트에 시선이 집중되도록 하는 기능을 구현했습니다. hover 시 이전 턴 텍스트가 원래 밝기로 복원됩니다.

**예상 소요 시간**: 5분

**의존성**:

- 의존 유닛: U-086[Mvp] (텍스트 우선 타이핑 출력), U-049[Mvp] (레이아웃/스크롤)
- 선행 완료 필요: 없음 (프론트엔드만 변경)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
pnpm -C frontend install
```

### 2.2 즉시 실행

```bash
pnpm -C frontend dev
```

### 2.3 첫 화면/결과 확인

- http://localhost:8001 접속
- 프로필 선택 후 게임 화면 진입
- TURN 0 초기 텍스트가 표시됨
- 성공 지표: TURN 0 텍스트가 dim 색상(var(--text-dim), #22a000)으로 표시되고 폰트가 0.85em

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 이전 턴 약화 기본 확인

**목적**: 이전 턴 텍스트가 dim + 폰트 축소 + opacity 약화로 표시되는지 검증

**실행**:

1. 프로필 선택 후 게임 진입
2. 액션 카드(탐색하기 등) 클릭하여 1턴 진행
3. 턴 완료 후 내러티브 피드 확인

**기대 결과**:

- TURN 0 텍스트: dim 색상(#22a000), 폰트 0.85em, opacity 0.75
- 액션 로그(▶ 행동 실행: ...): 기존 스타일 유지 (opacity 0.7, 폰트 0.8em)
- TURN 1 텍스트: 타이핑 중에는 밝은 색상(#33ff00), 폰트 1em, opacity 1

**확인 포인트**:

- ✅ 이전 턴 텍스트가 현재 턴보다 어둡게 표시됨
- ✅ 이전 턴 텍스트 폰트가 현재 턴보다 작게 표시됨
- ✅ 액션 로그 엔트리도 이전 턴으로 약화됨

---

### 시나리오 B: 현재 턴 활성 텍스트 강조 확인

**목적**: 스트리밍/타이핑 중 현재 턴 텍스트가 밝은 스타일로 유지되는지 검증

**실행**:

1. 2턴 이상 진행 (이전 턴이 2개 이상 있는 상태)
2. 새 액션 실행
3. 스트리밍/타이핑 중 내러티브 피드 확인

**기대 결과**:

- 이전 턴들: dim + 작은 폰트 + 낮은 opacity
- 현재 턴 (타이핑 중): 밝은 색상 + 기본 폰트 크기 + opacity 1
- 현재 턴 위에 미세한 구분선(border-top) 표시

**확인 포인트**:

- ✅ 현재 턴 텍스트가 밝은 녹색(#33ff00)으로 표시됨
- ✅ 현재 턴과 이전 턴 사이에 구분선이 있음
- ✅ 커서 깜빡임(▌)이 현재 턴에서만 표시됨

---

### 시나리오 C: hover 복원 효과 확인

**목적**: 이전 턴 텍스트에 마우스를 올리면 밝기가 복원되는지 검증 (Q2 Option B)

**실행**:

1. 3턴 이상 진행
2. 이전 턴 텍스트 위에 마우스 hover

**기대 결과**:

| 항목 | 기본 상태 | hover 상태 |
|------|-----------|-----------|
| opacity | 0.75 | 1.0 |
| 텍스트 색상 | #22a000 (dim) | #33ff00 (밝음) |

**확인 포인트**:

- ✅ hover 시 opacity가 1로 복원됨
- ✅ hover 시 텍스트 색상이 밝은 녹색으로 복원됨
- ✅ hover 해제 시 다시 dim 상태로 복귀

---

### 시나리오 D: 시스템 메시지 스타일 보존

**목적**: 시스템 메시지(이미지 형성 중 등)가 이전 턴 약화 영향을 받지 않는지 확인

**실행**:

1. 액션 실행 → 이미지 생성 대기 중 상태 관찰
2. "이미지 형성 중…" 메시지 확인

**기대 결과**:

- "이미지 형성 중…" 시스템 메시지: past-entry 클래스 없음, 기존 스타일 유지
- 커서(▌) 깜빡임 정상 동작

**확인 포인트**:

- ✅ 시스템 메시지가 past-entry 약화 대상이 아님
- ✅ 이미지 pending 라인이 기존 dim 스타일 유지

---

## 4. 실행 결과 확인

### 4.1 DOM 검증 (개발자 도구)

브라우저 개발자 도구(F12) → Console에서 실행:

```javascript
// 이전 턴 엔트리 확인
document.querySelectorAll('.past-entry').forEach(e => {
  console.log(e.className, getComputedStyle(e).opacity, getComputedStyle(e).fontSize);
});

// 현재 턴 활성 텍스트 확인
const active = document.querySelector('.narrative-active-text');
if (active) console.log('Active:', active.className, getComputedStyle(active).opacity);
```

### 4.2 성공/실패 판단 기준

**성공**:

- ✅ 이전 턴 `.narrative-entry.past-entry` opacity: 0.75, font-size: 0.85em
- ✅ 이전 턴 `.narrative-text` color: var(--text-dim)
- ✅ 액션 로그 `.action-log-entry` opacity: 0.7, font-size: 0.8em (기존 유지)
- ✅ 현재 턴 `.narrative-active-text` opacity: 1, font-size: 1em
- ✅ hover 시 이전 턴 opacity → 1, color → var(--text-color)
- ✅ 시스템 엔트리 past-entry 미적용

**실패 시 확인**:

- ❌ 이전 턴이 너무 어두워 읽을 수 없음 → opacity/color 값 조정
- ❌ 현재 턴도 dim으로 표시됨 → narrative-active-text 클래스 적용 확인
- ❌ 시스템 메시지까지 약화됨 → system-entry 클래스 분리 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**문제**: 이전 턴 텍스트가 약화되지 않음

- **원인**: past-entry 클래스가 추가되지 않음
- **해결**: NarrativeFeed.tsx의 entries.map()에서 `past-entry` 클래스 확인

**문제**: 현재 턴(타이핑 중) 텍스트도 약화됨

- **원인**: narrative-active-text 클래스가 추가되지 않음
- **해결**: NarrativeFeed.tsx의 showActiveTextArea 블록에서 `narrative-active-text` 클래스 확인

**문제**: hover 효과가 작동하지 않음

- **원인**: CSS 우선순위 충돌
- **해결**: style.css에서 `.narrative-entry.past-entry:hover` 규칙 확인

### 5.2 환경별 주의사항

- **Windows**: 특이사항 없음
- **macOS/Linux**: 특이사항 없음
- **prefers-reduced-motion**: 색상/폰트 크기 변경은 모션이 아니므로 영향 없음

---

## 6. 다음 단계

- CP-MVP-03: "현재 턴 집중" 데모 체감 검증
- U-119[Mmp]: WIG 폴리시에서 텍스트 계층 최종 점검
