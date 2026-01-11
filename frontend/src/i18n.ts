import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// i18n 리소스 정의 (RULE-006 준수)
const resources = {
  ko: {
    translation: {
      scene: {
        status: {
          default: '데이터 대기 중',
          loading: '동기화 중...',
          offline: '연결 끊김',
          blocked: '접근 제한됨',
          low_signal: '신호 약함',
          image_error: '장면 이미지를 불러올 수 없습니다.',
        },
      },
      agent: {
        console: {
          queue: '대기열',
          badges: '검증 배지',
          repair: '자동 복구',
          status: {
            idle: '대기 중',
            processing: '처리 중',
          },
          badges_empty: '[ 검증 대기 중 ]',
          repaired: '(복구됨)',
        },
      },
      ui: {
        command_placeholder: '명령을 입력하세요...',
        processing: '처리 중...',
        execute: '실행',
        wait: '대기',
      },
    },
  },
  en: {
    translation: {
      scene: {
        status: {
          default: 'NO SIGNAL DATA',
          loading: 'SYNCHRONIZING...',
          offline: 'CONNECTION LOST',
          blocked: 'ACCESS RESTRICTED',
          low_signal: 'LOW SIGNAL',
          image_error: 'Unable to load scene image.',
        },
      },
      agent: {
        console: {
          queue: 'Queue',
          badges: 'Badges',
          repair: 'Auto-repair',
          status: {
            idle: 'IDLE',
            processing: 'PROCESSING',
          },
          badges_empty: '[ Awaiting Validation ]',
          repaired: '(Repaired)',
        },
      },
      ui: {
        command_placeholder: 'Enter command...',
        processing: 'Processing...',
        execute: 'EXECUTE',
        wait: 'WAIT',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ko', // 기본 언어
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
