import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentConsole } from './AgentConsole';
import type { ValidationBadge, TurnOutput } from '../schemas/turn';
import type { PhaseInfo, AgentError } from '../stores/agentStore';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ok?: number; total?: number; count?: number }) => {
      if (options?.ok !== undefined && options?.total !== undefined) {
        return `${key}:${options.ok}/${options.total}`;
      }
      if (options?.count !== undefined) {
        return `${key}:${options.count}`;
      }
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

describe('AgentConsole (U-114)', () => {
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

  it('should always show queue and have badges collapsed by default', () => {
    render(<AgentConsole />);

    // U-114: Queue should always be visible
    expect(screen.getByText('agent.console.queue')).toBeInTheDocument();

    // U-114: Idle state should show "대기 중..." text
    expect(screen.getByText('agent.console.queue_idle')).toBeInTheDocument();

    // U-114: Badges toggle button should be present
    const toggleButton = screen.getByRole('button', {
      name: /agent\.console\.badges_toggle/i,
    });
    expect(toggleButton).toBeInTheDocument();

    // U-114: Badges panel details should NOT be visible (collapsed)
    expect(screen.queryByText('agent.console.badges_empty')).not.toBeInTheDocument();
  });

  it('should expand badges when toggle button is clicked', () => {
    render(<AgentConsole />);

    const toggleButton = screen.getByRole('button', {
      name: /agent\.console\.badges_toggle/i,
    });

    // Click to expand badges
    fireEvent.click(toggleButton);

    // Badges empty state should now be visible
    expect(screen.getByText('agent.console.badges_empty')).toBeInTheDocument();

    // Click to collapse badges
    fireEvent.click(toggleButton);

    // Badges empty state should be hidden
    expect(screen.queryByText('agent.console.badges_empty')).not.toBeInTheDocument();
  });

  it('should show "N/N OK" summary when all badges are OK and collapsed', () => {
    mockState.badges = ['schema_ok', 'economy_ok', 'safety_ok', 'consistency_ok'];

    render(<AgentConsole />);

    // Q2: Option C - show "4/4 OK" summary
    expect(screen.getByText('agent.console.badges_summary_ok:4/4')).toBeInTheDocument();
    expect(screen.queryByText('⚠')).not.toBeInTheDocument();
  });

  it('should show warning icon and fail count when at least one badge fails and collapsed', () => {
    mockState.badges = ['schema_fail', 'economy_ok', 'safety_ok', 'consistency_ok'];

    render(<AgentConsole />);

    // Fail indicator should be visible
    const failIndicator = screen.getByLabelText('agent.console.badge_fail_warning:1');
    expect(failIndicator).toBeInTheDocument();
    expect(failIndicator.textContent).toContain('⚠');
    expect(failIndicator.textContent).toContain('1');

    // "N/N OK" summary should NOT be visible when there are failures
    expect(screen.queryByText(/badges_summary_ok/)).not.toBeInTheDocument();
  });

  it('should show both badges panel and summary info when expanded (summary info hidden)', () => {
    mockState.badges = ['schema_ok', 'economy_ok'];

    render(<AgentConsole />);

    const toggleButton = screen.getByRole('button', {
      name: /agent\.console\.badges_toggle/i,
    });

    // Initially collapsed, summary visible
    expect(screen.getByText('agent.console.badges_summary_ok:2/2')).toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggleButton);

    // Now badges panel is visible, summary in button should NOT be there
    expect(screen.queryByText('agent.console.badges_summary_ok:2/2')).not.toBeInTheDocument();

    // Detailed badge labels should be visible
    expect(screen.getByText('agent.console.badge.schema')).toBeInTheDocument();
    expect(screen.getByText('agent.console.badge.economy')).toBeInTheDocument();
  });
});
