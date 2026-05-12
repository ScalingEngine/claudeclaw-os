import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';

// Mirror src/avatars.test.ts: stand up a real tmpdir and redirect
// CLAUDECLAW_CONFIG at it via a vi.mock of './config.js' so SCRATCH_DIR
// resolves under the tmpdir. Real fs throughout — no fs mocks.

const { TEST_ROOT } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os = require('os');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  return {
    TEST_ROOT: fs.mkdtempSync(
      path.join(os.tmpdir(), 'claudeclaw-scratch-test-'),
    ),
  };
});

vi.mock('./config.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  return {
    CLAUDECLAW_CONFIG: path.join(TEST_ROOT, 'config'),
  };
});

vi.mock('./logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const {
  SCRATCH_DIR,
  createScratchpad,
  deleteScratchpad,
  cleanupOldScratchpads,
} = await import('./scratchpad.js');

describe('scratchpad module', () => {
  beforeEach(() => {
    // Ensure the dir exists and is empty before each test
    fs.mkdirSync(SCRATCH_DIR, { recursive: true });
    for (const entry of fs.readdirSync(SCRATCH_DIR)) {
      try {
        fs.unlinkSync(path.join(SCRATCH_DIR, entry));
      } catch {
        /* ignore */
      }
    }
  });

  afterEach(() => {
    // Clean any leftover files between tests
    if (fs.existsSync(SCRATCH_DIR)) {
      for (const entry of fs.readdirSync(SCRATCH_DIR)) {
        try {
          fs.unlinkSync(path.join(SCRATCH_DIR, entry));
        } catch {
          /* ignore */
        }
      }
    }
  });

  afterAll(() => {
    fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  });

  it('createScratchpad writes a file with the right name pattern and header', () => {
    const file = createScratchpad('vera', '12345');
    expect(file).toMatch(/[/\\]scratch[/\\]vera-12345-\d+\.md$/);
    expect(fs.existsSync(file)).toBe(true);
    const contents = fs.readFileSync(file, 'utf-8');
    expect(contents.startsWith('# Scratchpad for vera / chat 12345')).toBe(true);
  });

  it('two consecutive createScratchpad calls produce distinct paths', async () => {
    const a = createScratchpad('vera', '12345');
    // Sleep ~3ms so Date.now() advances at least 1ms on coarse-resolution clocks
    await new Promise((resolve) => setTimeout(resolve, 3));
    const b = createScratchpad('vera', '12345');
    expect(a).not.toBe(b);
    expect(fs.existsSync(a)).toBe(true);
    expect(fs.existsSync(b)).toBe(true);
  });

  it('sanitizes path-traversal-shaped agentId/chatId so the file stays inside SCRATCH_DIR', () => {
    const file = createScratchpad('../../etc', 'evil/path');
    // Both components had / and . sequences sanitized to underscores; the
    // resulting filename lives entirely inside SCRATCH_DIR.
    expect(path.dirname(file)).toBe(SCRATCH_DIR);
    expect(path.basename(file)).toMatch(/^\.\.\_\.\.\_etc-evil_path-\d+\.md$/);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('deleteScratchpad removes the file and is idempotent on a missing file', () => {
    const file = createScratchpad('vera', '12345');
    expect(fs.existsSync(file)).toBe(true);
    deleteScratchpad(file);
    expect(fs.existsSync(file)).toBe(false);
    // Second call must not throw — swept-later semantics
    expect(() => deleteScratchpad(file)).not.toThrow();
  });

  it('cleanupOldScratchpads with negative maxAge deletes everything; missing dir returns silently', () => {
    createScratchpad('vera', '1');
    createScratchpad('archie', '2');
    expect(fs.readdirSync(SCRATCH_DIR).length).toBe(2);
    // Use -1 so `now - mtimeMs > -1` is true even when mtime == now (just-created
    // files on coarse-resolution clocks). The real default of 24h is never racy.
    cleanupOldScratchpads(-1);
    expect(fs.readdirSync(SCRATCH_DIR).length).toBe(0);

    // Now nuke the dir entirely and verify the function still returns silently.
    fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
    expect(() => cleanupOldScratchpads(-1)).not.toThrow();
  });

  it('cleanupOldScratchpads(60_000) keeps fresh files but deletes stale ones', () => {
    const fresh = createScratchpad('vera', 'fresh');
    const stale = createScratchpad('vera', 'stale');
    // Force the stale file's mtime to 2 minutes ago.
    const twoMinAgo = new Date(Date.now() - 120_000);
    fs.utimesSync(stale, twoMinAgo, twoMinAgo);

    cleanupOldScratchpads(60_000);

    expect(fs.existsSync(fresh)).toBe(true);
    expect(fs.existsSync(stale)).toBe(false);
  });
});
