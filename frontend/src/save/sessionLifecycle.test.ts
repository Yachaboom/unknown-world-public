import { describe, it, expect, beforeEach } from 'vitest';
import { startSessionFromProfile, resetToCurrentProfile } from './sessionLifecycle';
import { useEconomyStore } from '../stores/economyStore';
import { useWorldStore } from '../stores/worldStore';
import { findProfileById } from '../data/demoProfiles';

describe('sessionLifecycle (U-099)', () => {
  beforeEach(() => {
    useEconomyStore.getState().reset();
    useWorldStore.getState().reset();
  });

  it('새 세션 시작 시 이전 거래 장부가 초기화되어야 한다', () => {
    const { addLedgerEntry } = useEconomyStore.getState();

    // 1. 이전 세션의 데이터가 있다고 가정
    addLedgerEntry({
      turnId: 10,
      reason: 'Old session entry',
      cost: { signal: 10, memory_shard: 0 },
      balanceAfter: { signal: 90, memory_shard: 5 },
    });

    expect(useEconomyStore.getState().ledger.length).toBe(1);

    // 2. 새 세션 시작 (startSessionFromProfile 호출)
    const profile = findProfileById('narrator')!;
    const t = (key: string) => key;

    startSessionFromProfile({ profile, t });

    // 3. 거래 장부가 비워졌는지 확인
    expect(useEconomyStore.getState().ledger.length).toBe(0);
  });

  it('리셋 시 이전 거래 장부가 초기화되어야 한다', () => {
    const { addLedgerEntry } = useEconomyStore.getState();

    // 1. 데이터 추가
    addLedgerEntry({
      turnId: 1,
      reason: 'Current session entry',
      cost: { signal: 10, memory_shard: 0 },
      balanceAfter: { signal: 90, memory_shard: 5 },
    });

    expect(useEconomyStore.getState().ledger.length).toBe(1);

    // 2. 리셋 실행
    const t = (key: string) => key;
    resetToCurrentProfile({ t, currentProfileId: 'narrator' });

    // 3. 거래 장부가 비워졌는지 확인
    expect(useEconomyStore.getState().ledger.length).toBe(0);
  });

  it('U-124: 세션 시작 시 프로필의 초기 이미지가 worldStore에 적용되어야 한다', () => {
    const profile = findProfileById('narrator')!;
    const t = (key: string) => key;

    // 초기 이미지가 있는지 확인
    expect(profile.initialState.initialSceneImageUrl).toBeDefined();

    startSessionFromProfile({ profile, t });

    const sceneState = useWorldStore.getState().sceneState;
    expect(sceneState.status).toBe('scene');
    expect(sceneState.imageUrl).toBe(profile.initialState.initialSceneImageUrl);
    expect(sceneState.processingPhase).toBe('idle');
  });
});
