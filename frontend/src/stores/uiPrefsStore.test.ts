import { describe, it, expect, beforeEach } from 'vitest';
import { useUIPrefsStore, DEFAULT_UI_SCALE, migrateUIPrefs } from './uiPrefsStore';

// Mock localStorage for non-browser environment
// Note: With jsdom environment configured in vite.config.ts, this might not be strictly necessary
// if we trust jsdom's localStorage, but keeping it explicit is fine.
// However, since we are moving to direct function testing for migration, we rely less on persist middleware internals.

describe('uiPrefsStore', () => {
  beforeEach(() => {
    useUIPrefsStore.getState().resetPrefs();
    localStorage.clear();
  });

  it('should have default initial state', () => {
    const state = useUIPrefsStore.getState();
    expect(state.uiScale).toBe(DEFAULT_UI_SCALE);
  });

  it('should increase ui scale within limit', () => {
    const { increaseUIScale } = useUIPrefsStore.getState();

    // 1.0 -> 1.1
    increaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(1.1);

    // 1.1 -> 1.2
    increaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(1.2);

    // 1.2 -> 1.2 (Max)
    increaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(1.2);
  });

  it('should decrease ui scale within limit', () => {
    const { decreaseUIScale, setUIScale } = useUIPrefsStore.getState();

    // Start at max
    setUIScale(1.2);

    // 1.2 -> 1.1
    decreaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(1.1);

    // ... -> 0.9 (Min)
    setUIScale(0.9);
    decreaseUIScale();
    expect(useUIPrefsStore.getState().uiScale).toBe(0.9);
  });

  it('should set valid ui scale', () => {
    const { setUIScale } = useUIPrefsStore.getState();

    setUIScale(1.1);
    expect(useUIPrefsStore.getState().uiScale).toBe(1.1);
  });

  it('should ignore invalid ui scale', () => {
    const { setUIScale } = useUIPrefsStore.getState();

    // @ts-expect-error Testing invalid input
    setUIScale(2.0);
    expect(useUIPrefsStore.getState().uiScale).toBe(DEFAULT_UI_SCALE);
  });

  describe('migration (U-037)', () => {
    it('should remove readableMode from legacy storage', () => {
      // Legacy state simulation
      const legacyState = {
        uiScale: 1.1,
        readableMode: true,
      };

      // Call migrate function directly
      const migratedState = migrateUIPrefs(legacyState, 0);

      // Verify
      expect(migratedState).toHaveProperty('uiScale', 1.1);
      expect(migratedState).not.toHaveProperty('readableMode');
    });

    it('should handle undefined version (very old legacy)', () => {
      const legacyState = {
        uiScale: 0.9,
        readableMode: false,
      };

      // Call migrate function directly with undefined version
      const migratedState = migrateUIPrefs(legacyState, undefined);

      expect(migratedState).toHaveProperty('uiScale', 0.9);
      expect(migratedState).not.toHaveProperty('readableMode');
    });

    it('should pass through already migrated state', () => {
      const modernState = {
        uiScale: 1.0,
      };

      const migratedState = migrateUIPrefs(modernState, 1);
      expect(migratedState).toEqual(modernState);
    });
  });
});
