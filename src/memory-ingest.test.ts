import { describe, it, expect, vi, beforeEach } from 'vitest';

const extractor = vi.hoisted(() => ({
  nextResult: '',
  nextError: null as Error | null,
  mockQuery: vi.fn(),
}));

vi.mock('./gemini.js', () => ({
  parseJsonResponse: vi.fn(),
}));

// Mock the Claude SDK so extractViaClaude exercises its real prompt and
// parse pipeline without spawning a subprocess.
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: extractor.mockQuery.mockImplementation(() => {
    async function* respond() {
      if (extractor.nextError) throw extractor.nextError;
      yield { type: 'result', result: extractor.nextResult };
    }
    return respond();
  }),
}));

vi.mock('./security.js', () => ({
  getScrubbedSdkEnv: vi.fn(() => ({})),
}));

vi.mock('./env.js', () => ({
  readEnvFile: vi.fn(() => ({})),
}));

vi.mock('./db.js', () => ({
  saveStructuredMemoryAtomic: vi.fn(() => 1),
  getMemoriesWithEmbeddings: vi.fn(() => []),
}));

vi.mock('./embeddings.js', () => ({
  embedText: vi.fn(() => Promise.resolve([0.1, 0.2, 0.3])),
  cosineSimilarity: vi.fn(() => 0),
}));

vi.mock('./logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ingestConversationTurn } from './memory-ingest.js';
import { parseJsonResponse } from './gemini.js';
import { saveStructuredMemoryAtomic } from './db.js';
import { query } from '@anthropic-ai/claude-agent-sdk';

const mockQuery = vi.mocked(query);
const mockParseJson = vi.mocked(parseJsonResponse);
const mockSave = vi.mocked(saveStructuredMemoryAtomic);

function setExtractorResponse(raw: string, parsed: any) {
  extractor.nextResult = raw;
  extractor.nextError = null;
  mockParseJson.mockReturnValue(parsed);
}

function setExtractorError(err: Error) {
  extractor.nextResult = '';
  extractor.nextError = err;
}

describe('ingestConversationTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractor.nextResult = '';
    extractor.nextError = null;
  });

  // ── Hard filters (skip before hitting the extractor) ─────────────

  it('skips messages <= 15 characters', async () => {
    const result = await ingestConversationTurn('chat1', 'short msg', 'ok');
    expect(result).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('skips messages exactly 15 characters', async () => {
    const result = await ingestConversationTurn('chat1', '123456789012345', 'ok');
    expect(result).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('processes messages of 16 characters', async () => {
    setExtractorResponse('{}', { skip: true });
    const result = await ingestConversationTurn('chat1', '1234567890123456', 'ok');
    // Should have called the extractor even though it was skipped by LLM.
    expect(mockQuery).toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('skips messages starting with /', async () => {
    const result = await ingestConversationTurn('chat1', '/chatid some long command text here', 'Your ID is 12345');
    expect(result).toBe(false);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // ── Extractor decides to skip ────────────────────────────────────

  it('returns false when extractor says skip', async () => {
    setExtractorResponse('{"skip": true}', { skip: true });
    const result = await ingestConversationTurn('chat1', 'ok sounds good thanks for doing that', 'No problem.');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns false when parse returns null (parse failure)', async () => {
    setExtractorResponse('garbage', null);
    const result = await ingestConversationTurn('chat1', 'some message that is long enough', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Extractor extracts a memory ──────────────────────────────────

  it('saves a structured memory on valid extraction', async () => {
    const extraction = {
      skip: false,
      summary: 'User prefers dark mode in all applications',
      entities: ['dark mode', 'UI'],
      topics: ['preferences', 'UI'],
      importance: 0.8,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn(
      'chat1',
      'I always want dark mode enabled in everything',
      'Got it, I will remember your dark mode preference.',
    );

    expect(result).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(
      'chat1',
      'I always want dark mode enabled in everything',
      'User prefers dark mode in all applications',
      ['dark mode', 'UI'],
      ['preferences', 'UI'],
      0.8,
      expect.arrayContaining([0.1, 0.2, 0.3]),
      'conversation',
      'ezra',
    );
  });

  // ── Importance filtering ──────────────────────────────────────────

  it('skips extraction with importance < 0.3', async () => {
    const extraction = {
      skip: false,
      summary: 'Trivial fact',
      entities: [],
      topics: [],
      importance: 0.25,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'some trivial message longer than fifteen', 'ok');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('skips extraction with importance exactly 0.2 (below 0.3 floor)', async () => {
    const extraction = {
      skip: false,
      summary: 'Low importance fact',
      entities: [],
      topics: [],
      importance: 0.2,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'some borderline message longer than fifteen', 'ok');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('skips extraction with importance exactly 0.3 (below 0.5 floor)', async () => {
    const extraction = {
      skip: false,
      summary: 'Borderline fact',
      entities: [],
      topics: [],
      importance: 0.3,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'some borderline message longer than fifteen', 'ok');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('saves extraction with importance exactly 0.5', async () => {
    const extraction = {
      skip: false,
      summary: 'Useful fact',
      entities: [],
      topics: [],
      importance: 0.5,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'some useful message longer than fifteen', 'ok');
    expect(result).toBe(true);
    expect(mockSave).toHaveBeenCalled();
  });

  // ── Importance clamping ───────────────────────────────────────────

  it('clamps importance above 1.0 to 1.0', async () => {
    const extraction = {
      skip: false,
      summary: 'Very important',
      entities: [],
      topics: [],
      importance: 1.5,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    await ingestConversationTurn('chat1', 'extremely important message for testing', 'noted');
    expect(mockSave).toHaveBeenCalledWith(
      'chat1',
      expect.any(String),
      'Very important',
      [],
      [],
      1.0,  // clamped
      expect.arrayContaining([0.1, 0.2, 0.3]),
      'conversation',
      'ezra',
    );
  });

  it('clamps negative importance to 0', async () => {
    const extraction = {
      skip: false,
      summary: 'Negative importance',
      entities: [],
      topics: [],
      importance: -0.5,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    // importance -0.5 < 0.2 threshold, so it should be skipped
    const result = await ingestConversationTurn('chat1', 'message with negative importance test', 'response');
    expect(result).toBe(false);
  });

  // ── Validation of required fields ─────────────────────────────────

  it('skips when summary is missing', async () => {
    const extraction = {
      skip: false,
      summary: '',
      entities: [],
      topics: [],
      importance: 0.7,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'message with no summary extracted from it', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('skips when importance is not a number', async () => {
    const extraction = {
      skip: false,
      summary: 'Valid summary',
      entities: [],
      topics: [],
      importance: 'high' as unknown as number,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'message where importance is a string', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Missing optional fields ───────────────────────────────────────

  it('handles missing entities and topics gracefully', async () => {
    const extraction = {
      skip: false,
      summary: 'No entities or topics',
      importance: 0.5,
    };
    setExtractorResponse(JSON.stringify(extraction), extraction);

    const result = await ingestConversationTurn('chat1', 'message with no entities or topics at all', 'response');
    expect(result).toBe(true);
    expect(mockSave).toHaveBeenCalledWith(
      'chat1',
      expect.any(String),
      'No entities or topics',
      [],  // defaults to empty
      [],  // defaults to empty
      0.5,
      expect.arrayContaining([0.1, 0.2, 0.3]),
      'conversation',
      'ezra',
    );
  });

  // ── Error handling ────────────────────────────────────────────────

  it('returns false when extractor throws', async () => {
    setExtractorError(new Error('API rate limited'));

    const result = await ingestConversationTurn('chat1', 'this message should not crash the bot', 'response');
    expect(result).toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  // ── Message truncation ────────────────────────────────────────────

  it('truncates long messages to 2000 chars in prompt', async () => {
    setExtractorResponse('{"skip": true}', { skip: true });

    const longMsg = 'x'.repeat(5000);
    await ingestConversationTurn('chat1', longMsg, 'response');

    const queryArg = mockQuery.mock.calls[0][0] as {
      prompt: AsyncGenerator<{ message: { content: string } }>;
    };
    const promptEvent = await queryArg.prompt.next();
    const promptArg = promptEvent.value.message.content;
    // The prompt should contain the truncated message, not the full 5000 chars
    expect(promptArg).not.toContain('x'.repeat(3000));
    expect(promptArg).toContain('x'.repeat(2000));
  });
});
