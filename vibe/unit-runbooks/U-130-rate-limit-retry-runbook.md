# U-130 Rate Limit 재시도 안내 UI — 런북

## 개요
429 Rate Limit 에러 시 프론트엔드에 재시도 안내 패널을 표시하고,
사용자가 60초 카운트다운 후 재시도 버튼으로 마지막 턴을 다시 실행할 수 있는 기능.

## 전제 조건
- 프론트엔드: `pnpm -C frontend dev` (포트 8001)
- 백엔드: `uvicorn` 실행 (포트 8011) — 또는 fetch mock 사용

## 시나리오 1: Fetch Mock으로 RATE_LIMITED 시뮬레이션

### 준비
1. `http://localhost:8001` 접속
2. 프로필 선택 → 게임 진입

### 실행
1. 브라우저 DevTools Console에서 다음 스크립트 실행:

```javascript
// fetch를 override하여 /api/turn 요청에 RATE_LIMITED 에러 반환
window.__originalFetch = window.__originalFetch || window.fetch;
window.fetch = function(url, options) {
  if (typeof url === 'string' && url.includes('/api/turn')) {
    const events = [
      JSON.stringify({"type":"stage","name":"parse","status":"start"}) + "\n",
      JSON.stringify({"type":"stage","name":"parse","status":"complete"}) + "\n",
      JSON.stringify({"type":"stage","name":"validate","status":"start"}) + "\n",
      JSON.stringify({"type":"stage","name":"validate","status":"complete"}) + "\n",
      JSON.stringify({"type":"error","message":"API 요청 한도를 초과했습니다.","code":"RATE_LIMITED"}) + "\n",
    ];
    return Promise.resolve(new Response(events.join(''), {
      status: 200,
      headers: { 'Content-Type': 'application/x-ndjson' }
    }));
  }
  return window.__originalFetch.apply(this, arguments);
};
```

2. 행동 카드 클릭 또는 명령 입력으로 턴 실행

### 기대 결과
- [x] 화면 중앙에 Rate Limit 안내 패널 표시
  - 경고 아이콘 (⚠)
  - 제목: "API 요청 한도 초과"
  - 상세: "요청이 너무 많아 일시적으로 제한되었습니다..."
  - 60초 카운트다운 프로그레스 바
  - 재시도 버튼 (카운트다운 중 disabled)
- [x] Agent Console에 `⏳ API 요청 한도 초과` 표시
- [x] 입력 잠금 유지 (모든 버튼/입력 disabled)
- [x] Scene Canvas: offline으로 전환되지 않음 (기존 상태 유지)
- [x] 연결 상태: "온라인" 유지
- [x] 60초 후 재시도 버튼 활성화

### 재시도 확인
1. fetch mock 해제:

```javascript
window.fetch = window.__originalFetch;
```

2. 60초 대기 후 "다시 시도" 버튼 클릭
3. 정상 백엔드가 실행 중이면 마지막 턴이 재실행됨
   (백엔드 미실행 시 연결 에러 발생 → 정상 동작)

## 시나리오 2: 실제 백엔드 Rate Limit 발생

### 준비
- Vertex AI API에서 실제 429 RESOURCE_EXHAUSTED 에러가 발생하는 환경
  (동시 요청 폭주 또는 할당량 초과)

### 실행
1. 게임 진입 후 여러 턴을 빠르게 연속 실행
2. 백엔드 repair_loop에서 Primary 모델 → Fallback 모델 전환 후에도 실패 시 발동

### 기대 결과
- 시나리오 1과 동일한 UI 표시
- 백엔드 로그: `[RepairLoop] 최종 폴백 반환 ... is_rate_limited=True`

## 검증 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| 1 | 패널 z-index가 input-lock-overlay 위 | ✅ z-index: 9995 > 9990 |
| 2 | 카운트다운 0초 도달 시 버튼 활성화 | ✅ |
| 3 | 재시도 시 isRateLimited false로 초기화 | ✅ startStream()에서 초기화 |
| 4 | i18n: ko-KR / en-US 모두 표시 | ✅ translation.json 키 추가 |
| 5 | reduced-motion 대응 | ✅ 애니메이션 비활성화 |
| 6 | CRT 테마 + warning 색상 | ✅ --warning-color 사용 |
| 7 | Scene 상태 유지 (offline 전환 안 함) | ✅ turnRunner에서 분기 |
| 8 | Agent Console에 전용 에러 표시 | ✅ ⏳ 아이콘 + 경고 색상 |
