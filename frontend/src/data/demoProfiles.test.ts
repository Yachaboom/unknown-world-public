import { describe, it, expect, vi } from 'vitest';
import { PROFILE_EXPLORER, createSaveGameFromProfile, findProfileById } from './demoProfiles';
import { SAVEGAME_VERSION } from '../save/saveGame';

describe('demoProfiles (U-015[Mvp])', () => {
  const mockT = vi.fn((key: string) => `translated-${key}`);

  it('findProfileById는 올바른 프로필을 반환해야 한다', () => {
    const profile = findProfileById('explorer');
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('explorer');
    expect(profile?.icon).toBe('🧭');
  });

  it('존재하지 않는 ID에 대해 findProfileById는 undefined를 반환해야 한다', () => {
    const profile = findProfileById('non-existent');
    expect(profile).toBeUndefined();
  });

  it('createSaveGameFromProfile은 프로필 초기 상태를 SaveGame으로 올바르게 변환해야 한다', () => {
    const saveGame = createSaveGameFromProfile(PROFILE_EXPLORER, 'ko-KR', mockT);

    // 기본 메타데이터
    expect(saveGame.version).toBe(SAVEGAME_VERSION);
    expect(saveGame.profileId).toBe('explorer');
    expect(saveGame.language).toBe('ko-KR');
    expect(saveGame.seed).toContain('demo-explorer-');

    // 경제 상태
    expect(saveGame.economy.signal).toBe(PROFILE_EXPLORER.initialState.economy.signal);
    expect(saveGame.economy.memory_shard).toBe(PROFILE_EXPLORER.initialState.economy.memory_shard);

    // 인벤토리 (번역 적용 확인)
    expect(saveGame.inventory).toHaveLength(PROFILE_EXPLORER.initialState.inventoryDefs.length);
    expect(saveGame.inventory[0].name).toBe(
      `translated-${PROFILE_EXPLORER.initialState.inventoryDefs[0].nameKey}`,
    );

    // 퀘스트
    expect(saveGame.quests).toHaveLength(PROFILE_EXPLORER.initialState.questDefs.length);
    expect(saveGame.quests[0].label).toBe(
      `translated-${PROFILE_EXPLORER.initialState.questDefs[0].labelKey}`,
    );

    // 규칙 및 타임라인
    expect(saveGame.activeRules).toHaveLength(PROFILE_EXPLORER.initialState.ruleDefs.length);
    expect(saveGame.mutationTimeline).toHaveLength(PROFILE_EXPLORER.initialState.ruleDefs.length);
    expect(saveGame.mutationTimeline[0].type).toBe('added');

    // 내러티브 (환영 메시지)
    expect(saveGame.narrativeHistory).toHaveLength(1);
    expect(saveGame.narrativeHistory[0].turn).toBe(0);
    expect(saveGame.narrativeHistory[0].text).toBe(
      `translated-${PROFILE_EXPLORER.initialState.welcomeMessageKey}`,
    );

    // Scene Objects
    expect(saveGame.sceneObjects).toHaveLength(
      PROFILE_EXPLORER.initialState.sceneObjectDefs.length,
    );
    expect(saveGame.sceneObjects[0].box_2d).toEqual(
      PROFILE_EXPLORER.initialState.sceneObjectDefs[0].box_2d,
    );
  });
});
