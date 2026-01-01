# 재화/비용/원장(Economy) 세부 지침

> **[적용 컨텍스트]**: economy, cost, ledger, signal, memory-shard, budget, pricing, balance
> 
> **[설명]**: Signal/Memory Shard 재화로 비용과 지연을 제어하고, 원장(ledger)으로 추적 가능하게 만든다. 잔액 음수는 금지다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “재화/비용/원장” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 모든 행동에는 "예상 비용(최소/최대) + 확정 비용 + balance_after"가 있어야 한다

**설명**: 비용/지연을 UX/게임 메커닉으로 전환하는 것이 핵심이다.

**올바른 예시 (Do ✅)**:
```
- action_card: { cost_estimate: {signal_min, signal_max, shard_min, shard_max}, ... }
- turn_output.economy: { cost: {...}, balance_after: {...} }
```

**잘못된 예시 (Don't ❌)**:
```
- 비용 표기 없이 이미지 생성/Thinking High 실행
- balance_after 없이 "차감됨" 텍스트만 출력
```

### 규칙 2: 원장(ledger)은 "이유/근거"까지 남기되, 잔액 음수는 절대 허용하지 않는다

**올바른 예시 (Do ✅)**:
```
ledger_entry = {
  turn_id, action_id,
  cost: {signal, memory_shard},
  balance_before, balance_after,
  reason: "image_generation_2k" | "text_turn" | "repair_retry",
  model_label: "FAST" | "QUALITY" | "REF"
}
```

**잘못된 예시 (Don't ❌)**:
```
- ledger 없이 현재 잔액만 갱신
- 부족한데도 실행하고 음수로 내려감
```

### 규칙 3: 잔액 부족 시 "대체 행동"을 반드시 제공한다

**설명**: 부족하면 막는 게 아니라 “텍스트-only/저해상도/이미지 생략/Thinking 낮춤” 등 대안을 제안해야 한다.

**올바른 예시 (Do ✅)**:
```
- "이미지 생성 없이 진행" 카드 제공
- "1K로 낮춰 생성" / "편집 1회로 제한" 같은 정책 기반 대안
```

**잘못된 예시 (Don't ❌)**:
```
- "재화가 부족합니다"로 끝(플레이 중단)
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 비용 추정 불가**: 최소한 상한(최대) 기준으로 보수적으로 안내하고, 실행 전 확인/대안을 제공한다.
</exceptions>

## 3. 체크리스트

- [ ] 행동 전 cost_estimate(최소/최대)가 노출된다
- [ ] turn_output에 cost + balance_after가 포함된다
- [ ] ledger가 남고 잔액 음수는 불가능하다
- [ ] 부족 시 대체 행동이 항상 제공된다


