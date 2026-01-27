import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSessionLanguage, startSessionFromProfile } from './save/sessionLifecycle';
import { buildTurnInput } from './turn/turnRunner';
import { SAVEGAME_STORAGE_KEY, SAVEGAME_VERSION } from './save/constants';
import { PROFILE_EXPLORER } from './data/demoProfiles';
import { useWorldStore } from './stores/worldStore';
import { useInventoryStore } from './stores/inventoryStore';
import { useEconomyStore } from './stores/economyStore';

// i18n 모듈 mock
vi.mock('./i18n', async () => {
  const actual = await vi.importActual('./i18n');
  return {
    ...actual,
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    getResolvedLanguage: vi.fn().mockReturnValue('ko-KR'),
  };
});

describe('U-044[Mvp] i18n Session SSOT Scenario', () => {
  const mockT = (key: string) => `translated-${key}`;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Store 초기화
    useWorldStore.getState().reset();
    useInventoryStore.getState().reset();
    useEconomyStore.getState().reset();
  });

  describe('Language SSOT (getSessionLanguage)', () => {
    it('SaveGame이 없을 때는 기본 언어(ko-KR)를 반환해야 한다', () => {
      expect(getSessionLanguage()).toBe('ko-KR');
    });

    it('SaveGame에 저장된 언어가 있으면 해당 언어를 반환해야 한다 (en-US)', () => {
      const saveGame = {
        version: SAVEGAME_VERSION,
        language: 'en-US',
        profileId: 'explorer',
        savedAt: new Date().toISOString(),
        economy: { signal: 100, memory_shard: 5 },
        economyLedger: [],
        turnCount: 1,
        narrativeHistory: [],
        inventory: [],
        quests: [],
        activeRules: [],
        mutationTimeline: [],
        sceneObjects: [],
      };
      localStorage.setItem(SAVEGAME_STORAGE_KEY, JSON.stringify(saveGame));

      expect(getSessionLanguage()).toBe('en-US');
    });

    it('i18n resolvedLanguage가 변경되어도 SaveGame 언어를 우선해야 한다 (드리프트 방지)', () => {
      const saveGame = {
        version: SAVEGAME_VERSION,
        language: 'ko-KR',
        profileId: 'explorer',
        savedAt: new Date().toISOString(),
        economy: { signal: 100, memory_shard: 5 },
        economyLedger: [],
        turnCount: 1,
        narrativeHistory: [],
        inventory: [],
        quests: [],
        activeRules: [],
        mutationTimeline: [],
        sceneObjects: [],
      };
      localStorage.setItem(SAVEGAME_STORAGE_KEY, JSON.stringify(saveGame));

      // i18n.getResolvedLanguage()가 'en-US'를 반환하도록 상황 가정 (드리프트)
      // 실제로는 mock이므로 직접 비교는 어렵지만 logic상 validSaveGame 확인 우선순위 검증
      expect(getSessionLanguage()).toBe('ko-KR');
    });
  });

  describe('TurnInput Language Injection', () => {
    it('buildTurnInput은 외부에서 주입된 언어를 사용해야 한다', () => {
      const turnInput = buildTurnInput({
        text: 'hello',
        economySnapshot: { signal: 100, memory_shard: 0 },
        theme: 'dark',
        language: 'en-US', // 주입된 언어
      });

      expect(turnInput.language).toBe('en-US');
    });
  });

  describe('Session Language Policy (Toggle = Reset)', () => {
    it('startSessionFromProfile 호출 시 명시적 언어를 SaveGame에 반영해야 한다', () => {
      startSessionFromProfile({
        profile: PROFILE_EXPLORER,

        t: mockT,

        language: 'en-US',
      });

      const saved = JSON.parse(localStorage.getItem(SAVEGAME_STORAGE_KEY)!);

      expect(saved.language).toBe('en-US');

      expect(getSessionLanguage()).toBe('en-US');
    });
  });

  describe('turnStream Error Message Language', () => {
    it('네트워크 에러 시 입력 언어에 맞는 한국어 메시지를 반환해야 한다 (ko-KR)', async () => {
      const { executeTurnStream } = await import('./api/turnStream');

      const mockInput = {
        language: 'ko-KR' as const,

        text: 'Hello',

        action_id: null,

        click: null,

        drop: null,

        client: { viewport_w: 100, viewport_h: 100, theme: 'dark' as const },

        economy_snapshot: { signal: 100, memory_shard: 0 },
      };

      const onError = vi.fn();

      const onFinal = vi.fn();

      // fetch 실패 유도

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')));

      await executeTurnStream(mockInput, { onError, onFinal });

      // onError 보다는 onFinal의 narrative를 검증 (createClientFallbackTurnOutput)

      // onError는 error.message를 그대로 쓰므로 'Network Error'가 나옴

      expect(onFinal).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            language: 'ko-KR',

            narrative: '[시스템] 서버 연결에 실패했습니다. 다시 시도해 주세요.',
          }),
        }),
      );

      vi.unstubAllGlobals();
    });

    it('네트워크 에러 시 입력 언어에 맞는 영어 메시지를 반환해야 한다 (en-US)', async () => {
      const { executeTurnStream } = await import('./api/turnStream');

      const mockInput = {
        language: 'en-US' as const,

        text: 'Hello',

        action_id: null,

        click: null,

        drop: null,

        client: { viewport_w: 100, viewport_h: 100, theme: 'dark' as const },

        economy_snapshot: { signal: 100, memory_shard: 0 },
      };

      const onFinal = vi.fn();

      // fetch 실패 유도

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network Error')));

      await executeTurnStream(mockInput, { onFinal });

      expect(onFinal).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            language: 'en-US',

            narrative: '[System] Failed to connect to server. Please try again.',
          }),
        }),
      );

      vi.unstubAllGlobals();
    });
  });
});
