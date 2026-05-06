#!/usr/bin/env node

import { initDatabase } from './db.js';
import {
  formatArchonWorkflowSummary,
  recordArchonWorkflowEvent,
  type ArchonWorkflowEvent,
  type ArchonWorkflowStatus,
} from './archon-observability.js';

type Command = 'start' | 'complete' | 'fail';

const [, , commandArg, ...args] = process.argv;

function usage(): string {
  return [
    'Usage:',
    '  archon-observability-cli start --workflow <name> (--run-id <id>|--branch <branch>) --chat-id <id> --agent <id> [--node <id>] [--details <text>]',
    '  archon-observability-cli complete --workflow <name> (--run-id <id>|--branch <branch>) --chat-id <id> --agent <id> [--node <id>] [--details <text>]',
    '  archon-observability-cli fail --workflow <name> (--run-id <id>|--branch <branch>) --chat-id <id> --agent <id> --node <id> --recovery <text> [--details <text>]',
  ].join('\n');
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

function readFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      fail(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      fail(`Missing value for --${key}`);
    }

    flags[key] = value;
    i++;
  }

  return flags;
}

function requireFlag(flags: Record<string, string>, key: string): string {
  const value = flags[key];
  if (!value?.trim()) fail(`Missing required flag --${key}`);
  return value.trim();
}

function requireRunRef(flags: Record<string, string>): void {
  if (!flags['run-id']?.trim() && !flags.branch?.trim()) {
    fail('Missing required run reference: pass --run-id or --branch');
  }
}

function statusForCommand(command: Command): ArchonWorkflowStatus {
  if (command === 'start') return 'started';
  if (command === 'complete') return 'completed';
  return 'failed';
}

function parseCommand(command: string | undefined): Command {
  if (command === 'start' || command === 'complete' || command === 'fail') {
    return command;
  }
  fail('Commands: start | complete | fail');
}

const command = parseCommand(commandArg);
const flags = readFlags(args);

requireRunRef(flags);

const event: ArchonWorkflowEvent = {
  workflowName: requireFlag(flags, 'workflow'),
  status: statusForCommand(command),
  agentId: requireFlag(flags, 'agent'),
  chatId: requireFlag(flags, 'chat-id'),
  runId: flags['run-id'],
  branch: flags.branch,
  nodeId: flags.node,
  failingNode: command === 'fail' ? requireFlag(flags, 'node') : undefined,
  recoveryAction: command === 'fail' ? requireFlag(flags, 'recovery') : flags.recovery,
  details: flags.details,
};

initDatabase();
recordArchonWorkflowEvent(event);

console.log(`archon workflow event recorded: ${formatArchonWorkflowSummary(event)}`);
