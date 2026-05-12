import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentError } from './errors.js';

// Mock the SDK query function before importing agent
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

vi.mock('./env.js', () => ({
  readEnvFile: vi.fn(() => ({})),
}));

vi.mock('./config.js', () => ({
  AGENT_MAX_TURNS: 30,
  PROJECT_ROOT: '/tmp/test',
  agentCwd: undefined,
}));

vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { runAgent, runAgentWithRetry, type SubagentResult } from './agent.js';
import { query } from '@anthropic-ai/claude-agent-sdk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQuery = query as any;
const noop = () => {};

/**
 * Create a mock async iterable that yields events then closes.
 */
function mockQueryEvents(events: Array<Record<string, unknown>>) {
  return async function* () {
    for (const ev of events) {
      yield ev;
    }
  };
}

function resultEvent(text: string) {
  return {
    type: 'result',
    result: text,
    subtype: 'result',
    usage: { input_tokens: 1000, output_tokens: 100, cache_read_input_tokens: 500 },
    total_cost_usd: 0.01,
  };
}

describe('runAgentWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns result on first try when no error', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQuery.mockReturnValue(mockQueryEvents([
      { type: 'system', subtype: 'init', session_id: 'sess-1' },
      resultEvent('Hello!'),
    ])() as any);

    const result = await runAgentWithRetry('hi', undefined, noop);
    expect(result.text).toBe('Hello!');
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds on second attempt', async () => {
    const retryableError = new AgentError('rate_limit', {
      shouldRetry: true,
      shouldNewChat: false,
      shouldSwitchModel: false,
      retryAfterMs: 100,
      userMessage: 'Rate limited. Retrying in 30s...',
    });

    let callCount = 0;
    mockQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw retryableError;
      return mockQueryEvents([
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        resultEvent('Recovered!'),
      ])();
    });

    const onRetry = vi.fn();
    const result = await runAgentWithRetry(
      'hi', undefined, noop, undefined, undefined, undefined, undefined, onRetry,
    );

    expect(result.text).toBe('Recovered!');
    expect(callCount).toBe(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.objectContaining({ category: 'rate_limit' }));
  }, 15000);

  it('does not retry non-retryable errors', async () => {
    const authError = new AgentError('auth', {
      shouldRetry: false,
      shouldNewChat: false,
      shouldSwitchModel: false,
      retryAfterMs: 0,
      userMessage: 'Auth failed',
    });

    mockQuery.mockImplementation(() => { throw authError; });

    await expect(runAgentWithRetry('hi', undefined, noop)).rejects.toThrow(AgentError);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('gives up after max retries', async () => {
    const retryableError = new AgentError('subprocess_crash', {
      shouldRetry: true,
      shouldNewChat: false,
      shouldSwitchModel: false,
      retryAfterMs: 100,
      userMessage: 'Subprocess crashed',
    });

    mockQuery.mockImplementation(() => { throw retryableError; });

    const onRetry = vi.fn();
    await expect(
      runAgentWithRetry('hi', undefined, noop, undefined, undefined, undefined, undefined, onRetry),
    ).rejects.toThrow(AgentError);

    // 1 initial + 2 retries = 3 total calls
    expect(mockQuery).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  }, 30000);

  it('returns aborted result when abort controller is pre-aborted', async () => {
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    // The SDK returns {aborted: true} when pre-aborted, runAgent returns it directly
    mockQuery.mockReturnValue(mockQueryEvents([
      { type: 'system', subtype: 'init', session_id: 'sess-1' },
      resultEvent('partial'),
    ])() as any);

    // When abort is signalled before query, runAgent catches and returns aborted
    // We mock this by having query throw the abort-detected error
    mockQuery.mockImplementation(() => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });

    const result = await runAgentWithRetry(
      'hi', undefined, noop, undefined, undefined, abortCtrl,
    );
    expect(result.aborted).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('non-AgentError exceptions are classified then thrown', async () => {
    // The SDK throws a TypeError. runAgent wraps it via classifyError into an AgentError.
    mockQuery.mockImplementation(() => { throw new TypeError('unexpected'); });

    await expect(
      runAgentWithRetry('hi', undefined, noop),
    ).rejects.toThrow(AgentError);
    // classifyError wraps TypeError into AgentError('unknown') which is not retryable
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('uses fallback model on shouldSwitchModel errors', async () => {
    const overloadedError = new AgentError('overloaded', {
      shouldRetry: true,
      shouldNewChat: false,
      shouldSwitchModel: true,
      retryAfterMs: 100,
      userMessage: 'Overloaded',
    });

    let callCount = 0;
    const capturedModels: (string | undefined)[] = [];
    mockQuery.mockImplementation((opts: unknown) => {
      callCount++;
      const options = (opts as Record<string, unknown>)?.options as Record<string, unknown> | undefined;
      capturedModels.push(options?.model as string | undefined);
      if (callCount === 1) throw overloadedError;
      return mockQueryEvents([
        { type: 'system', subtype: 'init', session_id: 'sess-1' },
        resultEvent('Fallback worked'),
      ])();
    });

    const result = await runAgentWithRetry(
      'hi', undefined, noop, undefined,
      'claude-opus-4-6', undefined, undefined, undefined,
      ['claude-sonnet-4-6', 'claude-haiku-4-5'],
    );

    expect(result.text).toBe('Fallback worked');
    expect(capturedModels[0]).toBe('claude-opus-4-6');
    expect(capturedModels[1]).toBe('claude-sonnet-4-6');
  }, 15000);
});

/**
 * Build a mock SDK stream that yields the given events in order, calls
 * `abortCtrl.abort()` (if provided) right after yield index `abortAfter`,
 * and finally throws an `AbortError` so agent.ts:catch fires and the
 * `abortController?.signal.aborted` branch is taken.
 */
function makeAbortingStream(
  events: Array<Record<string, unknown>>,
  abortCtrl: AbortController,
  abortAfter: number,
) {
  return async function* () {
    for (let i = 0; i < events.length; i++) {
      yield events[i];
      if (i === abortAfter) {
        abortCtrl.abort();
      }
    }
    throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  };
}

describe('runAgent tool_result capture on abort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures Task tool_result blocks emitted before abort', async () => {
    const abortCtrl = new AbortController();
    const events: Array<Record<string, unknown>> = [
      { type: 'system', subtype: 'init', session_id: 'sess-test' },
      {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              id: 'tu_1',
              name: 'Task',
              input: { description: 'Search GitHub for GHL workflow API patterns' },
            },
          ],
          usage: {},
        },
      },
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tu_1',
              is_error: false,
              content: 'Found 3 repos: ...payload...',
            },
          ],
        },
      },
    ];
    mockQuery.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeAbortingStream(events, abortCtrl, /* abortAfter */ 2)() as any,
    );

    const result = await runAgent(
      'test prompt',
      undefined,
      noop,
      undefined,
      undefined,
      abortCtrl,
    );

    expect(result.aborted).toBe(true);
    expect(result.text).toBe(null);
    expect(Array.isArray(result.subagentResults)).toBe(true);
    const captured = result.subagentResults as SubagentResult[];
    expect(captured.length).toBe(1);
    expect(captured[0].toolName).toBe('Task');
    expect(captured[0].toolUseId).toBe('tu_1');
    expect(captured[0].content).toBe('Found 3 repos: ...payload...');
    expect(captured[0].isError).toBe(false);
  });

  it('handles array-shaped tool_result content (joins text blocks with newline)', async () => {
    const abortCtrl = new AbortController();
    const events: Array<Record<string, unknown>> = [
      { type: 'system', subtype: 'init', session_id: 'sess-test' },
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tu_2', name: 'Task', input: {} },
          ],
          usage: {},
        },
      },
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tu_2',
              is_error: false,
              content: [
                { type: 'text', text: 'Part A' },
                { type: 'text', text: 'Part B' },
              ],
            },
          ],
        },
      },
    ];
    mockQuery.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeAbortingStream(events, abortCtrl, 2)() as any,
    );

    const result = await runAgent(
      'test', undefined, noop, undefined, undefined, abortCtrl,
    );

    expect(result.aborted).toBe(true);
    const captured = result.subagentResults as SubagentResult[];
    expect(captured.length).toBe(1);
    expect(captured[0].content).toBe('Part A\nPart B');
  });

  it('skips tool_result for non-Task tool_use (Read, Grep, etc.)', async () => {
    const abortCtrl = new AbortController();
    const events: Array<Record<string, unknown>> = [
      { type: 'system', subtype: 'init', session_id: 'sess-test' },
      {
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'tu_3', name: 'Read', input: { file_path: '/tmp/x' } },
          ],
          usage: {},
        },
      },
      {
        type: 'user',
        message: {
          content: [
            {
              type: 'tool_result',
              tool_use_id: 'tu_3',
              is_error: false,
              content: 'file contents here',
            },
          ],
        },
      },
    ];
    mockQuery.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeAbortingStream(events, abortCtrl, 2)() as any,
    );

    const result = await runAgent(
      'test', undefined, noop, undefined, undefined, abortCtrl,
    );

    expect(result.aborted).toBe(true);
    const captured = result.subagentResults as SubagentResult[];
    expect(captured.length).toBe(0);
  });

  it('returns empty subagentResults array when no Task tool_use was registered', async () => {
    const abortCtrl = new AbortController();
    const events: Array<Record<string, unknown>> = [
      { type: 'system', subtype: 'init', session_id: 'sess-test' },
      {
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'thinking...' }], usage: {} },
      },
    ];
    mockQuery.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeAbortingStream(events, abortCtrl, 1)() as any,
    );

    const result = await runAgent(
      'test', undefined, noop, undefined, undefined, abortCtrl,
    );

    expect(result.aborted).toBe(true);
    expect(Array.isArray(result.subagentResults)).toBe(true);
    expect((result.subagentResults as SubagentResult[]).length).toBe(0);
  });
});
