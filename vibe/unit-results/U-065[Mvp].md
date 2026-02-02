# U-065[Mvp]: TurnOutput 스키마 단순화 - 구현 결과

## 메타데이터

| 항목      | 내용                        |
| --------- | --------------------------- |
| Unit ID   | U-065[Mvp]                  |
| Phase     | MVP                         |
| 완료일    | 2026-02-02                  |
| 소요 시간 | 약 120분                    |
| 상태      | ✅ 완료                     |

## 구현 요약

Gemini API의 구조화된 출력(Controlled Generation) 제한을 우회하기 위해 TurnOutput 스키마를 단순화했습니다.

### 핵심 변경사항

#### 1. ActionCard 필드 단순화

**제거된 필드**:
- `description`: 카드 설명 → narrative에서 자연어로 표현
- `cost_estimate`: 예상 비용 범위 → `cost` 단일 필드 사용
- `hint`: 힌트 텍스트 → 제거
- `reward_hint`: 보상 힌트 → 제거
- `disabled_reason`: 비활성화 사유 → 제거 (enabled 필드로 대체)

**유지된 필드**:
- `id`: 카드 고유 ID (필수)
- `label`: 카드 라벨 (필수)
- `cost`: 예상 비용 (필수)
- `risk`: 위험도 (기본값: low)
- `enabled`: 실행 가능 여부 (기본값: true)
- `is_alternative`: 저비용 대안 카드 여부 (기본값: false)

#### 2. 배열 제한 강화

| 필드                        | 이전 | 이후 |
| --------------------------- | ---- | ---- |
| ActionDeck.cards            | 10   | 5    |
| UIOutput.objects            | -    | 5    |
| WorldDelta.rules_changed    | -    | 3    |
| WorldDelta.quests_updated   | -    | 3    |
| WorldDelta.relationships    | -    | 3    |
| WorldDelta.inventory_added  | -    | 5    |
| WorldDelta.inventory_removed| -    | 5    |
| WorldDelta.memory_pins      | -    | 2    |
| ImageJob.reference_ids      | -    | 2    |
| AgentConsole.badges         | 10   | 4    |

## 수정된 파일

### 백엔드

| 파일 | 변경 내용 |
| ---- | --------- |
| `models/turn.py` | ActionCard 필드 단순화, 배열 max_length 축소 |
| `orchestrator/fallback.py` | ActionCard 생성 시 제거된 필드 미전달 |
| `orchestrator/mock.py` | Mock 카드 생성 시 제거된 필드 미전달 |
| `validation/language_gate.py` | 텍스트 추출 시 제거된 필드 접근 제거 |

### 프론트엔드

| 파일 | 변경 내용 |
| ---- | --------- |
| `schemas/turn.ts` | Zod 스키마 동기화 (ActionCard 필드 제거) |
| `components/ActionDeck.tsx` | UI 컴포넌트 수정 (제거된 필드 참조 제거) |
| `components/ActionDeck.test.tsx` | 테스트 수정 (Mock 데이터 업데이트) |
| `stores/actionDeckStore.ts` | 스토어 로직 수정 (cost_estimate → cost) |
| `stores/actionDeckStore.test.ts` | 테스트 수정 (Mock 데이터 업데이트) |

## 검증 결과

### 린터/타입 체크

```
✅ backend: ruff check . - 0 errors
✅ backend: pyright - 0 errors (src 디렉토리)
✅ frontend: pnpm run lint - 0 errors
✅ frontend: pnpm run typecheck - 0 errors
```

### 수동 테스트

#### curl API 테스트

```bash
curl -X POST http://localhost:8011/api/turn -H "Content-Type: application/json" \
  -d '{"language": "ko-KR", "text": "탐색하기", ...}'

# 결과: ActionCard에서 description, cost_estimate, hint, reward_hint, disabled_reason 제거됨
{
  "id": "fallback_text_only",
  "label": "텍스트로 진행하기",
  "cost": {"signal": 1, "memory_shard": 0},
  "risk": "low",
  "enabled": true,
  "is_alternative": true
}
```

#### 브라우저 테스트 (Real 모드)

1. 프론트엔드 접속 (http://localhost:8001)
2. "탐색하기" 카드 클릭
3. 결과:
   - Parse → Validate → Plan → Resolve → Render → Verify → Commit 단계 진행
   - 검증 배지: Schema OK, Economy OK, Safety OK, Consistency OK
   - 폴백 응답 반환 (스키마 복잡도가 여전히 높을 수 있음)
   - UI 정상 동작, 재화 시스템 정상 (비용 0으로 잔액 유지)

## 페어링 결정 확인

| 질문 | 결정 |
| ---- | ---- |
| Q1: 단순화 방식 | Option A: 필드 축소 |
| Q2: 배열 크기 제한 | Option A: 5/5/5 (보수적) |
| Q3: 제거할 필드 | Option A: description 등 → narrative에서 자연어로 표현 |

## 알려진 제한사항

1. **Gemini API 400 에러 가능성**: 스키마 단순화 후에도 Gemini API가 스키마 복잡도 에러를 반환할 수 있음. 이 경우 폴백 응답이 반환됨.
2. **정보 손실**: 제거된 필드(description, hint 등)의 정보는 narrative에서 자연어로 표현되어야 함.

## 관련 문서

- 계획서: `vibe/unit-plans/U-065[Mvp].md`
- 의존성: `vibe/unit-results/U-064[Mvp].md` (이미지 생성 API 수정)
- 부채 로그: `vibe/debt-log.md` (✅ 해결됨 표시)

## 다음 단계 권장

1. **MMP 단계**: 스키마 확장 시 Gemini 제한 고려 필요
2. **추가 단순화**: Gemini API 에러가 지속되면 추가 필드 제거 또는 단계별 생성 방식 검토
3. **프롬프트 최적화**: 제거된 필드 정보를 narrative에서 자연어로 표현하도록 프롬프트 개선
