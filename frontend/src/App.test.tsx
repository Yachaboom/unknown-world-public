import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import * as turnStream from './api/turnStream';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'scene.hotspot.click_action') {
        return `Click: ${options?.label}`;
      }
      return key;
    },
    i18n: {
      changeLanguage: () => Promise.resolve(),
      resolvedLanguage: 'ko-KR',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// ResizeObserver 모킹
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// getBoundingClientRect 모킹
Element.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: () => {},
})) as unknown as () => DOMRect;

// api 모킹
vi.mock('./api/turnStream', () => ({
  startTurnStream: vi.fn(),
}));

describe('App Integration - Hotspot Click', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger startTurnStream when a hotspot is clicked', async () => {
    render(<App />);

    // 데모용으로 App.tsx에 하드코딩된 '터미널' 핫스팟 찾기
    const terminalHotspot = screen.getByLabelText('터미널');
    expect(terminalHotspot).toBeInTheDocument();

    // 클릭 시뮬레이션
    fireEvent.click(terminalHotspot);

    // startTurnStream 호출 확인
    expect(turnStream.startTurnStream).toHaveBeenCalled();

    const [input] = vi.mocked(turnStream.startTurnStream).mock.calls[0];

    // TurnInput 검증
    expect(input.text).toBe('Click: 터미널');
    expect(input.click).toEqual({
      object_id: 'demo-terminal',
      box_2d: { ymin: 300, xmin: 100, ymax: 600, xmax: 400 },
    });
  });
});
