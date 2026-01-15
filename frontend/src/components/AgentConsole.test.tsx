import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentConsole } from './AgentConsole';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock dependencies
type MockSelector<T> = (state: unknown) => T;

vi.mock('../stores/agentStore', () => ({
  useAgentStore: <T,>(selector: MockSelector<T>) =>
    selector({
      phases: [],
      badges: [],
      repairCount: 0,
      error: null,
      isStreaming: false,
    }),
  selectIsStreaming: (state: { isStreaming: boolean }) => state.isStreaming,
  selectPhases: (state: { phases: unknown[] }) => state.phases,
  selectBadges: (state: { badges: unknown[] }) => state.badges,
  selectRepairCount: (state: { repairCount: number }) => state.repairCount,
  selectError: (state: { error: unknown }) => state.error,
}));

describe('AgentConsole (U-037)', () => {
  it('should render with "critical" importance attribute', () => {
    const { container } = render(<AgentConsole />);

    // The root element of AgentConsole should have data-ui-importance="critical"
    const consoleElement = container.firstChild as HTMLElement;

    expect(consoleElement).toHaveAttribute('data-ui-importance', 'critical');
  });

  it('should render streaming status', () => {
    render(<AgentConsole />);
    // Verify that the correct i18n key is used
    expect(screen.getByText('agent.console.status.idle')).toBeInTheDocument();
  });
});
