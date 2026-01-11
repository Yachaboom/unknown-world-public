import { describe, it, expect } from 'vitest';
import { SCENE_PLACEHOLDERS } from './SceneCanvas';

describe('SCENE_PLACEHOLDERS', () => {
  it('should have all required statuses', () => {
    const statuses = ['default', 'loading', 'offline', 'blocked', 'low_signal'];
    statuses.forEach((status) => {
      expect(SCENE_PLACEHOLDERS).toHaveProperty(status);
    });
  });

  it('should have correct image paths', () => {
    expect(SCENE_PLACEHOLDERS.default.imagePath).toBe(
      '/ui/placeholders/scene-placeholder-default.png',
    );
    expect(SCENE_PLACEHOLDERS.loading.imagePath).toBe('/ui/placeholders/scene-loading.webp');
    expect(SCENE_PLACEHOLDERS.offline.imagePath).toBe('/ui/placeholders/scene-offline.webp');
    expect(SCENE_PLACEHOLDERS.blocked.imagePath).toBe('/ui/placeholders/scene-blocked.webp');
    expect(SCENE_PLACEHOLDERS.low_signal.imagePath).toBe('/ui/placeholders/scene-low-signal.webp');
  });

  it('should have correct i18n label keys', () => {
    expect(SCENE_PLACEHOLDERS.default.labelKey).toBe('scene.status.default');
    expect(SCENE_PLACEHOLDERS.loading.labelKey).toBe('scene.status.loading');
    expect(SCENE_PLACEHOLDERS.offline.labelKey).toBe('scene.status.offline');
    expect(SCENE_PLACEHOLDERS.blocked.labelKey).toBe('scene.status.blocked');
    expect(SCENE_PLACEHOLDERS.low_signal.labelKey).toBe('scene.status.low_signal');
  });
});
