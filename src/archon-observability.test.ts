import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./db.js', () => ({
  logToHiveMind: vi.fn(),
}));

vi.mock('./state.js', () => ({
  emitChatEvent: vi.fn(),
}));

import {
  formatArchonFailureReport,
  formatArchonWorkflowSummary,
  recordArchonWorkflowEvent,
  type ArchonWorkflowEvent,
} from './archon-observability.js';
import { logToHiveMind } from './db.js';
import { emitChatEvent } from './state.js';

const mockLogToHiveMind = vi.mocked(logToHiveMind);
const mockEmitChatEvent = vi.mocked(emitChatEvent);

function baseEvent(overrides: Partial<ArchonWorkflowEvent> = {}): ArchonWorkflowEvent {
  return {
    workflowName: 'claudeclaw-bugfix',
    status: 'started',
    agentId: 'archie',
    chatId: 'chat-123',
    runId: 'run-123',
    ...overrides,
  };
}

describe('Archon observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('started summaries include Archon workflow started, workflow name, and run ID', () => {
    const summary = formatArchonWorkflowSummary(baseEvent());
    expect(summary).toContain('Archon workflow started');
    expect(summary).toContain('claudeclaw-bugfix');
    expect(summary).toContain('run run-123');
  });

  it('completed summaries include Archon workflow completed, workflow name, and branch fallback', () => {
    const summary = formatArchonWorkflowSummary(baseEvent({
      status: 'completed',
      runId: undefined,
      branch: 'archon/branch-123',
    }));
    expect(summary).toContain('Archon workflow completed');
    expect(summary).toContain('claudeclaw-bugfix');
    expect(summary).toContain('branch archon/branch-123');
  });

  it('failed summaries include Archon workflow failed, failing node, and recovery action', () => {
    const summary = formatArchonWorkflowSummary(baseEvent({
      status: 'failed',
      failingNode: 'regression-check',
      recoveryAction: 'Fix tests and rerun validation',
    }));
    expect(summary).toContain('Archon workflow failed');
    expect(summary).toContain('regression-check');
    expect(summary).toContain('Fix tests and rerun validation');
  });

  it('formatArchonFailureReport includes required failure labels', () => {
    const report = formatArchonFailureReport(baseEvent({
      status: 'failed',
      failingNode: 'validate',
      recoveryAction: 'Rerun npm test after the fix',
    }));
    expect(report).toContain('workflow:');
    expect(report).toContain('run_id:');
    expect(report).toContain('failing_node:');
    expect(report).toContain('recovery_action:');
  });

  it('formatArchonFailureReport throws when failed event lacks failingNode', () => {
    expect(() => formatArchonFailureReport(baseEvent({
      status: 'failed',
      recoveryAction: 'Rerun validation',
    }))).toThrow(/failingNode/);
  });

  it('formatArchonFailureReport throws when failed event lacks both runId and branch', () => {
    expect(() => formatArchonFailureReport(baseEvent({
      status: 'failed',
      runId: undefined,
      branch: undefined,
      failingNode: 'validate',
      recoveryAction: 'Rerun validation',
    }))).toThrow(/runId or branch/);
  });

  it('recordArchonWorkflowEvent calls logToHiveMind with action archon_workflow_started', () => {
    recordArchonWorkflowEvent(baseEvent());
    expect(mockLogToHiveMind).toHaveBeenCalledWith(
      'archie',
      'chat-123',
      'archon_workflow_started',
      expect.stringContaining('Archon workflow started'),
      expect.stringContaining('"workflowName":"claudeclaw-bugfix"'),
    );
  });

  it('recordArchonWorkflowEvent calls emitChatEvent with type error for failed events', () => {
    recordArchonWorkflowEvent(baseEvent({
      status: 'failed',
      failingNode: 'validate',
      recoveryAction: 'Run npm test and retry',
    }));
    expect(mockEmitChatEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      chatId: 'chat-123',
      agentId: 'archie',
      content: expect.stringContaining('Archon workflow failed'),
      description: expect.stringContaining('Archon workflow failed'),
    }));
  });
});
