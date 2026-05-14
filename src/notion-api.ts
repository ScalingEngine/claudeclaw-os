/**
 * Minimal Notion API client used by notion-sync.ts.
 *
 * Why a new module instead of importing an SDK:
 *  - We only need 4 verbs (databases.query, pages.update, pages.retrieve,
 *    pages.create). A 500KB SDK is overkill.
 *  - We want full control over rate limits + 429 backoff + telemetry.
 *  - .env loading goes through readEnvFile so the token never lands in
 *    process.env (claudeclaw's house style).
 *
 * Notion API version: 2022-06-28 (stable). The 2025-09-03 markdown
 * endpoints are not needed here — we work with property updates.
 */

import { logger } from './logger.js';
import { readEnvFile } from './env.js';

const NOTION_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

let cachedToken: string | undefined;

function token(): string {
  if (cachedToken !== undefined) return cachedToken;
  const env = readEnvFile(['NOTION_TOKEN']);
  cachedToken = (process.env.NOTION_TOKEN || env.NOTION_TOKEN || '').trim();
  if (!cachedToken) {
    throw new Error(
      'NOTION_TOKEN is not set — add it to .env to enable notion-sync. Phase 4 won\'t work without it.',
    );
  }
  return cachedToken;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${token()}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

/** Sleep helper for backoff. */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * fetch wrapper with retry + exponential backoff on 429 / 5xx. Caller passes
 * a name for log context. Returns parsed JSON on 2xx, throws on permanent
 * failure.
 */
async function notionFetch(name: string, url: string, init: RequestInit): Promise<any> {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res.json();

    // Retry on rate-limit + transient 5xx
    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      const backoff = retryAfter > 0 ? retryAfter * 1000 : Math.min(2 ** attempt * 250, 5000);
      logger.warn({ name, status: res.status, attempt, backoff }, 'Notion API retrying');
      if (attempt === maxAttempts) {
        const body = await res.text();
        throw new Error(`Notion ${name} failed after ${maxAttempts}: HTTP ${res.status} ${body.slice(0, 200)}`);
      }
      await sleep(backoff);
      continue;
    }

    // Permanent failure
    const body = await res.text();
    throw new Error(`Notion ${name} HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  throw new Error(`Notion ${name} unreachable`);
}

// ── Database query ────────────────────────────────────────────────────

export interface NotionPage {
  id: string;                                  // dashed uuid
  url: string;
  last_edited_time: string;                    // ISO-8601
  created_time: string;
  archived: boolean;
  properties: Record<string, any>;
}

/**
 * Query a database for rows matching a filter. Returns the union of all
 * pages (pagination handled internally). The filter spec is Notion's raw
 * shape — callers pre-build it.
 */
export async function queryDatabase(
  dbId: string,
  filter?: Record<string, any>,
  pageSize = 100,
): Promise<NotionPage[]> {
  const out: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const body: Record<string, unknown> = { page_size: pageSize };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch('queryDatabase', `${NOTION_BASE}/databases/${dbId}/query`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    for (const r of (data.results ?? []) as NotionPage[]) out.push(r);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return out;
}

// ── Page operations ───────────────────────────────────────────────────

export async function retrievePage(pageId: string): Promise<NotionPage> {
  return (await notionFetch(
    'retrievePage',
    `${NOTION_BASE}/pages/${pageId}`,
    { method: 'GET', headers: headers() },
  )) as NotionPage;
}

/**
 * PATCH a page's properties. Pass the property names + Notion-shaped values:
 *
 *   updatePage(id, {
 *     "Status": { status: { name: "Sent" } },
 *     "Write Source": { select: { name: "Agent" } },
 *     "Vault Slug": { rich_text: [{ text: { content: "..." } }] },
 *     "Last Synced At": { date: { start: new Date().toISOString() } },
 *   });
 */
export async function updatePage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
  return (await notionFetch(
    'updatePage',
    `${NOTION_BASE}/pages/${pageId}`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ properties }),
    },
  )) as NotionPage;
}

/**
 * Create a page in a database. Returns the new page (including its id).
 * Used to write Dispatch Log rows into Notion's mirror.
 */
export async function createPageInDatabase(
  databaseId: string,
  properties: Record<string, any>,
): Promise<NotionPage> {
  return (await notionFetch(
    'createPage',
    `${NOTION_BASE}/pages`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    },
  )) as NotionPage;
}

// ── Property accessors (Notion's shape is verbose; centralize the helpers) ──

export function getStatus(page: NotionPage, propName = 'Status'): string | null {
  const prop = page.properties[propName];
  if (!prop) return null;
  if (prop.type === 'status') return prop.status?.name ?? null;
  if (prop.type === 'select') return prop.select?.name ?? null;
  return null;
}

export function getSelect(page: NotionPage, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'select') return null;
  return prop.select?.name ?? null;
}

export function getRichText(page: NotionPage, propName: string): string {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'rich_text') return '';
  return ((prop.rich_text ?? []) as Array<{ plain_text?: string }>)
    .map((r) => r.plain_text ?? '')
    .join('');
}

export function getDate(page: NotionPage, propName: string): string | null {
  const prop = page.properties[propName];
  if (!prop || prop.type !== 'date') return null;
  return prop.date?.start ?? null;
}

export function getTitle(page: NotionPage, propName?: string): string {
  if (propName) {
    const prop = page.properties[propName];
    if (prop?.type === 'title') {
      return ((prop.title ?? []) as Array<{ plain_text?: string }>)
        .map((r) => r.plain_text ?? '')
        .join('');
    }
  }
  // Fallback: find the title-type property automatically
  for (const v of Object.values(page.properties)) {
    if ((v as any).type === 'title') {
      return (((v as any).title ?? []) as Array<{ plain_text?: string }>)
        .map((r) => r.plain_text ?? '')
        .join('');
    }
  }
  return '';
}

// ── Property builders for write ──

export const props = {
  status(name: string): Record<string, any> {
    return { status: { name } };
  },
  select(name: string): Record<string, any> {
    return { select: { name } };
  },
  richText(text: string): Record<string, any> {
    return {
      rich_text: text ? [{ type: 'text', text: { content: text.slice(0, 2000) } }] : [],
    };
  },
  date(iso: string): Record<string, any> {
    return { date: { start: iso } };
  },
  title(text: string): Record<string, any> {
    return {
      title: text ? [{ type: 'text', text: { content: text.slice(0, 2000) } }] : [],
    };
  },
};

/** Whether the Notion client is configured (NOTION_TOKEN present). */
export function isConfigured(): boolean {
  try {
    return token().length > 0;
  } catch {
    return false;
  }
}
