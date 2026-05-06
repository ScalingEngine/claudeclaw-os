import { logToHiveMind } from './db.js';
import { emitChatEvent, type ChatEvent } from './state.js';

export type ArchonWorkflowStatus = 'started' | 'completed' | 'failed';

export interface ArchonWorkflowEvent {
  workflowName: string;
  status: ArchonWorkflowStatus;
  agentId: string;
  chatId: string;
  runId?: string;
  branch?: string;
  nodeId?: string;
  failingNode?: string;
  recoveryAction?: string;
  details?: string;
}

function requireText(value: string | undefined, field: string): string {
  if (!value?.trim()) {
    throw new Error(`Archon workflow event missing required field: ${field}`);
  }
  return value.trim();
}

function runRef(event: ArchonWorkflowEvent): string {
  if (event.runId?.trim()) return `run ${event.runId.trim()}`;
  if (event.branch?.trim()) return `branch ${event.branch.trim()}`;
  if (event.status === 'failed') {
    throw new Error('Archon workflow failed events require runId or branch');
  }
  return 'run unknown';
}

export function formatArchonWorkflowSummary(event: ArchonWorkflowEvent): string {
  const workflowName = requireText(event.workflowName, 'workflowName');
  const ref = runRef(event);

  if (event.status === 'started') {
    return `Archon workflow started: ${workflowName} (${ref})`;
  }

  if (event.status === 'completed') {
    return `Archon workflow completed: ${workflowName} (${ref})`;
  }

  const failingNode = requireText(event.failingNode, 'failingNode');
  const recoveryAction = requireText(event.recoveryAction, 'recoveryAction');
  return `Archon workflow failed: ${workflowName} (${ref}) at ${failingNode}. Recovery: ${recoveryAction}`;
}

export function formatArchonFailureReport(event: ArchonWorkflowEvent): string {
  if (event.status !== 'failed') {
    throw new Error('Archon failure reports require status failed');
  }

  const workflowName = requireText(event.workflowName, 'workflowName');
  const failingNode = requireText(event.failingNode, 'failingNode');
  const recoveryAction = requireText(event.recoveryAction, 'recoveryAction');

  if (!event.runId?.trim() && !event.branch?.trim()) {
    throw new Error('Archon failure reports require runId or branch');
  }

  const lines = [
    `workflow: ${workflowName}`,
    event.runId?.trim()
      ? `run_id: ${event.runId.trim()}`
      : `branch: ${event.branch?.trim()}`,
    `failing_node: ${failingNode}`,
    `recovery_action: ${recoveryAction}`,
  ];

  return lines.join('\n');
}

function actionForStatus(status: ArchonWorkflowStatus): string {
  switch (status) {
    case 'started':
      return 'archon_workflow_started';
    case 'completed':
      return 'archon_workflow_completed';
    case 'failed':
      return 'archon_workflow_failed';
  }
}

function eventTypeForStatus(status: ArchonWorkflowStatus): ChatEvent['type'] {
  switch (status) {
    case 'started':
      return 'progress';
    case 'completed':
      return 'hive_mind';
    case 'failed':
      return 'error';
  }
}

export function recordArchonWorkflowEvent(event: ArchonWorkflowEvent): void {
  const summary = formatArchonWorkflowSummary(event);
  const artifacts = JSON.stringify({
    workflowName: event.workflowName,
    status: event.status,
    runId: event.runId ?? null,
    branch: event.branch ?? null,
    nodeId: event.nodeId ?? null,
    failingNode: event.failingNode ?? null,
    recoveryAction: event.recoveryAction ?? null,
    details: event.details ?? null,
  });

  logToHiveMind(
    event.agentId,
    event.chatId,
    actionForStatus(event.status),
    summary,
    artifacts,
  );

  emitChatEvent({
    type: eventTypeForStatus(event.status),
    chatId: event.chatId,
    agentId: event.agentId,
    description: summary,
    content: summary,
  });
}
