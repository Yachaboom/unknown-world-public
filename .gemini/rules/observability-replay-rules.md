# 관측(Observability) / 리플레이(Replay) 세부 지침

> **[적용 컨텍스트]**: observability, agent-console, autopilot, action-queue, badges, ttfb, metrics, replay, scenario, demo-mode, demo-profile, preset
>
> **[설명]**: “에이전트형 시스템”임을 증명하기 위해 Plan/Queue/Badges/Auto-repair 트레이스를 UI/아티팩트로 남긴다(프롬프트/CoT는 제외).
>
> **[참조]**: `.gemini/GEMINI.md`의 “관측/리플레이/오토파일럿” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: Agent Console은 결과가 아니라 "과정(단계/큐/배지)"를 보여준다

**올바른 예시 (Do ✅)**:

```
Queue: Parse → Validate → Plan → Resolve → Render → Verify → Commit
Badges: Schema OK / Economy OK / Safety OK / Consistency OK
Auto-repair: #1/#2... (시도/결과)
```

**잘못된 예시 (Don't ❌)**:

```
- 내러티브만 보여주고 시스템 단계/검증은 숨김
```

### 규칙 2: Demo Mode에서 “프롬프트 원문”은 숨기고, 사용자 친화 라벨만 노출한다

**올바른 예시 (Do ✅)**:

```
- FAST / QUALITY / CHEAP / REF 같은 라벨로 선택 이유를 표시
- prompt_version/policy_preset 같은 메타는 숫자/코드로만 노출
```

**잘못된 예시 (Don't ❌)**:

```
- 시스템 프롬프트 전문을 디버그 패널에 표시
```

### 규칙 3: 리플레이/시나리오 하네스는 "액션 시퀀스 + 인바리언트" 중심

**올바른 예시 (Do ✅)**:

```
scenario = {
  seed,
  actions: [text|click|drag|upload ...],
  invariants: ["schema_valid", "economy_non_negative", "safety_fallback_present"]
}
```

**잘못된 예시 (Don't ❌)**:

```
- 리플레이가 없어서 회귀(regression)를 감지할 수 없음
```

### 규칙 4: 심사자용 데모 프로필(프리셋 유저) 3종 + 즉시 리셋을 제공한다

**설명**: PRD는 “회원가입/설정/대기” 없이 10분 안에 핵심 기능을 보여주기 위해 데모 프로필을 필수로 요구한다.

**올바른 예시 (Do ✅)**:

```
- 첫 화면: Demo Profile 선택 (Narrator / Explorer / Tech Enthusiast)
- 로그인/가입 없이 즉시 시작
- Reset 버튼 1회로 초기 상태 복구(데모 반복 가능)
- 데모 프로필은 demo/staging에서만 활성화(운영 비활성)
```

**잘못된 예시 (Don't ❌)**:

```
- 회원가입/로그인/설정 완료 후에야 플레이 가능
- 리셋이 없어 데모 재시작이 느림
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 비결정성**: LLM 결과 텍스트는 달라도, 스키마/재화/안전/좌표 규약 같은 인바리언트는 항상 만족해야 한다.
</exceptions>

## 3. 체크리스트

- [ ] Queue/Badges/Auto-repair가 UI에서 확인 가능하다
- [ ] 프롬프트 원문/CoT는 노출되지 않는다
- [ ] 리플레이/시나리오가 seed+액션+인바리언트를 포함한다
- [ ] (데모 환경) 데모 프로필 선택 + 즉시 리셋이 가능하다
