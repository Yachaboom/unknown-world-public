# [Runbook] RU-005-S3: “/api/turn stage pipeline” 수동 검증 시나리오 패키지

## 📌 개요
본 런북은 RU-005 오케스트레이터 파이프라인 리팩토링 이후, 백엔드 스트리밍 계약 및 UX 인바리언트가 유지되는지 확인하기 위한 수동 검증 절차를 정의합니다.

- **대상 유닛**: RU-005 (Q1, Q3, Q4, S1, S2, S3)
- **핵심 목표**: Stage 순서, 배지 배출, 에러 폴백, i18n 일관성 확인

---

## 🛠️ 준비 사항

### 백엔드 서버 실행
```bash
cd backend
# mock 모드로 실행
UW_MODE=mock uv run uvicorn unknown_world.main:app --reload --port 8011
```

---

## 🧪 검증 시나리오

### 시나리오 1: 헬스체크 확인
- **방법**: `curl -s "http://localhost:8011/health"`
- **기대 결과**: `{"status": "ok"}` 응답 확인

### 시나리오 2: 정상 요청 → 이벤트 시퀀스 확인
- **방법**:
```bash
curl -N -X POST "http://localhost:8011/api/turn?seed=42" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "ko-KR",
    "text": "문을 열어본다",
    "client": { "viewport_w": 1920, "viewport_h": 1080, "theme": "dark" },
    "economy_snapshot": { "signal": 100, "memory_shard": 5 }
  }'
```
- **기대 결과**:
  - ✅ `stage` 이벤트: `parse → validate → plan → resolve → render → verify → commit` (start/complete)
  - ✅ `badges` 이벤트 출력
  - ✅ `narrative_delta` 스트리밍
  - ✅ `final` 이벤트 1회로 종료

### 시나리오 3: 재화 부족 → repair + 폴백 확인
- **방법**: `text: "무리하게 돌진한다"`, `signal: 0, memory_shard: 0`으로 요청
- **기대 결과**:
  - ✅ `repair` 이벤트 발생
  - ✅ `final`에서 비용 0, 잔액 보존 확인 (RULE-005)

### 시나리오 4: 잘못된 입력 → error + 폴백 확인
- **방법**: 필수 필드가 누락된 JSON 요청
- **기대 결과**:
  - ✅ `error` 이벤트 출력
  - ✅ `final`(폴백) 1회로 안전 종료 (RULE-004)

### 시나리오 5: en-US 요청 → i18n 일관성 확인
- **방법**: `language: "en-US"`로 요청 및 repair/error 유도
- **기대 결과**:
  - ✅ 시스템 메시지 및 repair 피드백이 영어로 유지 (RULE-006)

### 시나리오 6: real 모드 종료 인바리언트 (선택)
- **방법**: `UW_MODE=real`로 실행 후 동일 요청
- **기대 결과**: 모델 호출 실패 시에도 `error` + `final`로 안전하게 수렴하는지 확인

---

## ✅ 체크리스트
- [ ] 모든 시나리오에서 최종적으로 `final` 이벤트가 도달하는가?
- [ ] `stage` 이벤트 순서가 PRD 명세와 일치하는가?
- [ ] 비즈니스 룰 실패 시 적절한 `badges`가 배출되는가?
- [ ] 폴백 상황에서 유저의 재화 잔액이 보존되는가?
