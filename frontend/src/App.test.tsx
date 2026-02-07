import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as turnStream from './api/turnStream';
import { useInventoryStore } from './stores/inventoryStore';

// i18next 모킹 (RU-003-Q5: 데모 i18n 키 지원)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      // 데모 아이템 이름
      if (key === 'demo.items.keycard-alpha.name') return '키카드 A';
      if (key === 'demo.items.medkit.name') return '응급 키트';
      if (key === 'demo.items.flashlight.name') return '손전등';
      if (key === 'demo.items.data-chip.name') return '데이터칩';
      // 데모 씬 오브젝트 (프로필 기반)
      if (key === 'profile.tech.scene.terminal') return '터미널';
      if (key === 'profile.tech.scene.terminal_hint') return '활성화된 터미널이다';
      // 구버전/공통 씬 오브젝트
      if (key === 'demo.scene.terminal.label') return '터미널';
      if (key === 'demo.scene.terminal.hint') return '활성화된 터미널이다';
      if (key === 'demo.scene.door.label') return '문';
      if (key === 'demo.scene.door.hint') return '잠겨있는 것 같다';
      // 액션 템플릿
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
    localStorage.clear();
  });

  it('should trigger startTurnStream when a hotspot is clicked', async () => {
    render(<App />);

    // 1. 프로필 선택 (Playing 페이즈 진입) - 테크 프로필 선택
    const techProfile = screen.getByLabelText('profile.tech.name');
    fireEvent.click(techProfile);

    // U-060: 프로필 선택 후 상태 전환이 React 상태 업데이트이므로 waitFor 사용
    // 2. 이제 메인 게임 UI가 나타남 - 테크 프로필의 '터미널' 핫스팟 찾기
    const terminalHotspot = await waitFor(() => {
      const hotspot = screen.getByLabelText('터미널');
      expect(hotspot).toBeInTheDocument();
      return hotspot;
    });

    // 클릭 시뮬레이션
    fireEvent.click(terminalHotspot);

    // startTurnStream 호출 확인
    await waitFor(() => {
      expect(turnStream.startTurnStream).toHaveBeenCalled();
    });

    const [input] = vi.mocked(turnStream.startTurnStream).mock.calls[0];

    // TurnInput 검증
    expect(input.text).toBe('Click: 터미널');
    expect(input.click).toEqual({
      object_id: 'main-terminal',
      box_2d: { ymin: 200, xmin: 300, ymax: 600, xmax: 700 },
    });
  });
});

describe('App Layout - Inventory Count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useInventoryStore.getState().reset();
  });

  it('updates inventory panel title based on items', async () => {
    render(<App />);

    // 1. 프로필 선택
    const techProfile = screen.getByLabelText('profile.tech.name');
    fireEvent.click(techProfile);

    // 2. 초기 제목 확인 (Tech 프로필은 기본 아이템이 있으므로 바로 inventory.count가 보임)
    await waitFor(() => {
      expect(screen.getByText(/inventory.count/)).toBeInTheDocument();
    });

    // 3. 아이템 모두 제거
    useInventoryStore.getState().reset();

    // 4. 제목이 기본값으로 돌아왔는지 확인
    await waitFor(() => {
      expect(screen.getByText('panel.inventory.title')).toBeInTheDocument();
    });

    // 5. 다시 아이템 추가
    useInventoryStore.getState().addItems([
      {
        id: 'test-item',
        name: 'Test Item',
        quantity: 1,
      },
    ]);

    // 6. 제목 업데이트 다시 확인
    await waitFor(() => {
      expect(screen.getByText(/inventory.count/)).toBeInTheDocument();
    });
  });
});
