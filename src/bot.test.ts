import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { splitMessage, extractFileMarkers, recoverFromCompactionIfNeeded, formatTimeoutReply } from './bot.js';
import type { UsageInfo, AgentResult, SubagentResult } from './agent.js';

describe('splitMessage', () => {
  it('returns single-element array for short messages', () => {
    const result = splitMessage('Hello, world!');
    expect(result).toEqual(['Hello, world!']);
  });

  it('returns single-element array for empty string', () => {
    const result = splitMessage('');
    expect(result).toEqual(['']);
  });

  it('returns single-element array for exact 4096 char message', () => {
    const msg = 'a'.repeat(4096);
    const result = splitMessage(msg);
    expect(result).toEqual([msg]);
  });

  it('splits 4097 char message into two parts', () => {
    const msg = 'a'.repeat(4097);
    const result = splitMessage(msg);
    expect(result.length).toBe(2);
    // Reconstruct the original - parts should cover all chars
    expect(result.join('').length).toBe(4097);
  });

  it('never produces chunks longer than 4096 chars', () => {
    const msg = 'a'.repeat(10000);
    const result = splitMessage(msg);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(4096);
    }
  });

  it('splits on newline boundaries when possible', () => {
    // Create a message with newlines where the total exceeds 4096
    const line = 'x'.repeat(2000);
    const msg = `${line}\n${line}\n${line}`;
    // Total: 2000 + 1 + 2000 + 1 + 2000 = 6002
    const result = splitMessage(msg);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // First chunk should end at a newline boundary
    // (i.e., should be 2000 + 1 + 2000 = 4001 which fits in 4096)
    expect(result[0]).toContain('\n');
  });

  it('handles message with many short lines', () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i}`);
    const msg = lines.join('\n');
    const result = splitMessage(msg);
    for (const part of result) {
      expect(part.length).toBeLessThanOrEqual(4096);
    }
    // All content should be preserved
    expect(result.join('').replace(/^\s+/gm, '')).toBeTruthy();
  });

  it('handles message with no newlines that exceeds limit', () => {
    const msg = 'x'.repeat(8192);
    const result = splitMessage(msg);
    expect(result.length).toBe(2);
    expect(result[0].length).toBe(4096);
    expect(result[1].length).toBe(4096);
  });
});

describe('extractFileMarkers', () => {
  // ── Basic extraction ──────────────────────────────────────────────

  it('returns text unchanged when no markers present', () => {
    const input = 'Here is your report. Let me know if you need anything else.';
    const result = extractFileMarkers(input);
    expect(result.text).toBe(input);
    expect(result.files).toEqual([]);
  });

  it('extracts a single SEND_FILE marker', () => {
    const input = 'Here is the PDF.\n[SEND_FILE:/tmp/report.pdf]\nLet me know if you need changes.';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toEqual({
      type: 'document',
      filePath: '/tmp/report.pdf',
      caption: undefined,
    });
    expect(result.text).toBe('Here is the PDF.\n\nLet me know if you need changes.');
  });

  it('extracts a single SEND_PHOTO marker', () => {
    const input = 'Here is the chart.\n[SEND_PHOTO:/tmp/chart.png]';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toEqual({
      type: 'photo',
      filePath: '/tmp/chart.png',
      caption: undefined,
    });
    expect(result.text).toBe('Here is the chart.');
  });

  // ── Captions ──────────────────────────────────────────────────────

  it('extracts caption from pipe separator', () => {
    const input = '[SEND_FILE:/tmp/report.pdf|Q1 Financial Report]';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toEqual({
      type: 'document',
      filePath: '/tmp/report.pdf',
      caption: 'Q1 Financial Report',
    });
  });

  it('trims whitespace from caption and path', () => {
    const input = '[SEND_FILE: /tmp/report.pdf | Q1 Report ]';
    const result = extractFileMarkers(input);
    expect(result.files[0].filePath).toBe('/tmp/report.pdf');
    expect(result.files[0].caption).toBe('Q1 Report');
  });

  it('treats empty caption as undefined', () => {
    const input = '[SEND_FILE:/tmp/report.pdf|]';
    const result = extractFileMarkers(input);
    expect(result.files[0].caption).toBeUndefined();
  });

  // ── Multiple files ────────────────────────────────────────────────

  it('extracts multiple file markers', () => {
    const input = 'Here are both files.\n[SEND_FILE:/tmp/report.pdf]\n[SEND_PHOTO:/tmp/chart.png]\nDone.';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].type).toBe('document');
    expect(result.files[0].filePath).toBe('/tmp/report.pdf');
    expect(result.files[1].type).toBe('photo');
    expect(result.files[1].filePath).toBe('/tmp/chart.png');
    expect(result.text).toBe('Here are both files.\n\nDone.');
  });

  it('extracts multiple files with captions', () => {
    const input = '[SEND_FILE:/tmp/a.pdf|First doc]\n[SEND_FILE:/tmp/b.xlsx|Second doc]';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(2);
    expect(result.files[0].caption).toBe('First doc');
    expect(result.files[1].caption).toBe('Second doc');
  });

  // ── Path variations ───────────────────────────────────────────────

  it('handles paths with spaces', () => {
    const input = '[SEND_FILE:/tmp/test/My Report.pdf]';
    const result = extractFileMarkers(input);
    expect(result.files[0].filePath).toBe('/tmp/test/My Report.pdf');
  });

  it('handles deep nested paths', () => {
    const input = '[SEND_FILE:/tmp/test/output/nested/deep/file.csv]';
    const result = extractFileMarkers(input);
    expect(result.files[0].filePath).toBe('/tmp/test/output/nested/deep/file.csv');
  });

  it('handles various file extensions', () => {
    const extensions = ['pdf', 'xlsx', 'csv', 'png', 'jpg', 'zip', 'docx', 'mp4', 'txt'];
    for (const ext of extensions) {
      const input = `[SEND_FILE:/tmp/file.${ext}]`;
      const result = extractFileMarkers(input);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].filePath).toBe(`/tmp/file.${ext}`);
    }
  });

  // ── Text cleanup ──────────────────────────────────────────────────

  it('collapses triple+ newlines left after marker removal', () => {
    const input = 'Before.\n\n\n[SEND_FILE:/tmp/f.pdf]\n\n\nAfter.';
    const result = extractFileMarkers(input);
    // Should not have more than two consecutive newlines
    expect(result.text).not.toMatch(/\n{3,}/);
    expect(result.text).toContain('Before.');
    expect(result.text).toContain('After.');
  });

  it('trims leading/trailing whitespace from cleaned text', () => {
    const input = '\n\n[SEND_FILE:/tmp/f.pdf]\n\nHere you go.';
    const result = extractFileMarkers(input);
    expect(result.text).toBe('Here you go.');
  });

  it('returns empty string when response is only a marker', () => {
    const input = '[SEND_FILE:/tmp/report.pdf]';
    const result = extractFileMarkers(input);
    expect(result.text).toBe('');
    expect(result.files).toHaveLength(1);
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('extracts unbracketed markers with absolute paths', () => {
    // The dashboard demo failed when an agent emitted a marker
    // without surrounding brackets (`SEND_PHOTO|https://...`). The
    // tolerant matcher now extracts those so the chat doesn't show
    // the raw command string. We require an absolute path or a URL
    // so unrelated prose like "SEND_FILE:later" doesn't match.
    const input = 'SEND_FILE:/tmp/report.pdf';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({ type: 'document', filePath: '/tmp/report.pdf' });
  });

  it('extracts unbracketed SEND_PHOTO with pipe and http URL', () => {
    const input = 'Here it is. SEND_PHOTO|https://example.com/photo.png|nice shot';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({
      type: 'photo',
      filePath: 'https://example.com/photo.png',
      caption: 'nice shot',
    });
  });

  it('does not match unknown marker types', () => {
    const input = '[SEND_VIDEO:/tmp/video.mp4]';
    const result = extractFileMarkers(input);
    expect(result.files).toEqual([]);
    expect(result.text).toBe(input);
  });

  it('does not match markers with empty path', () => {
    const input = '[SEND_FILE:]';
    const result = extractFileMarkers(input);
    // The regex requires at least one char in the path group
    expect(result.files).toEqual([]);
  });

  it('handles marker embedded in a sentence', () => {
    const input = 'I created the file [SEND_FILE:/tmp/out.pdf] for you.';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].filePath).toBe('/tmp/out.pdf');
    expect(result.text).toBe('I created the file  for you.');
  });

  it('preserves text around multiple markers on separate lines', () => {
    const input = 'Line 1\n[SEND_FILE:/a.pdf]\nLine 2\n[SEND_FILE:/b.pdf]\nLine 3';
    const result = extractFileMarkers(input);
    expect(result.files).toHaveLength(2);
    expect(result.text).toContain('Line 1');
    expect(result.text).toContain('Line 2');
    expect(result.text).toContain('Line 3');
  });
});

// ─── recoverFromCompactionIfNeeded ────────────────────────────────────
//
// Plan 06-03: when result.usage.didCompact && result.text is empty, fire ONE
// continuation prompt that names the scratchpad path so the model can Read
// its prior findings. Hard cap of 1 retry — the helper has no loop.

function makeUsage(opts: { didCompact: boolean }): UsageInfo {
  return {
    inputTokens: 100,
    outputTokens: 50,
    cacheReadInputTokens: 0,
    totalCostUsd: 0.01,
    didCompact: opts.didCompact,
    preCompactTokens: opts.didCompact ? 80_000 : null,
    lastCallCacheRead: 0,
    lastCallInputTokens: 100,
    subtype: 'success',
    numTurns: 5,
  };
}

describe('recoverFromCompactionIfNeeded', () => {
  it('retries once with the scratchpad path when compacted+empty, returns recovered text', async () => {
    const scratchpad = '/tmp/scratch/vera-12345-1234.md';
    const initial = {
      text: '',
      newSessionId: 'sess-abc',
      usage: makeUsage({ didCompact: true }),
    };
    const rerun = vi.fn(async (msg: string, sid: string | undefined) => {
      // Sanity-check the continuation prompt: it must name the scratchpad
      // path explicitly and tell the model to Read it.
      expect(msg).toContain(scratchpad);
      expect(msg).toMatch(/Read .* using the Read tool/);
      expect(sid).toBe('sess-abc');
      return {
        text: 'Here are the GHL endpoints I found: /workflows, /contacts...',
        newSessionId: 'sess-abc',
        usage: makeUsage({ didCompact: false }),
      };
    });

    const out = await recoverFromCompactionIfNeeded(initial, scratchpad, rerun);

    expect(rerun).toHaveBeenCalledTimes(1);
    expect(out.text).toContain('GHL endpoints');
    // The recovered text replaces the empty initial text — caller picks it up
    // via formatEmptyReply short-circuit.
  });

  it('does NOT call rerun a third time if the recovery turn also returns empty', async () => {
    const scratchpad = '/tmp/scratch/archie-99-2222.md';
    const initial = {
      text: null,
      newSessionId: 'sess-xyz',
      usage: makeUsage({ didCompact: true }),
    };
    const rerun = vi.fn(async () => ({
      text: '',
      newSessionId: 'sess-xyz',
      usage: makeUsage({ didCompact: false }),
    }));

    const out = await recoverFromCompactionIfNeeded(initial, scratchpad, rerun);

    expect(rerun).toHaveBeenCalledTimes(1);
    expect(out.text).toBe('');
    // Caller's formatEmptyReply will fire downstream — this helper is one-shot.
  });

  it('short-circuits on a non-compaction empty reply (no retry burned)', async () => {
    const scratchpad = '/tmp/scratch/cole-7-3333.md';
    const initial = {
      text: '',
      newSessionId: 'sess-foo',
      usage: makeUsage({ didCompact: false }), // <- not compacted
    };
    const rerun = vi.fn(async () => {
      throw new Error('rerun should not be called');
    });

    const out = await recoverFromCompactionIfNeeded(initial, scratchpad, rerun);

    expect(rerun).not.toHaveBeenCalled();
    expect(out).toBe(initial); // short-circuit returns the same reference
  });

  it('short-circuits when result.text is non-empty even if compaction fired', async () => {
    const initial = {
      text: 'real findings here',
      newSessionId: 'sess-bar',
      usage: makeUsage({ didCompact: true }),
    };
    const rerun = vi.fn();
    const out = await recoverFromCompactionIfNeeded(initial, '/tmp/x.md', rerun);
    expect(rerun).not.toHaveBeenCalled();
    expect(out).toBe(initial);
  });
});

// ── formatTimeoutReply (Phase 7 — SALVAGE-01..03) ─────────────────────
//
// Captured 2026-05-12 14:14 ET from
// ~/.claudeclaw/scratch/archie-5005645513-1778594387139.md — 2.7KB of GHL
// workflows API research that sat on disk while the user saw the bare
// timeout message. Used as a realistic fixture so the formatter is
// exercised on real-world content shape (markdown headings, code spans,
// URLs, bullet lists), not synthetic toy strings.
const ARCHIE_SCRATCHPAD_FIXTURE = `## GHL Workflows API — Findings

**Base URLs:**
- V2 (current): https://services.leadconnectorhq.com
- V1 (EOL Dec 2025): https://rest.gohighlevel.com

**Auth:** Bearer JWT + \`Version: 2021-07-28\` header + \`locationId\` query param.

**Endpoints (confirmed):**
- GET /workflows/ — list workflows for a location
- PUT /workflows/{id}/status — change workflow status
- POST /workflows/{id}/trigger — marketplace trigger execute

**Trigger subscription payload:** \`{ eventType, eventData: {...}, locationId, contactId? }\`

**Rate limits:** 100 req / 10s per resource.
**Required scopes:** workflows.readonly

**Sources checked:**
- https://highlevel.stoplight.io/docs/integrations
- https://github.com/GoHighLevel/highlevel-api-docs

**Next: need to find** webhook signature scheme + retry semantics.
`;

function makeTimeoutUsage(overrides: Partial<UsageInfo> = {}): UsageInfo {
  return {
    inputTokens: 100,
    outputTokens: 50,
    cacheReadInputTokens: 0,
    totalCostUsd: 0.001,
    didCompact: false,
    preCompactTokens: null,
    lastCallCacheRead: 0,
    lastCallInputTokens: 100,
    subtype: 'success',
    numTurns: 12,
    ...overrides,
  };
}

function writeScratchpad(agentId: string, chatId: string, body: string | null): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'timeout-test-'));
  const file = path.join(dir, `${agentId}-${chatId}-${Date.now()}.md`);
  const header = `# Scratchpad for ${agentId} / chat ${chatId}\n\n`;
  fs.writeFileSync(file, body === null ? header : header + body, 'utf-8');
  return file;
}

describe('formatTimeoutReply', () => {
  const tmpFiles: string[] = [];

  function track(p: string): string {
    tmpFiles.push(p);
    return p;
  }

  afterEach(() => {
    while (tmpFiles.length) {
      const p = tmpFiles.pop()!;
      try {
        fs.rmSync(path.dirname(p), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it('all three salvage sources empty → returns fallback verbatim (SALVAGE-03)', () => {
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: [],
    };
    const fallback = 'Timed out after 900s. Try smaller steps.';
    const out = formatTimeoutReply(result, null, fallback);
    expect(out).toBe(fallback);
  });

  it('header-only scratchpad + empty subagents + null text → returns fallback verbatim', () => {
    const file = track(writeScratchpad('archie', '123', null));
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: [],
    };
    const fallback = 'Timed out after 900s. Try smaller steps.';
    const out = formatTimeoutReply(result, file, fallback);
    expect(out).toBe(fallback);
  });

  it('subagents only — includes Task section + footer', () => {
    const subs: SubagentResult[] = [
      { toolName: 'Task', toolUseId: 'tu_1', content: 'Found 3 repos: ...', isError: false },
    ];
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: subs,
    };
    const out = formatTimeoutReply(result, null, 'FALLBACK');
    expect(out).toContain('## Subagent: Task');
    expect(out).toContain('Found 3 repos: ...');
    expect(out).not.toContain('## Scratchpad');
    expect(out).not.toContain('## Partial work');
    // Footer
    expect(out).toMatch(/Recovered\s+1\s+subagent/i);
  });

  it('scratchpad only — uses the Archie fixture (real-world shape)', () => {
    const file = track(writeScratchpad('archie', '5005645513', ARCHIE_SCRATCHPAD_FIXTURE));
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: [],
    };
    const out = formatTimeoutReply(result, file, 'FALLBACK');
    expect(out).toContain('## Scratchpad');
    expect(out).toContain('V2 (current): https://services.leadconnectorhq.com');
    expect(out).toContain('workflows.readonly');
    expect(out).not.toContain('## Subagent');
    expect(out).not.toContain('## Partial work');
    // Header line from createScratchpad must be stripped by readScratchpad
    expect(out).not.toMatch(/# Scratchpad for archie/);
  });

  it('partial text only', () => {
    const result: AgentResult = {
      text: 'Started researching GHL...',
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: [],
    };
    const out = formatTimeoutReply(result, null, 'FALLBACK');
    expect(out).toContain('## Partial work');
    expect(out).toContain('Started researching GHL...');
    expect(out).not.toContain('## Subagent');
    expect(out).not.toContain('## Scratchpad');
  });

  it('all three sources present — sections appear in CONTEXT-locked precedence order', () => {
    const file = track(writeScratchpad('archie', '7', ARCHIE_SCRATCHPAD_FIXTURE));
    const subs: SubagentResult[] = [
      { toolName: 'Task', toolUseId: 'tu_a', content: 'Subagent A output', isError: false },
      { toolName: 'Task', toolUseId: 'tu_b', content: 'Subagent B output', isError: false },
    ];
    const result: AgentResult = {
      text: 'Conclusion in progress...',
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: subs,
    };
    const out = formatTimeoutReply(result, file, 'FALLBACK');
    const subagentIdx = out.indexOf('## Subagent: Task');
    const scratchpadIdx = out.indexOf('## Scratchpad');
    const partialIdx = out.indexOf('## Partial work');
    expect(subagentIdx).toBeGreaterThan(-1);
    expect(scratchpadIdx).toBeGreaterThan(-1);
    expect(partialIdx).toBeGreaterThan(-1);
    expect(subagentIdx).toBeLessThan(scratchpadIdx);
    expect(scratchpadIdx).toBeLessThan(partialIdx);
    // Both subagents rendered
    expect(out).toContain('Subagent A output');
    expect(out).toContain('Subagent B output');
  });

  it('footer includes recovered count and turn count when usage is present', () => {
    const subs: SubagentResult[] = [
      { toolName: 'Task', toolUseId: 'tu_1', content: 'a', isError: false },
      { toolName: 'Task', toolUseId: 'tu_2', content: 'b', isError: false },
    ];
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage({ numTurns: 18 }),
      aborted: true,
      subagentResults: subs,
    };
    const out = formatTimeoutReply(result, null, 'FALLBACK');
    // Footer line — extract everything after the last "---"
    const footer = out.slice(out.lastIndexOf('---'));
    expect(footer).toMatch(/2\s+subagent/i);
    expect(footer).toMatch(/18\s+turn/i);
  });

  it('footer omits turn clause when usage is null', () => {
    const subs: SubagentResult[] = [
      { toolName: 'Task', toolUseId: 'tu_x', content: 'x', isError: false },
    ];
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: null,
      aborted: true,
      subagentResults: subs,
    };
    const out = formatTimeoutReply(result, null, 'FALLBACK');
    const footer = out.slice(out.lastIndexOf('---'));
    expect(footer).toMatch(/1\s+subagent/i);
    expect(footer).not.toMatch(/turn/i);
  });

  it('array-shaped subagent content rendered verbatim (already-joined string)', () => {
    const subs: SubagentResult[] = [
      { toolName: 'Task', toolUseId: 'tu_1', content: 'Part A\nPart B', isError: false },
    ];
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: subs,
    };
    const out = formatTimeoutReply(result, null, 'FALLBACK');
    expect(out).toContain('Part A');
    expect(out).toContain('Part B');
  });

  it('error subagent labelled with (error) annotation', () => {
    const subs: SubagentResult[] = [
      { toolName: 'Task', toolUseId: 'tu_err', content: 'something went wrong', isError: true },
    ];
    const result: AgentResult = {
      text: null,
      newSessionId: undefined,
      usage: makeTimeoutUsage(),
      aborted: true,
      subagentResults: subs,
    };
    const out = formatTimeoutReply(result, null, 'FALLBACK');
    expect(out).toContain('## Subagent: Task (error)');
    expect(out).toContain('something went wrong');
  });
});
