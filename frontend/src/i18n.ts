/**
 * Unknown World - i18n 초기화 모듈
 *
 * 언어 리소스를 JSON 파일 구조로 관리합니다.
 * RULE-006 준수: ko/en 혼합 출력 금지, i18n 키 기반 SSOT
 *
 * 언어 코드: BCP-47 형식 (ko-KR, en-US)
 * - TurnInput/SaveGame의 language 필드와 동일한 축
 *
 * @see vibe/prd.md 3.1(지원 언어), 8.7(TurnInput.language)
 * @see frontend/src/locales/README.md
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// JSON 언어 리소스 import (SSOT: locales/{lang}/translation.json)
import koKR from './locales/ko-KR/translation.json';
import enUS from './locales/en-US/translation.json';

/** 지원 언어 타입 (TurnInput.language와 동기화) */
export type SupportedLanguage = 'ko-KR' | 'en-US';

/** 기본 언어 (데모 일관성을 위해 ko-KR 고정) */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'ko-KR';

/** 폴백 언어 */
export const FALLBACK_LANGUAGE: SupportedLanguage = 'en-US';

/** 지원 언어 목록 */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ko-KR', 'en-US'];

// i18n 리소스 정의 (BCP-47 형식 언어 코드)
const resources = {
  'ko-KR': {
    translation: koKR,
  },
  'en-US': {
    translation: enUS,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: FALLBACK_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false, // React에서 이미 XSS 방지
  },
  // 누락 키 처리 (개발 모드에서 경고)
  saveMissing: false,
  missingKeyHandler: (_lngs, _ns, key) => {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}"`);
    }
  },
});

/**
 * 현재 해결된 언어 코드를 반환합니다.
 * TurnInput.language와 동기화할 때 사용합니다.
 */
export function getResolvedLanguage(): SupportedLanguage {
  return (i18n.resolvedLanguage as SupportedLanguage) || DEFAULT_LANGUAGE;
}

/**
 * 언어를 변경합니다.
 * 향후 U-036 완료 후 사용자에게 노출할 토글에서 사용합니다.
 */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
}

export default i18n;
