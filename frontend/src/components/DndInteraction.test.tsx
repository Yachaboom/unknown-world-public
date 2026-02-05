import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as turnStream from '../api/turnStream';

// dnd-kit 모킹용 타입
interface MockDndCallbacks {
  onDragEnd: (event: {
    active: { id: string; data: { current: unknown } };
    over: { id: string; data: { current: unknown } } | null;
  }) => void;
}

// dnd-kit 모킹 (콜백 가로채기용)
vi.mock('@dnd-kit/core', async () => {
  const actual = (await vi.importActual('@dnd-kit/core')) as Record<string, unknown>;
  return {
    ...actual,
    DndContext: (props: MockDndCallbacks & { children: React.ReactNode }) => {
      // 콜백 저장 (테스트에서 접근 가능하도록 global에 저장)
      (global as unknown as Record<string, unknown>).dndCallbacks = props;
      return <div data-testid="mock-dnd-context">{props.children}</div>;
    },
  };
});

// i18next 모킹 (RU-003-Q5: 데모 i18n 키 지원)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      // 데모 아이템 이름
      if (key === 'demo.items.keycard-alpha.name') return '키카드 A';
      if (key === 'demo.items.medkit.name') return '응급 키트';
      if (key === 'demo.items.flashlight.name') return '손전등';
      if (key === 'demo.items.data-chip.name') return '데이터칩';
      // 데모 씬 오브젝트
      if (key === 'demo.scene.terminal.label') return '터미널';
      if (key === 'demo.scene.terminal.hint') return '활성화된 터미널이다';
      if (key === 'demo.scene.door.label') return '문';
      if (key === 'demo.scene.door.hint') return '잠겨있는 것 같다';
      // 액션 템플릿
      if (key === 'inventory.item_label') return `Item: ${options?.name}`;
      if (key === 'scene.hotspot.drop_action') {
        return `Drop: ${options?.item} on ${options?.target}`;
      }
      if (key === 'scene.hotspot.drop_invalid') {
        return `Invalid: ${options?.item}`;
      }
      if (key === 'action_log.use_item_on_hotspot') {
        return `Action: Use ${options?.item} on ${options?.hotspot}`;
      }
      if (key === 'connection.online') return 'ONLINE';
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
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// api 모킹
vi.mock('../api/turnStream', () => ({
  startTurnStream: vi.fn(),
}));

describe('DnD Interaction - Logic Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // prefers-reduced-motion 모킹 (NarrativeFeed에서 사용)
    // true로 설정하여 타이핑 효과를 생략하고 즉시 텍스트가 표시되게 함
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    //
  });

  it('should trigger turn execution when handleDragEnd is called with a hotspot target', async () => {
    render(<App />);

    // 1. 프로필 선택 (Playing 페이즈 진입)
    const narratorProfile = screen.getByLabelText('profile.narrator.name');
    fireEvent.click(narratorProfile);

    // U-060: 프로필 선택 후 DndContext 마운트를 기다림
    // DndContext가 렌더링된 후 콜백 가져오기
    const dndCallbacks = await waitFor(() => {
      const callbacks = (global as unknown as Record<string, MockDndCallbacks>).dndCallbacks;
      expect(callbacks).toBeDefined();
      expect(callbacks.onDragEnd).toBeDefined();
      return callbacks;
    });

    // RU-003-Q1: 드래그 데이터에 item 객체 포함 (타입 가드 요구사항)
    const mockItem = {
      id: 'keycard-alpha',
      name: '키카드 A',
      icon: '🔑',
      quantity: 1,
    };

    // 성공 시나리오 시뮬레이션
    act(() => {
      dndCallbacks.onDragEnd({
        active: {
          id: 'keycard-alpha',
          data: {
            current: {
              type: 'inventory-item',
              item_id: 'keycard-alpha',
              item: mockItem,
            },
          },
        },
        over: {
          id: 'hotspot-demo-terminal',
          data: {
            current: {
              type: 'hotspot',
              object_id: 'demo-terminal',
              label: '터미널',
              box_2d: { ymin: 300, xmin: 100, ymax: 600, xmax: 400 },
            },
          },
        },
      });
    });

    // startTurnStream 호출 확인
    await waitFor(() => {
      expect(turnStream.startTurnStream).toHaveBeenCalled();
    });
    const [input] = vi.mocked(turnStream.startTurnStream).mock.calls[0];

    expect(input.text).toBe('Drop: 키카드 A on 터미널');
    expect(input.drop).toEqual({
      item_id: 'keycard-alpha',
      target_object_id: 'demo-terminal',
      target_box_2d: { ymin: 300, xmin: 100, ymax: 600, xmax: 400 },
    });

    // U-070: 드롭 즉시 NarrativeFeed에 액션 로그가 표시되어야 함
    const actionLog = await screen.findByText(/Action: Use 키카드 A on 터미널/);
    expect(actionLog).toBeInTheDocument();
    expect(actionLog.closest('.narrative-entry')).toHaveClass('action-log-entry');
  });

  it('should show failure feedback when handleDragEnd is called with an invalid target', async () => {
    render(<App />);

    // 1. 프로필 선택 (Playing 페이즈 진입)
    const narratorProfile = screen.getByLabelText('profile.narrator.name');
    fireEvent.click(narratorProfile);

    // U-060: 프로필 선택 후 DndContext 마운트를 기다림
    // DndContext가 렌더링된 후 콜백 가져오기
    const dndCallbacks = await waitFor(() => {
      const callbacks = (global as unknown as Record<string, MockDndCallbacks>).dndCallbacks;
      expect(callbacks).toBeDefined();
      expect(callbacks.onDragEnd).toBeDefined();
      return callbacks;
    });

    // RU-003-Q1: 드래그 데이터에 item 객체 포함 (타입 가드 요구사항)
    const mockItem = {
      id: 'keycard-alpha',
      name: '키카드 A',
      icon: '🔑',
      quantity: 1,
    };

    // 실패 시나리오 시뮬레이션 (over가 null)
    act(() => {
      dndCallbacks.onDragEnd({
        active: {
          id: 'keycard-alpha',
          data: {
            current: {
              type: 'inventory-item',
              item_id: 'keycard-alpha',
              item: mockItem,
            },
          },
        },
        over: null,
      });
    });

    // turn 실행은 발생하지 않아야 함
    expect(turnStream.startTurnStream).not.toHaveBeenCalled();

    // 내러티브 피드에 실패 메시지가 나타나야 함
    const failureMessage = await screen.findByText(/Invalid: 키카드 A/);
    expect(failureMessage).toBeInTheDocument();
  });
});
