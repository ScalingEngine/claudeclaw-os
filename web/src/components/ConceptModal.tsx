import { useEffect, useState } from 'preact/hooks';
import { ExternalLink } from 'lucide-preact';
import { Modal } from './Modal';
import { PageState } from './PageState';
import { apiGet, ApiError } from '@/lib/api';

interface ConceptData {
  slug: string;
  title?: string;
  tags?: string[];
  updated?: string | null;
  status?: string | null;
  body: string;
  activity?: string | null;
  vaultPath: string;
}

interface Props {
  slug: string | null;
  onClose: () => void;
}

export function ConceptModal({ slug, onClose }: Props) {
  const [data, setData] = useState<ConceptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    apiGet<ConceptData>(`/api/vault/concept/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err instanceof ApiError ? err.status : 0;
        setError(
          status === 404
            ? `No concept file at knowledge/concepts/${slug}.md`
            : err?.message || 'Failed to load concept',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <Modal
      open={slug !== null}
      onClose={onClose}
      title={data?.title || slug || ''}
      width={680}
    >
      {loading && <PageState loading />}
      {error && <PageState error={error} />}
      {data && <ConceptBody data={data} />}
    </Modal>
  );
}

function ConceptBody({ data }: { data: ConceptData }) {
  const obsidianHref =
    'obsidian://open?vault=NoahBrain&file=' +
    encodeURIComponent(data.vaultPath.replace(/\.md$/, ''));
  return (
    <div class="space-y-3">
      {(data.tags?.length || data.status || data.updated) && (
        <div class="flex flex-wrap items-center gap-1.5">
          {(data.tags || []).map((t) => (
            <span
              key={t}
              class="font-mono text-[10px] text-[var(--color-text-muted)] bg-[var(--color-elevated)] border border-[var(--color-border)] px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
          {data.status === 'stale-candidate' && <StatusPill label="stale" tone="warn" />}
          {data.status === 'stub' && <StatusPill label="stub" tone="muted" />}
          {data.updated && (
            <span class="text-[11px] text-[var(--color-text-faint)] tabular-nums">
              updated {data.updated}
            </span>
          )}
        </div>
      )}

      <pre class="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-text)] font-sans">
        {data.body}
      </pre>

      {data.activity && (
        <details open class="border-t border-[var(--color-border)] pt-3 mt-3">
          <summary class="cursor-pointer text-[12px] font-semibold text-[var(--color-accent)]">
            Activity
          </summary>
          <pre class="whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--color-text-muted)] font-mono mt-2">
            {data.activity}
          </pre>
        </details>
      )}

      <div class="flex items-center gap-3 border-t border-[var(--color-border)] pt-3 mt-3 text-[11px] text-[var(--color-text-muted)]">
        <a
          href={obsidianHref}
          class="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
        >
          <ExternalLink size={11} /> Open in Obsidian
        </a>
        <code class="font-mono text-[10.5px] text-[var(--color-text-faint)]">{data.vaultPath}</code>
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'warn' | 'muted' }) {
  const cls =
    tone === 'warn'
      ? 'bg-[color-mix(in_srgb,var(--color-priority-medium)_18%,transparent)] text-[var(--color-priority-medium)]'
      : 'bg-[var(--color-card)] text-[var(--color-text-muted)]';
  return (
    <span class={`text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--color-border)] ${cls}`}>
      {label}
    </span>
  );
}

// Shared helpers used by HiveMind + Memories to detect concept refs.
export function conceptSlugFromArtifacts(artifacts: string | null | undefined): string | null {
  if (!artifacts) return null;
  try {
    const arr = JSON.parse(artifacts);
    if (!Array.isArray(arr)) return null;
    for (const a of arr) {
      if (a && a.type === 'concept' && typeof a.path === 'string') {
        const m = a.path.match(/^knowledge\/concepts\/([a-z0-9][a-z0-9-]*)$/);
        if (m) return m[1];
      }
    }
  } catch {}
  return null;
}

export function conceptSlugFromSource(source: string | null | undefined): string | null {
  if (!source || source === 'conversation') return null;
  const parts = source.split(':');
  if (parts.length < 2) return null;
  const slug = parts[parts.length - 1];
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}
