import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentConsole } from './AgentConsole';
import type { ValidationBadge, TurnOutput } from '../schemas/turn';
import type { PhaseInfo, AgentError } from '../stores/agentStore';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, _options?: { ok?: number; total?: number; count?: number }) => {
      // Return key for assertion, or format if needed
      return key;
    },
  }),
}));

// Mock store state
interface MockState {
  phases: PhaseInfo[];
  badges: ValidationBadge[];
  repairCount: number;
  error: AgentError | null;
  isStreaming: boolean;
  finalOutput: Partial<TurnOutput> | null;
}

const mockState: MockState = {
  phases: [],
  badges: [],
  repairCount: 0,
  error: null,
  isStreaming: false,
  finalOutput: {
    agent_console: {
      model_label: 'FAST',
      repair_count: 0,
    },
  } as Partial<TurnOutput>,
};

// Mock dependencies
vi.mock('../stores/agentStore', () => ({
  useAgentStore: (selector: (state: MockState) => unknown) => selector(mockState),
  selectIsStreaming: (state: MockState) => state.isStreaming,
  selectPhases: (state: MockState) => state.phases,
  selectBadges: (state: MockState) => state.badges,
  selectRepairCount: (state: MockState) => state.repairCount,
  selectError: (state: MockState) => state.error,
  selectModelLabel: (state: MockState) => state.finalOutput?.agent_console?.model_label ?? 'FAST',
}));

describe('AgentConsole (U-123)', () => {
  beforeEach(() => {
    // Reset mock state
    mockState.phases = [];
    mockState.badges = [];
    mockState.repairCount = 0;
    mockState.error = null;
    mockState.isStreaming = false;
    mockState.finalOutput = {
      agent_console: {
        model_label: 'FAST',
        repair_count: 0,
      },
    } as Partial<TurnOutput>;
  });

  it('should always show queue, badges panel, and divider', () => {
    render(<AgentConsole />);

    // Queue should always be visible (U-123)
    expect(screen.getByText('agent.console.queue')).toBeInTheDocument();
    expect(screen.getByText('agent.console.queue_idle')).toBeInTheDocument();

    // Badges panel should always be visible (U-123)
    expect(screen.getByText('agent.console.badges')).toBeInTheDocument();
    expect(screen.getByText('agent.console.badges_empty')).toBeInTheDocument();

    // Divider should be present
    const divider = document.querySelector('.agent-console-divider');
    expect(divider).toBeInTheDocument();

    // Toggle button should NOT be present
    expect(
      screen.queryByRole('button', { name: /agent\.console\.badges_toggle/i }),
    ).not.toBeInTheDocument();
  });

  it('should show all badges details directly when badges exist', () => {
    mockState.badges = ['schema_ok', 'economy_ok'];

    render(<AgentConsole />);

    // Badges label
    expect(screen.getByText('agent.console.badges')).toBeInTheDocument();

    // Individual badge items should be visible
    expect(screen.getByText('agent.console.badge.schema')).toBeInTheDocument();
    expect(screen.getByText('agent.console.badge.economy')).toBeInTheDocument();

    // Status text (OK)
    const okStatuses = screen.getAllByText('agent.console.badge.ok');
    expect(okStatuses).toHaveLength(2);

    // Empty message should NOT be visible
    expect(screen.queryByText('agent.console.badges_empty')).not.toBeInTheDocument();
  });

  it('should show fail badge status correctly', () => {
    mockState.badges = ['schema_fail', 'economy_ok'];

    render(<AgentConsole />);

    // Schema badge should show fail
    expect(screen.getByText('agent.console.badge.schema')).toBeInTheDocument();
    expect(screen.getByText('agent.console.badge.fail')).toBeInTheDocument();

    // Economy badge should show OK
    expect(screen.getByText('agent.console.badge.economy')).toBeInTheDocument();
    expect(screen.getByText('agent.console.badge.ok')).toBeInTheDocument();
  });

  it('should show streaming queue items when streaming', () => {
    mockState.isStreaming = true;
    mockState.phases = [
      { name: 'parse', status: 'completed' },
      { name: 'validate', status: 'in_progress' },
    ];

    render(<AgentConsole />);

    // Queue idle text should NOT be visible
    expect(screen.queryByText('agent.console.queue_idle')).not.toBeInTheDocument();

    // Phase items should be visible
    expect(screen.getByText('agent.console.phase.parse')).toBeInTheDocument();
    expect(screen.getByText('agent.console.phase.validate')).toBeInTheDocument();
  });
});
