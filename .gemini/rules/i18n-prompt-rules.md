# i18n/프롬프트 세부 지침

> **[적용 컨텍스트]**: i18n, ko-KR, en-US, localization, prompt, prompts, prompt-version, policy-preset, react-i18next, i18next
>
> **[설명]**: ko/en 혼합 출력 금지, 프롬프트 파일 분리/버저닝, UI 문자열 i18n 키 사용을 강제한다.
>
> **[참조]**: `.gemini/GEMINI.md`의 “i18n/프롬프트” 키워드 블록에 의해 임포트됨.

---

## 1. 핵심 규칙

<rules>

### 규칙 1: 언어는 TurnInput.language를 따르고, 턴 출력도 동일 언어로 고정한다

**올바른 예시 (Do ✅)**:

```
TurnInput.language = "ko-KR"  -> TurnOutput.language = "ko-KR"
TurnInput.language = "en-US"  -> TurnOutput.language = "en-US"
```

**잘못된 예시 (Don't ❌)**:

```
- 한 턴 안에서 ko/en 문장이 섞임
- UI는 ko인데 내러티브는 en(또는 반대)
```

### 규칙 2: 프롬프트 원문은 백엔드 `.md` 파일로 관리하고(언어별 분리 권장), UI에 노출하지 않는다

**올바른 예시 (Do ✅)**:

```
backend/prompts/system/game_master.ko.md
backend/prompts/system/game_master.en.md
backend/prompts/turn/turn_output_instructions.ko.md
backend/prompts/turn/turn_output_instructions.en.md
```

**잘못된 예시 (Don't ❌)**:

```
- 프롬프트를 코드 문자열로 하드코딩
- UI/로그에 프롬프트 전문을 출력
```

### 규칙 3: 프롬프트/정책은 버저닝하고 메타를 응답/로그에 남긴다(원문은 제외)

**올바른 예시 (Do ✅)**:

```
- prompt_version, policy_preset, model_label(FAST/QUALITY/REF) 메타를 기록
```

**잘못된 예시 (Don't ❌)**:

```
- 어떤 프롬프트/정책으로 생성했는지 추적 불가
```

### 규칙 4: 프론트 UI 문자열은 i18n 키 사용(하드코딩 금지)

**올바른 예시 (Do ✅)**:

```
t("hud.signal") / t("actionDeck.execute") 처럼 키 기반
```

**잘못된 예시 (Don't ❌)**:

```
"실행" / "Signal" 같은 문자열을 컴포넌트에 직접 작성
```

</rules>

## 2. 예외 처리

<exceptions>
- **예외: 프로토타입/스파이크**: 임시로 하드코딩이 필요해도, PR로 병합하기 전 i18n 키로 정리한다.
</exceptions>

## 3. 체크리스트

- [ ] TurnInput.language와 TurnOutput.language가 항상 일치한다
- [ ] ko/en 혼합 출력이 없다
- [ ] 프롬프트는 `.md` 파일로 관리되고 원문이 UI에 노출되지 않는다
- [ ] UI 문자열은 i18n 키로 렌더링한다
