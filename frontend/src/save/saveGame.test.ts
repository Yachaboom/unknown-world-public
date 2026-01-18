import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SaveGameSchema,
  createSaveGame,
  saveSaveGame,
  loadSaveGame,
  clearSaveGame,
  hasSaveGame,
  SAVEGAME_STORAGE_KEY,
  SAVEGAME_VERSION,
  type SaveGameInput,
} from './saveGame';

describe('saveGame utility (U-015[Mvp])', () => {
  beforeEach(() => {
    // localStorage 초기화
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockInput: SaveGameInput = {
    language: 'ko-KR',
    profileId: 'explorer',
    seed: 'test-seed',
    economy: { signal: 100, memory_shard: 5 },
    economyLedger: [],
    turnCount: 1,
    narrativeHistory: [{ turn: 1, text: '테스트 내러티브' }],
    inventory: [{ id: 'item1', name: '아이템1', quantity: 1 }],
    quests: [{ id: 'q1', label: '퀘스트1', is_completed: false }],
    activeRules: [{ id: 'r1', label: '규칙1', description: '설명1' }],
    mutationTimeline: [],
    sceneObjects: [],
  };

  it('createSaveGame은 올바른 스키마를 가진 객체를 생성해야 한다', () => {
    const saveGame = createSaveGame(mockInput);

    expect(saveGame.version).toBe(SAVEGAME_VERSION);
    expect(saveGame.language).toBe('ko-KR');
    expect(saveGame.profileId).toBe('explorer');
    expect(saveGame.economy.signal).toBe(100);
    expect(saveGame.inventory).toHaveLength(1);
    expect(saveGame.inventory[0].name).toBe('아이템1');

    // Zod 스키마 검증
    const result = SaveGameSchema.safeParse(saveGame);
    expect(result.success).toBe(true);
  });

  it('saveSaveGame은 데이터를 localStorage에 저장해야 한다', () => {
    const saveGame = createSaveGame(mockInput);
    const success = saveSaveGame(saveGame);

    expect(success).toBe(true);
    expect(localStorage.getItem(SAVEGAME_STORAGE_KEY)).not.toBeNull();

    const storedData = JSON.parse(localStorage.getItem(SAVEGAME_STORAGE_KEY)!);
    expect(storedData.profileId).toBe('explorer');
  });

  it('loadSaveGame은 저장된 데이터를 올바르게 로드해야 한다', () => {
    const saveGame = createSaveGame(mockInput);
    saveSaveGame(saveGame);

    const loaded = loadSaveGame();
    expect(loaded).not.toBeNull();
    expect(loaded?.profileId).toBe('explorer');
    expect(loaded?.version).toBe(SAVEGAME_VERSION);
  });

  it('데이터가 없을 때 loadSaveGame은 null을 반환해야 한다', () => {
    const loaded = loadSaveGame();
    expect(loaded).toBeNull();
  });

  it('유효하지 않은 데이터가 저장되어 있으면 loadSaveGame은 null을 반환해야 한다', () => {
    localStorage.setItem(SAVEGAME_STORAGE_KEY, JSON.stringify({ version: 'unknown' }));

    // safeParse 실패로 인해 null 반환 예상
    const loaded = loadSaveGame();
    expect(loaded).toBeNull();
  });

  it('clearSaveGame은 저장된 데이터를 삭제해야 한다', () => {
    const saveGame = createSaveGame(mockInput);
    saveSaveGame(saveGame);
    expect(hasSaveGame()).toBe(true);

    clearSaveGame();
    expect(hasSaveGame()).toBe(false);
    expect(localStorage.getItem(SAVEGAME_STORAGE_KEY)).toBeNull();
  });

  it('hasSaveGame은 데이터 존재 여부를 정확히 반환해야 한다', () => {
    expect(hasSaveGame()).toBe(false);

    const saveGame = createSaveGame(mockInput);
    saveSaveGame(saveGame);
    expect(hasSaveGame()).toBe(true);
  });
});
