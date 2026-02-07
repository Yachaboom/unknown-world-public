import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
      modelLabel: 'FAST',
    }),
  selectIsStreaming: (state: { isStreaming: boolean }) => state.isStreaming,
  selectPhases: (state: { phases: unknown[] }) => state.phases,
  selectBadges: (state: { badges: unknown[] }) => state.badges,
  selectRepairCount: (state: { repairCount: number }) => state.repairCount,
  selectError: (state: { error: unknown }) => state.error,
  selectModelLabel: (state: { modelLabel: string }) => state.modelLabel,
}));

describe('AgentConsole (U-082)', () => {
  it('should start in collapsed state by default', () => {
    render(<AgentConsole />);

    // Badges panel (always visible) should be present
    expect(screen.getByText('agent.console.badges')).toBeInTheDocument();

    // Toggle button should show expand text
    expect(screen.getByText('agent.console.expand')).toBeInTheDocument();

    // Phase queue (expanded only) should NOT be present
    expect(screen.queryByText('agent.console.queue')).not.toBeInTheDocument();
  });

  it('should expand and show details when toggle button is clicked', () => {
    render(<AgentConsole />);

    const toggleButton = screen.getByRole('button', { name: /agent\.console\.expand/i });

    // Click to expand
    fireEvent.click(toggleButton);

    // Now phase queue should be present
    expect(screen.getByText('agent.console.queue')).toBeInTheDocument();
    // Toggle button should show collapse text
    expect(screen.getByText('agent.console.collapse')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);

    // Phase queue should be gone again
    expect(screen.queryByText('agent.console.queue')).not.toBeInTheDocument();
  });
});
