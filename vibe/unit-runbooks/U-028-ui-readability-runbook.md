# U-028[Mvp] UI 가독성 패스 실행 가이드

## 1. 개요

현재 UI의 "작은 글씨/과한 CRT 효과"로 인한 가독성 문제를 해결하기 위해, **전역 UI 스케일(폰트)** 과 **Readable 모드(효과 완화)** 를 도입했습니다.

**주요 기능**:
- **UI 스케일 조절**: 0.9/1.0/1.1/1.2 배율로 전체 폰트 크기 조절 (A-/A+ 버튼)
- **Readable 모드**: 스캔라인/플리커/글로우 등 CRT 효과 완화 (READ 토글)
- **마이크로 텍스트 상향**: Agent Console/배지/타임스탬프 등 작은 텍스트 가독성 개선
- **설정 유지**: localStorage에 저장되어 새로고침 후에도 유지

**예상 소요 시간**: 5분

**의존성**:
- 의존 유닛: U-004 (CRT 테마/CSS SSOT), U-008 (Agent Console)
- 선행 완료 필요: 없음 (독립 실행 가능)

---

## 2. 빠른 시작 (Quick Start)

### 2.1 환경 준비

```bash
# 프론트엔드 의존성 설치
cd frontend
pnpm install
```

### 2.2 즉시 실행

```bash
# 개발 서버 시작
pnpm dev
```

### 2.3 첫 화면 확인

- 브라우저에서 `http://localhost:8001` 접속
- **Header 영역**에 다음 컨트롤이 표시되어야 함:
  - `A-` 버튼 (스케일 감소)
  - `100%` 표시 (현재 스케일)
  - `A+` 버튼 (스케일 증가)
  - `○ READ` 또는 `◉ READ` 토글 버튼

---

## 3. 핵심 기능 시나리오

### 시나리오 A: UI 스케일 조절

**목적**: 전역 폰트 크기가 스케일에 따라 변경되는지 확인

**실행**:
1. Header의 `A+` 버튼을 클릭
2. 표시가 `100%` → `110%` → `120%`로 변경됨을 확인
3. 모든 텍스트(내러티브, 패널 제목, 버튼 등)의 크기가 증가함을 확인
4. `A-` 버튼을 클릭하여 스케일 감소 확인
5. 최소값(90%)에서 `A-` 버튼이 비활성화됨을 확인
6. 최대값(120%)에서 `A+` 버튼이 비활성화됨을 확인

**기대 결과**:
- 스케일 표시: 90% / 100% / 110% / 120%
- 모든 텍스트 크기가 비례하여 변경
- 레이아웃이 깨지지 않음

**확인 포인트**:
- ✅ Header의 스케일 표시가 올바르게 변경
- ✅ 본문, 패널, 버튼 텍스트 크기가 동시에 변경
- ✅ Agent Console의 마이크로 텍스트도 스케일 적용
- ✅ 경계값에서 버튼 비활성화 정상 동작

---

### 시나리오 B: Readable 모드 토글

**목적**: CRT 효과가 완화되고 가독성이 향상되는지 확인

**실행**:
1. Header의 `○ READ` 버튼을 클릭
2. 버튼이 `◉ READ` (활성 상태)로 변경됨을 확인
3. 다음 효과가 비활성화됨을 확인:
   - 스캔라인 오버레이 (화면 전체의 수평선)
   - 타이틀 글리치 효과 (UNKNOWN WORLD 텍스트)
   - 텍스트 글로우/쉐도우
   - 애니메이션 펄스 효과 (상태 표시기)
4. 다시 클릭하여 원래 CRT 효과가 복원됨을 확인

**기대 결과**:
- Readable 모드 ON:
  - 스캔라인 없음
  - 글리치 효과 없음
  - 텍스트 쉐도우 없음
  - 패널 배경 약간 밝아짐 (대비 향상)
  - Agent Console 텍스트 더 크게 표시
- Readable 모드 OFF:
  - 모든 CRT 효과 복원

**확인 포인트**:
- ✅ 스캔라인 오버레이 표시/숨김 정상
- ✅ 타이틀 글리치 효과 활성화/비활성화
- ✅ 텍스트 글로우 제거/복원
- ✅ 버튼 aria-pressed 상태 정확

---

### 시나리오 C: 설정 유지 (localStorage persist)

**목적**: 설정이 새로고침 후에도 유지되는지 확인

**실행**:
1. UI 스케일을 `120%`로 설정
2. Readable 모드를 활성화
3. 브라우저를 새로고침 (F5 또는 Ctrl+R)
4. 설정이 유지되었는지 확인

**기대 결과**:
- 새로고침 후에도 스케일 `120%` 유지
- 새로고침 후에도 Readable 모드 활성 상태 유지

**확인 포인트**:
- ✅ localStorage에 `unknown-world-ui-prefs` 키 존재
- ✅ 새로고침 후 설정 복원
- ✅ 다른 탭에서도 동일 설정 적용

**localStorage 확인 방법** (개발자 도구):
```javascript
// Console에서 실행
JSON.parse(localStorage.getItem('unknown-world-ui-prefs'))
// 예상 결과: { state: { uiScale: 1.2, readableMode: true }, version: 0 }
```

---

### 시나리오 D: Agent Console 마이크로 텍스트 가독성

**목적**: Agent Console의 작은 텍스트가 읽기 쉬운지 확인

**실행**:
1. 기본 스케일(100%)에서 Agent Console 패널 확인
2. 단계 큐 (PARSE, VALIDATE, PLAN 등) 텍스트 가독성 확인
3. 배지 (Schema, Economy, Safety, Consistency) 텍스트 가독성 확인
4. Readable 모드를 활성화하고 텍스트 크기 변화 확인
5. 스케일을 120%로 변경하고 추가 확대 확인

**기대 결과**:
- 기본 상태: 최소 10px 이상 (가독 가능)
- Readable 모드: 약 12-14px (더 읽기 쉬움)
- 스케일 120%: 추가 20% 확대

**확인 포인트**:
- ✅ 단계 라벨 텍스트 가독 가능
- ✅ 배지 라벨/상태 텍스트 가독 가능
- ✅ 복구 트레이스 텍스트 가독 가능
- ✅ Readable 모드에서 추가 상향 적용

---

### 시나리오 E: 반응형 레이아웃 호환성

**목적**: 다양한 화면 크기에서 UI 컨트롤이 정상 동작하는지 확인

**실행**:
1. 브라우저 창 너비를 1200px 이상으로 설정 (데스크톱)
2. UI 컨트롤 정상 표시 확인
3. 창 너비를 768px~1200px로 조절 (태블릿)
4. UI 컨트롤 정상 표시 확인
5. 창 너비를 768px 이하로 조절 (모바일)
6. 기본 폰트가 14px로 축소되고 UI 컨트롤 유지 확인

**확인 포인트**:
- ✅ 모든 브레이크포인트에서 UI 컨트롤 접근 가능
- ✅ 모바일에서 기본 폰트 크기 축소 적용
- ✅ 스케일/Readable 설정이 모바일에서도 유효

---

## 4. 실행 결과 확인

### 4.1 DOM 속성 확인

개발자 도구에서 `<html>` 요소 확인:

```html
<!-- 기본 상태 -->
<html data-ui-scale="1" data-readable="false" style="--ui-scale-factor: 1;">

<!-- 스케일 120% + Readable 활성 -->
<html data-ui-scale="1.2" data-readable="true" style="--ui-scale-factor: 1.2;">
```

### 4.2 CSS 변수 확인

개발자 도구 Console에서:
```javascript
getComputedStyle(document.documentElement).getPropertyValue('--ui-scale-factor')
// 예상: "1" 또는 "1.2" 등
```

### 4.3 성공/실패 판단 기준

**성공**:
- ✅ UI 스케일 조절 시 모든 텍스트 크기 변경
- ✅ Readable 모드 토글 시 CRT 효과 완화/복원
- ✅ 설정이 localStorage에 저장되고 새로고침 후 복원
- ✅ Agent Console 마이크로 텍스트 가독성 개선
- ✅ 레이아웃 깨짐 없음

**실패 시 확인**:
- ❌ 스케일 변경 안 됨 → `--ui-scale-factor` CSS 변수 확인
- ❌ Readable 모드 작동 안 함 → `data-readable` 속성 확인
- ❌ 설정 유지 안 됨 → localStorage 키 확인
- ❌ 마이크로 텍스트 변화 없음 → `--font-size-xs` 변수 확인

---

## 5. 문제 해결 (Troubleshooting)

### 5.1 일반적인 오류

**오류**: UI 컨트롤이 Header에 표시되지 않음
- **원인**: App.tsx에서 UIControls 컴포넌트 렌더링 누락
- **해결**: GameHeader 컴포넌트에 UI 컨트롤 props 전달 확인

**오류**: 스케일 변경이 적용되지 않음
- **원인**: CSS 변수 `--ui-scale-factor`가 DOM에 설정되지 않음
- **해결**: `applyUIPrefsToDOM()` 함수 호출 확인, useEffect 의존성 배열 확인

**오류**: localStorage에 설정이 저장되지 않음
- **원인**: zustand persist 미들웨어 설정 오류
- **해결**: `uiPrefsStore.ts`의 persist 설정 확인

**오류**: Readable 모드에서 스캔라인이 계속 표시됨
- **원인**: CSS 선택자 `html[data-readable='true']` 불일치
- **해결**: data-readable 속성이 문자열 `"true"`/`"false"`로 설정되었는지 확인

### 5.2 환경별 주의사항

- **Windows**: 특이사항 없음
- **macOS/Linux**: 특이사항 없음
- **브라우저**: Chrome, Firefox, Edge에서 테스트됨. Safari에서 일부 CSS 변수 지원 확인 필요

---

## 6. 다음 단계

- **U-029**: nanobanana MCP 에셋 파이프라인 - 아이콘/배지의 스케일/Readable 연동 고려
- **SaveGame 통합**: `uiPrefsStore.getSerializableState()`를 통해 SaveGame JSON에 포함 가능
