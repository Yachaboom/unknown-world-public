import { describe, it, expect } from 'vitest';
import i18next from './i18n';

describe('i18n Integration Scenarios (U-039)', () => {
  it('Scenario D: should have correct i18next options', () => {
    expect(i18next.options.supportedLngs).toContain('ko-KR');
    expect(i18next.options.supportedLngs).toContain('en-US');
    expect(i18next.options.lng).toBe('ko-KR');
    expect(i18next.options.fallbackLng).toContain('en-US');
  });

  it('Scenario A: should translate to Korean by default', () => {
    // Economy labels
    expect(i18next.t('economy.signal')).toBe('Signal');
    expect(i18next.t('economy.shard')).toBe('Shard');

    // Panel titles
    expect(i18next.t('panel.inventory.title')).toBe('Inventory');
    expect(i18next.t('panel.quest.title')).toBe('Quest');

    // Agent Console
    expect(i18next.t('agent.console.queue')).toBe('대기열');
    expect(i18next.t('agent.console.status.idle')).toBe('대기 중');

    // Connection
    expect(i18next.t('connection.online')).toBe('온라인');

    // UI
    expect(i18next.t('ui.command_placeholder')).toBe('명령을 입력하세요...');
    expect(i18next.t('ui.execute')).toBe('실행');
  });

  it('Scenario B: should switch to English and back to Korean', async () => {
    // Switch to English
    await i18next.changeLanguage('en-US');
    expect(i18next.resolvedLanguage).toBe('en-US');

    // Check English translations
    expect(i18next.t('agent.console.queue')).toBe('Queue');
    expect(i18next.t('agent.console.status.idle')).toBe('IDLE');
    expect(i18next.t('connection.online')).toBe('ONLINE');
    expect(i18next.t('ui.command_placeholder')).toBe('Enter command...');
    expect(i18next.t('ui.execute')).toBe('EXECUTE');

    // Switch back to Korean
    await i18next.changeLanguage('ko-KR');
    expect(i18next.resolvedLanguage).toBe('ko-KR');
    expect(i18next.t('agent.console.queue')).toBe('대기열');
    expect(i18next.t('connection.online')).toBe('온라인');
  });
});
