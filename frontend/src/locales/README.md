# i18n 언어 리소스 가이드 (Unknown World)

이 디렉토리는 Unknown World의 **프론트엔드 UI 문자열 리소스**를 관리하는 SSOT(Single Source of Truth)입니다.

## 디렉토리 구조

```
locales/
├── ko-KR/
│   └── translation.json    # 한국어 리소스
├── en-US/
│   └── translation.json    # 영어 리소스
└── README.md               # 이 문서
```

## 지원 언어

| 코드    | 언어   | 상태 | 비고           |
| ------- | ------ | ---- | -------------- |
| `ko-KR` | 한국어 | 기본 | 데모 기준 언어 |
| `en-US` | 영어   | 폴백 | fallbackLng    |

> **언어 코드 규칙**: BCP-47 형식을 사용합니다 (`ko-KR`, `en-US`).  
> TurnInput/SaveGame의 `language` 필드와 동일한 축입니다.

## 키 네이밍 규칙

키는 **도메인.섹션.항목** 형태의 계층 구조를 따릅니다.

### 도메인 목록

| 도메인       | 용도                                    |
| ------------ | --------------------------------------- |
| `scene`      | Scene Canvas 관련 메시지                |
| `agent`      | Agent Console 관련 라벨/상태            |
| `ui`         | 공통 UI 요소 (버튼, 입력, 플레이스홀더) |
| `economy`    | 재화 관련 라벨                          |
| `connection` | 연결 상태                               |
| `panel`      | 패널별 타이틀/플레이스홀더              |
| `action`     | 액션 카드/선택지                        |
| `narrative`  | 내러티브/게임 로그                      |

### 예시

```json
{
  "scene.status.loading": "동기화 중...",
  "agent.console.badges": "검증 배지",
  "ui.execute": "실행",
  "panel.inventory.placeholder": "[ 드래그 앤 드롭 영역 ]"
}
```

## 새 언어 추가 절차

1. **디렉토리 생성**: `locales/{언어코드}/` 생성 (예: `ja-JP`)
2. **translation.json 복사**: `ko-KR/translation.json`을 복사하여 시작점으로 사용
3. **번역 작업**: 모든 값을 해당 언어로 번역
4. **i18n.ts 등록**: `frontend/src/i18n.ts`에 새 언어 리소스 import 및 등록
5. **검증**: 누락된 키가 없는지 확인 (i18next의 `missingKeyHandler` 활용)

```typescript
// frontend/src/i18n.ts
import jaJP from './locales/ja-JP/translation.json';

const resources = {
  'ko-KR': { translation: koKR },
  'en-US': { translation: enUS },
  'ja-JP': { translation: jaJP }, // 새 언어 추가
};
```

## 사용 방법

### 기본 사용

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return <button>{t('ui.execute')}</button>;
}
```

### 보간 (Interpolation)

```tsx
// JSON
{ "narrative.turn_label": "[TURN {{turn}}]" }

// 컴포넌트
<span>{t('narrative.turn_label', { turn: 5 })}</span>
// 결과: "[TURN 5]"
```

### 언어 변경 (향후)

```tsx
import { useTranslation } from 'react-i18next';

function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.resolvedLanguage === 'ko-KR' ? 'en-US' : 'ko-KR';
    i18n.changeLanguage(newLang);
  };

  return <button onClick={toggleLanguage}>🌐</button>;
}
```

## 금지사항

### ❌ 텍스트를 이미지에 포함하지 마세요

이미지에 텍스트를 박으면:

- 언어 변경 시 이미지를 교체해야 함
- 리사이즈 시 가독성 저하
- 접근성 문제 (스크린 리더)

**대신**: 이미지와 텍스트를 분리하고, 텍스트는 i18n 키로 관리

### ❌ 하드코딩 문자열 금지

```tsx
// ❌ Bad
<button>실행</button>

// ✅ Good
<button>{t('ui.execute')}</button>
```

### ❌ ko/en 혼합 출력 금지 (RULE-006)

동일 화면에서 한국어와 영어가 섞여 나오면 안 됩니다.
모든 UI 문자열은 현재 선택된 언어로 일관되게 표시되어야 합니다.

### ❌ 키 임의 삭제/변경 금지

키를 삭제하거나 이름을 변경하면 기존 코드에서 참조 오류가 발생합니다.

- 삭제: deprecated 마킹 후 충분한 기간을 두고 제거
- 변경: 새 키 추가 → 마이그레이션 → 구 키 제거

## 검증 체크리스트

새 리소스 추가/수정 시:

- [ ] 모든 지원 언어에 동일한 키가 존재하는지 확인
- [ ] 보간 변수명이 일치하는지 확인 (`{{variable}}`)
- [ ] 빌드 및 린트 통과
- [ ] 실제 UI에서 문자열이 올바르게 표시되는지 확인

## 참고 문서

- `vibe/prd.md` - 3.1(지원 언어), 8.7(TurnInput.language)
- `vibe/tech-stack.md` - i18next/react-i18next 버전
- `.cursor/rules/00-core-critical.mdc` - RULE-006(i18n/언어 혼합 금지)
- [i18next 공식 문서](https://www.i18next.com/)
- [react-i18next 공식 문서](https://react.i18next.com/)
