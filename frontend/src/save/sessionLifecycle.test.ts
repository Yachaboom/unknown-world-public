import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  bootstrapSession,
  startSessionFromProfile,
  continueSession,
  resetToCurrentProfile,
  clearSessionAndReturnToSelect,
  saveCurrentSession,
  getInitialProfileId,
} from './sessionLifecycle';
import { useWorldStore } from '../stores/worldStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useEconomyStore } from '../stores/economyStore';
import { SAVEGAME_STORAGE_KEY, CURRENT_PROFILE_KEY, SAVEGAME_VERSION } from './constants';
import { PROFILE_EXPLORER } from '../data/demoProfiles';
import * as i18nModule from '../i18n';

// i18n 모듈 mock
vi.mock('../i18n', async () => {
  const actual = await vi.importActual('../i18n');
  return {
    ...actual,
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    getResolvedLanguage: vi.fn().mockReturnValue('ko-KR'),
  };
});

describe('sessionLifecycle (RU-004[Mvp])', () => {
  const mockT = (key: string) => `translated-${key}`;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Store 초기화
    useWorldStore.getState().reset();
    useInventoryStore.getState().reset();
    useEconomyStore.getState().reset();
  });

  describe('bootstrapSession', () => {
    it('세이브 데이터가 없으면 profile_select phase를 반환해야 한다', () => {
      const result = bootstrapSession();
      expect(result.phase).toBe('profile_select');
      if (result.phase === 'profile_select') {
        expect(result.savedGameAvailable).toBe(false);
      }
    });

    it('유효한 세이브 데이터가 있으면 playing phase를 반환해야 한다', () => {
      // 유효한 세이브 생성 및 저장
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

      const result = bootstrapSession();
      expect(result.phase).toBe('playing');
      if (result.phase === 'playing') {
        expect(result.profileId).toBe('explorer');
      }
    });
  });

  describe('startSessionFromProfile', () => {
    it('프로필 기반으로 세션을 시작하고 store와 localStorage를 업데이트해야 한다', () => {
      const result = startSessionFromProfile({
        profile: PROFILE_EXPLORER,
        t: mockT,
      });

      expect(result.success).toBe(true);
      expect(result.profileId).toBe(PROFILE_EXPLORER.id);

      // Store 상태 확인
      const worldState = useWorldStore.getState();
      expect(worldState.economy.signal).toBe(PROFILE_EXPLORER.initialState.economy.signal);
      expect(worldState.turnCount).toBe(0);
      expect(worldState.narrativeEntries).toHaveLength(1);

      const inventoryState = useInventoryStore.getState();
      expect(inventoryState.items).toHaveLength(PROFILE_EXPLORER.initialState.inventoryDefs.length);

      // localStorage 확인
      expect(localStorage.getItem(CURRENT_PROFILE_KEY)).toBe(PROFILE_EXPLORER.id);
      expect(localStorage.getItem(SAVEGAME_STORAGE_KEY)).not.toBeNull();
    });
  });

  describe('continueSession', () => {
    it('저장된 데이터를 로드하고 store를 복원해야 한다', async () => {
      const saveGame = {
        version: SAVEGAME_VERSION,
        language: 'en-US',
        profileId: 'explorer',
        savedAt: new Date().toISOString(),
        economy: { signal: 123, memory_shard: 45 },
        economyLedger: [],
        turnCount: 5,
        narrativeHistory: [{ turn: 1, text: 'old message' }],
        inventory: [{ id: 'item1', name: 'Item 1', quantity: 2 }],
        quests: [],
        activeRules: [],
        mutationTimeline: [],
        sceneObjects: [],
      };
      localStorage.setItem(SAVEGAME_STORAGE_KEY, JSON.stringify(saveGame));

      const result = await continueSession();

      expect(result?.success).toBe(true);
      expect(result?.profileId).toBe('explorer');

      // 언어 변경 호출 확인
      expect(i18nModule.changeLanguage).toHaveBeenCalledWith('en-US');

      // Store 상태 확인
      const worldState = useWorldStore.getState();
      expect(worldState.economy.signal).toBe(123);
      expect(worldState.turnCount).toBe(5);
      expect(worldState.narrativeEntries).toHaveLength(1);

      const inventoryState = useInventoryStore.getState();
      expect(inventoryState.items).toHaveLength(1);
      expect(inventoryState.items[0].id).toBe('item1');
    });

    it('데이터가 없으면 null을 반환하고 클린업해야 한다', async () => {
      localStorage.setItem(CURRENT_PROFILE_KEY, 'some-profile');

      const result = await continueSession();

      expect(result).toBeNull();
      expect(localStorage.getItem(SAVEGAME_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(CURRENT_PROFILE_KEY)).toBeNull();
    });
  });

  describe('resetToCurrentProfile', () => {
    it('현재 프로필로 세션을 리셋해야 한다', () => {
      // 먼저 세션 시작
      startSessionFromProfile({
        profile: PROFILE_EXPLORER,
        t: mockT,
      });

      // 상태 변경 시뮬레이션
      useWorldStore.setState({ turnCount: 10, economy: { signal: 0, memory_shard: 0 } });

      const result = resetToCurrentProfile({
        t: mockT,
        currentProfileId: PROFILE_EXPLORER.id,
      });

      expect(result.success).toBe(true);
      expect(result.profileId).toBe(PROFILE_EXPLORER.id);

      // 초기 상태로 복원되었는지 확인
      const worldState = useWorldStore.getState();
      expect(worldState.turnCount).toBe(0);
      expect(worldState.economy.signal).toBe(PROFILE_EXPLORER.initialState.economy.signal);
    });
  });

  describe('clearSessionAndReturnToSelect', () => {
    it('모든 데이터를 삭제하고 store를 초기화해야 한다', () => {
      // 데이터 채우기
      startSessionFromProfile({
        profile: PROFILE_EXPLORER,
        t: mockT,
      });

      clearSessionAndReturnToSelect();

      expect(localStorage.getItem(SAVEGAME_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(CURRENT_PROFILE_KEY)).toBeNull();

      const worldState = useWorldStore.getState();
      expect(worldState.narrativeEntries).toHaveLength(0);
    });
  });

  describe('saveCurrentSession', () => {
    it('현재 상태를 localStorage에 저장해야 한다', () => {
      startSessionFromProfile({
        profile: PROFILE_EXPLORER,
        t: mockT,
      });

      // 상태 변경
      useWorldStore.setState({ turnCount: 1 });

      const success = saveCurrentSession(PROFILE_EXPLORER.id);
      expect(success).toBe(true);

      const saved = JSON.parse(localStorage.getItem(SAVEGAME_STORAGE_KEY)!);
      expect(saved.turnCount).toBe(1);
    });
  });

  describe('getInitialProfileId', () => {
    it('세이브 데이터가 있으면 그 안의 profileId를 우선해야 한다', () => {
      localStorage.setItem(
        SAVEGAME_STORAGE_KEY,
        JSON.stringify({
          version: SAVEGAME_VERSION,
          language: 'ko-KR',
          profileId: 'saved-profile',
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
        }),
      );
      localStorage.setItem(CURRENT_PROFILE_KEY, 'fallback-profile');

      expect(getInitialProfileId()).toBe('saved-profile');
    });

    it('세이브 데이터가 없으면 CURRENT_PROFILE_KEY를 사용해야 한다', () => {
      localStorage.setItem(CURRENT_PROFILE_KEY, 'fallback-profile');
      expect(getInitialProfileId()).toBe('fallback-profile');
    });
  });
});
