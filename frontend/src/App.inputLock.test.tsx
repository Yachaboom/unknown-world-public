import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';
import * as turnStream from './api/turnStream';
import { useWorldStore } from './stores/worldStore';
import { useAgentStore } from './stores/agentStore';

// i18next 모킹
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

// api 모킹
vi.mock('./api/turnStream', () => ({
  startTurnStream: vi.fn(),
}));

describe('App - U-087 Input Locking Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useWorldStore.getState().reset();
    useAgentStore.getState().reset();

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
  });

  const selectProfileAndStart = async () => {
    render(<App />);
    const techProfile = screen.getByLabelText('profile.tech.name');
    fireEvent.click(techProfile);

    await waitFor(() => {
      expect(screen.getByText('panel.agent_console.title')).toBeInTheDocument();
    });
  };

  it('prevents interaction when isStreaming is true', async () => {
    await selectProfileAndStart();

    // 1. 스트리밍 상태 시작
    await act(async () => {
      useAgentStore.getState().startStream();
    });

    // 2. 입력 잠금 시각적 피드백 확인 (placeholder)
    await waitFor(
      () => {
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.placeholder).toBe('ui.input_locked');
        expect(input.disabled).toBe(true);
      },
      { timeout: 2000 },
    );

    // 3. 카드 클릭 시도
    const cards = screen.getAllByRole('button', { name: /action.default/ });
    if (cards.length > 0) {
      fireEvent.click(cards[0]);
    }

    // 4. 검증: 턴 실행 및 액션 로그 생성 차단
    expect(turnStream.startTurnStream).not.toHaveBeenCalled();
    const entries = useWorldStore.getState().narrativeEntries;
    expect(entries.filter((e) => e.type === 'action_log')).toHaveLength(0);
  });

  it('prevents interaction when processingPhase is not idle', async () => {
    await selectProfileAndStart();

    // 1. 처리 단계 설정
    await act(async () => {
      useWorldStore.getState().setProcessingPhase('processing');
    });

    // 2. UI 상태 확인 (제출 버튼 텍스트)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ui.wait' })).toBeInTheDocument();
    });

    // 3. 커맨드 제출 시도
    const submitBtn = screen.getByRole('button', { name: 'ui.wait' });
    fireEvent.click(submitBtn);

    // 4. 검증
    expect(turnStream.startTurnStream).not.toHaveBeenCalled();
  });

  it('prevents interaction when imageLoading is true', async () => {
    await selectProfileAndStart();

    // 1. 이미지 로딩 상태 설정
    await act(async () => {
      useWorldStore.getState().setImageLoading(1);
    });

    // 2. 입력 잠금 확인 (placeholder 및 disabled)
    await waitFor(() => {
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.placeholder).toBe('ui.input_locked');
      expect(input.disabled).toBe(true);

      const submitBtn = screen.getByRole('button', { name: 'ui.wait' });
      expect(submitBtn).toBeDisabled();
    });

    // 3. 검증 (액션 로그 생성 차단)
    const entries = useWorldStore.getState().narrativeEntries;
    expect(entries.filter((e) => e.type === 'action_log')).toHaveLength(0);
  });
});
