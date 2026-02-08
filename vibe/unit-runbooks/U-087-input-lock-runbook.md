# U-087 턴 처리 중 모든 사용자 입력 잠금 실행 가이드

## 1. 개요

턴 처리(스트리밍/이미지 생성) 진행 중 모든 사용자 입력을 차단하여 "허위 액션 로그"와 "상태 경합"을 방지하는 기능입니다. `isInputLocked` SSOT를 App 레벨에서 계산하고, 모든 입력 핸들러/컴포넌트에 적용합니다.

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-070[Mvp] (액션 로그 패턴), U-071[Mvp] (processingPhase SSOT)
- 선행 완료 필요: 위 유닛들이 이미 완료된 상태여야 합니다

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
pnpm run dev
```

### 2.3 첫 화면/결과 확인

- 브라우저에서 `http://localhost:8001/` 접속
- 프로필 선택 후 게임 시작
- 성공 지표: 게임 UI가 정상 렌더링되고, 모든 입력이 활성화 상태

---

## 3. 핵심 기능 시나리오

### 시나리오 A: 유휴 상태에서 입력 활성화 확인

**목적**: 잠금이 해제된 상태에서 모든 입력이 정상 동작하는지 검증

**실행**:
1. 프로필 선택 후 게임 시작
2. 액션 카드, 커맨드 입력, 리셋/프로필 변경 버튼 확인

**확인 포인트**:
- ✅ 액션 카드 3장 모두 클릭 가능 (disabled 아님)
- ✅ 커맨드 입력창에 텍스트 입력 가능
- ✅ "실행" 버튼 활성화
- ✅ 리셋/프로필 변경 버튼 활성화
- ✅ 잠금 오버레이(`.input-lock-overlay`)가 DOM에 없음

---

### 시나리오 B: 턴 실행 중 입력 잠금 확인

**목적**: 턴 스트리밍 중 모든 입력이 차단되는지 검증

**전제 조건**: 백엔드 서버가 실행 중이어야 합니다.

**실행**:
1. 액션 카드(예: "탐색하기")를 클릭하여 턴 실행
2. 스트리밍 시작되면 즉시 UI 상태 확인

**확인 포인트**:
- ✅ 잠금 오버레이가 표시됨 ("처리 중…" 라벨)
- ✅ 액션 카드 모두 disabled 상태
- ✅ 커맨드 입력 disabled, placeholder "처리 중…"
- ✅ "실행" → "대기"로 텍스트 변경, disabled
- ✅ 리셋/프로필 변경 버튼 disabled
- ✅ Scanner 업로드/드롭 disabled
- ✅ 오버레이 위에서 클릭해도 액션 로그가 추가되지 않음

---

### 시나리오 C: 이미지 생성 중 입력 잠금 유지 확인

**목적**: 텍스트 스트리밍이 끝나도 이미지 생성 중에는 잠금이 유지되는지 검증

**실행**:
1. 턴 실행하여 이미지 생성이 포함된 응답 수신
2. 텍스트 타이핑이 끝난 후에도 이미지 생성 중에는 잠금 상태 확인

**확인 포인트**:
- ✅ `processingPhase === 'image_pending'`일 때 잠금 유지
- ✅ `imageLoading === true`일 때 잠금 유지
- ✅ 이미지 생성 완료 후 잠금 해제

---

### 시나리오 D: 잠금 해제 후 정상 복구 확인

**목적**: 턴 완료 후 모든 입력이 정상으로 복원되는지 검증

**실행**:
1. 턴이 완전히 완료될 때까지 대기 (이미지 포함 시 이미지 표시까지)
2. UI 상태 확인

**확인 포인트**:
- ✅ 잠금 오버레이 제거됨
- ✅ "대기" → "실행"으로 텍스트 복원
- ✅ 커맨드 입력 활성화, placeholder 복원
- ✅ 액션 카드 활성화 (잔액에 따라)
- ✅ Scanner/리셋 등 모든 입력 활성화

---

### 시나리오 E: DevTools 시뮬레이션 테스트

**목적**: 백엔드 없이 프론트엔드만으로 잠금 동작을 검증

**실행**:
1. 브라우저 DevTools 콘솔에서 아래 코드 실행

```javascript
// 잠금 시뮬레이션
const agentStore = await import('/src/stores/agentStore.ts');
agentStore.useAgentStore.getState().startStream();

// 확인: 오버레이 표시, 모든 입력 disabled
document.querySelector('.input-lock-overlay'); // should exist
document.querySelector('.command-input').disabled; // should be true

// 잠금 해제
agentStore.useAgentStore.getState().completeStream();
const worldStore = await import('/src/stores/worldStore.ts');
worldStore.useWorldStore.getState().setProcessingPhase('idle');
```

**확인 포인트**:
- ✅ `startStream()` 후 잠금 오버레이 표시
- ✅ `completeStream() + setProcessingPhase('idle')` 후 잠금 해제

---

## 4. 실행 결과 확인

### 4.1 성공/실패 판단 기준

**성공**:
- ✅ 유휴 상태: 모든 입력 활성화, 오버레이 없음
- ✅ 처리 중: 모든 입력 비활성화, 오버레이 표시, 허위 로그 없음
- ✅ 완료 후: 모든 입력 복원
- ✅ i18n: ko/en 모두 정상 메시지

**실패 시 확인**:
- ❌ 잠금 중 클릭해도 액션 로그가 생성됨 → `isInputLocked` 가드 누락 확인
- ❌ 잠금이 해제되지 않음 → `processingPhase` idle 전환 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: 잠금 중에도 카드 클릭이 동작함
- **원인**: 오버레이 z-index가 카드보다 낮을 수 있음
- **해결**: `.input-lock-overlay` z-index가 9990인지 확인

**오류**: 잠금이 해제되지 않음
- **원인**: `processingPhase`가 'idle'로 돌아가지 않음
- **해결**: `turnRunner.ts`의 onComplete/onError에서 `setProcessingPhase('idle')` 호출 확인

---

## 6. 다음 단계

이 유닛을 기반으로 Autopilot/Queue(U-023/U-024)에서 "큐 진행 중 입력 잠금" 정책을 재사용할 수 있습니다.
