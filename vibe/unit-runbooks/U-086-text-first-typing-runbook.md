# U-086[Mvp] 턴 진행 피드백 보강 - 텍스트 우선 타이핑 출력 실행 가이드

## 1. 개요

이미지 생성 대기(10~15초) 동안 사용자가 "멈춤/실패"로 느끼지 않도록, **텍스트를 먼저 타이핑 출력**하고 이미지는 나중에 도착하는 **text-first delivery** UX를 구현했습니다.

핵심 기능:
- **텍스트 우선 출력**: 텍스트 생성이 완료되면 이미지 생성 완료를 기다리지 않고 즉시 타이핑 시작
- **동적 타이핑 속도**: 이미지 생성 중이면 느린 모드(~12초), 완료/없음이면 빠른 모드(~2.5초)
- **이미지 pending 상태 라인**: 타이핑 완료 후에도 이미지 미도착 시 "이미지 형성 중…▌" 표시
- **접근성**: `prefers-reduced-motion` 환경에서 애니메이션 비활성화

**예상 소요 시간**: 10분

**의존성**:
- 의존 유닛: U-066[Mvp] (타이핑 효과/late-binding 가드), U-071[Mvp] (processingPhase/Scene Canvas 인디케이터)
- 선행 완료 필요: 백엔드/프론트엔드 서버 실행

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프로젝트 루트에서 의존성 설치
cd /path/to/unknown-world
pnpm install
```

### 2.2 서버 시작

```bash
# 백엔드 서버 시작 (포트 8011)
pnpm run dev:back

# 프론트엔드 서버 시작 (포트 8001)
pnpm run dev:front
```

### 2.3 즉시 실행

브라우저에서 http://localhost:8001 접속

### 2.4 첫 화면 확인

- 프로필 선택 화면 표시
- "서사꾼", "탐험가", "기술 전문가" 프로필 카드 확인

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 이미지 없는 턴에서 빠른 타이핑 확인

**목적**: 이미지 생성이 없는 턴에서 빠른 타이핑 모드(~2.5초) 동작 검증

**실행**:
1. 프로필 선택 후 게임 시작
2. 하단 액션 카드("탐색하기" 등) 클릭하여 턴 실행
3. NarrativeFeed에서 텍스트 출력 속도 관찰

**기대 결과**:
- 텍스트가 한 글자씩 타이핑되며 **빠르게**(~2.5초 내) 출력 완료
- 이미지 생성이 트리거되지 않으면 "이미지 형성 중…" 상태 라인 미표시

**확인 포인트**:
- ✅ 빠른 타이핑 속도(TARGET_DURATION_MS_IDLE = 2500ms)
- ✅ 타이핑 커서(▌) 깜빡임 동작
- ✅ Fast-forward(클릭/Enter/Space) 즉시 반응

---

### 시나리오 B: 이미지 생성 중 느린 타이핑 + Pending 상태 라인 확인

**목적**: 이미지 생성 대기 중 느린 타이핑 + 타이핑 완료 후 pending 라인 동작 검증

**실행 (브라우저 콘솔 시뮬레이션)**:

이미지 생성이 실제로 트리거되지 않는 환경(Mock 모드/백엔드 오류)에서는 콘솔을 통해 상태를 시뮬레이션합니다.

```javascript
// 1) imageLoading을 true로 설정
const store = window.__worldStore;
store.getState().setImageLoading(1);  // turnId=1

// 2) 긴 내러티브 텍스트 추가 (타이핑 효과 관찰용)
const state = store.getState();
store.setState({
  narrativeEntries: [
    ...state.narrativeEntries,
    {
      turn: 99,
      text: '고대의 도서관 깊숙한 곳에서 희미한 빛이 새어 나옵니다. 먼지 가득한 서가 사이로 조심스럽게 발을 옮기자, 발밑에서 바스락거리는 소리가 들립니다. 낡은 양피지 조각이 바닥에 흩어져 있습니다. 하나를 집어 올려 자세히 살펴보니, 알 수 없는 고대 문자가 적혀 있습니다.',
      type: 'narrative',
    },
  ],
});
```

**기대 결과**:
- 텍스트가 **느리게**(~12초에 걸쳐) 한 글자씩 타이핑 출력
- 타이핑이 모두 끝난 후 NarrativeFeed 하단에 "이미지 형성 중…▌" 상태 라인 표시
- 상태 라인의 커서(▌)가 깜빡임

**이미지 도착 시뮬레이션**:
```javascript
// imageLoading을 해제 → 상태 라인 즉시 제거
const store = window.__worldStore;
store.getState().cancelImageLoading();
```

**확인 포인트**:
- ✅ 느린 타이핑 속도(TARGET_DURATION_MS_WHILE_STREAMING = 12000ms)
- ✅ 타이핑 완료 후 "이미지 형성 중…▌" 표시
- ✅ 상태 라인 커서(▌) 깜빡임(blink 1s infinite)
- ✅ imageLoading 해제 시 상태 라인 즉시 제거
- ✅ i18n 키(`narrative.image_pending_label`) 기반 메시지

---

### 시나리오 C: 이미지 도착 시 타이핑 속도 전환 확인

**목적**: 이미지가 도착하면 남은 텍스트가 빠른 모드로 전환되는지 검증

**실행 (브라우저 콘솔)**:

```javascript
// 1) imageLoading = true 상태에서 긴 텍스트 추가 (시나리오 B와 동일)
const store = window.__worldStore;
store.getState().setImageLoading(2);
const state = store.getState();
store.setState({
  narrativeEntries: [
    ...state.narrativeEntries,
    {
      turn: 100,
      text: '어둠 속에서 무언가가 움직입니다. 조심스럽게 다가가보니 오래된 석상이 서 있습니다. 석상의 눈에서 붉은 빛이 희미하게 반짝이고 있습니다. 손을 뻗어 석상에 닿자 차가운 기운이 손끝을 타고 올라옵니다.',
      type: 'narrative',
    },
  ],
});

// 2) 타이핑이 진행 중일 때 (3~5초 후) imageLoading 해제
setTimeout(() => {
  store.getState().cancelImageLoading();
  console.log('imageLoading 해제됨 → 빠른 모드 전환 기대');
}, 4000);
```

**기대 결과**:
- 처음 4초간: 느린 타이핑 모드
- imageLoading 해제 후: 남은 텍스트가 빠른 모드(~2.5초 목표)로 전환되어 빠르게 출력
- "이미지 형성 중…" 상태 라인은 표시되지 않음(타이핑 중 이미지 도착이므로)

**확인 포인트**:
- ✅ 타이핑 중 속도 전환(느림→빠름) 매끄럽게 동작
- ✅ 이미지 도착 후에는 pending 상태 라인 미표시

---

### 시나리오 D: 접근성(prefers-reduced-motion) 확인

**목적**: 동작 줄이기 설정에서 애니메이션 비활성화 검증

**실행**:
1. 브라우저 DevTools → Rendering → "prefers-reduced-motion: reduce" 에뮬레이션 활성화
2. 시나리오 B 반복 실행

**기대 결과**:
- 타이핑 효과 비활성화(즉시 전체 텍스트 표시)
- "이미지 형성 중…" 상태 라인의 커서(▌) 깜빡임 애니메이션 비활성화
- 커서가 정적 표시(opacity: 0.7)로 대체

**확인 포인트**:
- ✅ `prefers-reduced-motion: reduce`에서 타이핑 효과 스킵
- ✅ `.image-pending-cursor { animation: none; opacity: 0.7; }` 적용 확인

---

### 시나리오 E: i18n 확인 (영문)

**목적**: 영문 로케일에서 상태 라인 메시지 확인

**실행**:
1. 게임 설정에서 언어를 `en-US`로 변경 (또는 `localStorage.setItem('i18nextLng', 'en-US')` 후 새로고침)
2. 시나리오 B 반복 실행

**기대 결과**:
- 상태 라인에 "Forming image…▌" 표시 (한국어: "이미지 형성 중…▌")

**확인 포인트**:
- ✅ `en-US/translation.json`의 `narrative.image_pending_label` = "Forming image…" 적용
- ✅ ko/en 혼합 없이 선택된 언어로만 출력

---

## 4. 실행 결과 확인

### 4.1 주요 상수 (NarrativeFeed.tsx)

| 상수 | 값 | 설명 |
| ---- | -- | ---- |
| `TYPING_TICK_MS` | 32ms | 타이핑 프레임 간격 (~30fps) |
| `TARGET_DURATION_MS_WHILE_STREAMING` | 12000ms | 이미지 생성 중 느린 모드 목표 시간 |
| `TARGET_DURATION_MS_IDLE` | 2500ms | 유휴 상태 빠른 모드 목표 시간 |
| `MIN_CPS` | 10 | 최소 타이핑 속도 (글자/초) |
| `MAX_CPS` | 400 | 최대 타이핑 속도 (글자/초) |

### 4.2 상태 신호 흐름

```
텍스트 생성 완료 (onFinal)
  ├─ NarrativeFeed 타이핑 시작 (즉시)
  └─ 이미지 생성 시작 (비동기, 백그라운드)
      │
      ├─ isImageLoading = true
      │   └─ 느린 타이핑 모드 (~12초)
      │       └─ 타이핑 완료 후: "이미지 형성 중…▌" 표시
      │
      └─ isImageLoading = false (이미지 도착 또는 실패)
          └─ 빠른 타이핑 모드 (~2.5초)
              └─ "이미지 형성 중…" 상태 라인 제거
              └─ Scene Canvas에 이미지 반영 (late-binding)
```

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ 텍스트가 이미지 완료를 기다리지 않고 즉시 타이핑 시작
- ✅ 이미지 생성 중 느린 타이핑(~12초), 완료/없음 시 빠른 타이핑(~2.5초)
- ✅ 타이핑 완료 + 이미지 미도착 시 "이미지 형성 중…▌" 상태 라인 표시
- ✅ 이미지 도착 시 상태 라인 즉시 제거 + Scene Canvas 반영
- ✅ Fast-forward 항상 동작
- ✅ prefers-reduced-motion에서 애니메이션 비활성화
- ✅ i18n 키 기반 메시지(ko/en 혼합 없음)

**실패 시 확인**:
- ❌ 타이핑이 너무 빠름/느림 → `TARGET_DURATION_MS_*` 상수 조정
- ❌ "이미지 형성 중…" 미표시 → `isImageLoading` prop 전달 확인 (App.tsx)
- ❌ 상태 라인이 사라지지 않음 → `cancelImageLoading()` 호출 여부 확인
- ❌ 타이핑이 아예 안 됨 → `NarrativeFeed`에 `isStreaming`/`isImageLoading` prop 전달 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 타이핑 속도가 이미지 로딩 상태와 무관하게 일정함
- **원인**: `App.tsx`에서 `isImageLoading` prop이 `NarrativeFeed`에 전달되지 않음
- **해결**: `App.tsx`에서 `worldStore.sceneState.imageLoading === true`를 prop으로 전달 확인

**오류**: "이미지 형성 중…" 상태 라인이 나타나지 않음
- **원인**: `isImageLoading` prop 미전달 또는 타이핑이 아직 진행 중
- **해결**: 타이핑이 완료된 후에만 표시됨. `isTyping` 상태와 `streamingText` 값 확인

**오류**: 상태 라인이 이미지 도착 후에도 계속 표시됨
- **원인**: `cancelImageLoading()` 미호출
- **해결**: `turnRunner.ts`의 이미지 완료/실패 콜백에서 `cancelImageLoading()` 호출 확인

**오류**: CRT 테마와 스타일 불일치
- **원인**: CSS 변수 미적용
- **해결**: `style.css`에서 `--text-dim`, `--spacing-xs` 등 CRT 테마 변수 사용 확인

### 5.2 환경별 주의사항

- **Windows**: 경로 구분자 주의 (\ vs /)
- **Mock 모드**: `UW_MODE=mock`에서는 이미지 생성이 플레이스홀더로 대체되므로, 이미지 pending 상태를 테스트하려면 콘솔 시뮬레이션을 사용
- **prefers-reduced-motion 에뮬레이션**: Chrome DevTools → Rendering 탭에서 활성화 가능

---

## 6. 구현 파일 목록

### 수정된 파일

| 파일 | 변경 내용 |
| ---- | --------- |
| `frontend/src/App.tsx` | NarrativeFeed에 `isStreaming`/`isImageLoading` prop 전달 |
| `frontend/src/components/NarrativeFeed.tsx` | 타이핑 속도 상수 조정(느린 12s/빠른 2.5s), 이미지 pending 상태 라인 표시 |
| `frontend/src/style.css` | `.image-pending-line`/`.image-pending-cursor` 스타일 + prefers-reduced-motion |
| `frontend/src/locales/ko-KR/translation.json` | `narrative.image_pending_label` 키 추가 ("이미지 형성 중…") |
| `frontend/src/locales/en-US/translation.json` | `narrative.image_pending_label` 키 추가 ("Forming image…") |

---

## 7. 참고 자료

- 계획서: `vibe/unit-plans/U-086[Mvp].md`
- 의존 유닛: `vibe/unit-results/U-066[Mvp].md`, `vibe/unit-results/U-071[Mvp].md`
- 런북: `vibe/unit-runbooks/U-066-image-delay-absorption-runbook.md`
- 런북: `vibe/unit-runbooks/U-071-scene-processing-indicator-runbook.md`
- 기술 스택: `vibe/tech-stack.md`
