import React, { useCallback, useEffect, useState } from 'react';
import { CheckIcon, ExternalLinkIcon, SendIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';

type ReviewItem = {
  id: string;
  courseCode: string;
  session: number;
  slo: number;
  driveLink: string;
  ts: number;
};

type RowState = 'idle' | 'submitting' | 'done' | 'failed' | 'held';

async function postJSON(url: string, body: unknown, ms = 60000) {
  const ac = new AbortController();
  const t = window.setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ac.signal
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  } finally {
    window.clearTimeout(t);
  }
}

export function Review() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [state, setState] = useState<Record<string, RowState>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/reviews');
      const d = await r.json();
      setItems(d.items ?? []);
      setRemaining(d.dailyRemaining ?? null);
      setLimit(d.dailyLimit ?? null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Submit one item; returns 'done' | 'failed' | 'held'.
  const submitOne = useCallback(async (id: string): Promise<RowState> => {
    setState((s) => ({ ...s, [id]: 'submitting' }));
    setMsg((m) => ({ ...m, [id]: '' }));
    try {
      const { status, data } = await postJSON('/api/reviews/submit', { id });
      if (status === 429) {
        setState((s) => ({ ...s, [id]: 'held' }));
        return 'held';
      }
      if (data?.ok) {
        setState((s) => ({ ...s, [id]: 'done' }));
        setRemaining((r) => (r === null ? r : Math.max(0, r - 1)));
        return 'done';
      }
      setState((s) => ({ ...s, [id]: 'failed' }));
      setMsg((m) => ({ ...m, [id]: String(data?.error || data?.detail || 'SRM rejected') }));
      return 'failed';
    } catch {
      setState((s) => ({ ...s, [id]: 'failed' }));
      setMsg((m) => ({ ...m, [id]: 'timed out — try again' }));
      return 'failed';
    }
  }, []);

  const submitAll = useCallback(async () => {
    setRunning(true);
    for (const it of items) {
      if (state[it.id] === 'done') continue;
      const res = await submitOne(it.id);
      if (res === 'held') break; // daily cap reached — leave the rest
    }
    setRunning(false);
  }, [items, state, submitOne]);

  const capReached = remaining !== null && remaining <= 0;
  const pending = items.filter((i) => state[i.id] !== 'done');

  const badge = (id: string) => {
    const st = state[id];
    if (st === 'submitting') return <span className="font-mono text-2xs text-warn">Submitting…</span>;
    if (st === 'done') return <span className="inline-flex items-center gap-1 font-mono text-2xs text-accent"><CheckIcon className="h-3 w-3" />Submitted</span>;
    if (st === 'held') return <span className="font-mono text-2xs text-warn">Held — tomorrow</span>;
    if (st === 'failed') return <span className="font-mono text-2xs text-danger" title={msg[id]}>Failed — {msg[id] || 'retry'}</span>;
    return null;
  };

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Review &amp; submit</h1>
          <p className="mt-1 text-sm text-muted">Filled worksheets waiting to submit to SRM. Open a doc to check it, then submit.</p>
        </div>
        <div className="text-right">
          {limit !== null &&
          <p className="font-mono text-2xs text-faint">{remaining}/{limit} submissions left today</p>
          }
          <Button variant="primary" className="mt-2" onClick={submitAll} disabled={!pending.length || running || capReached}>
            <SendIcon className="h-4 w-4" aria-hidden />
            {running ? 'Submitting…' : `Submit all (${Math.min(pending.length, remaining ?? pending.length)})`}
          </Button>
        </div>
      </header>

      {capReached &&
      <p className="mt-4 rounded-md border border-warn/25 bg-raised px-3 py-2 font-mono text-2xs text-warn">
          Daily submit limit reached — the rest stay here for tomorrow.
        </p>
      }

      {loading ?
      <p className="py-10 text-center font-mono text-2xs text-faint">Loading…</p> :
      !items.length ?
      <p className="py-10 text-center text-sm text-muted">Nothing to review yet. Filled worksheets show up here.</p> :

      <ul className="mt-4 divide-y divide-line border-y border-line">
          {items.map((it) => {
          const st = state[it.id];
          return (
            <li key={it.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-6">
                <div className="flex min-w-0 flex-1 items-baseline gap-3">
                  <span className="font-mono text-sm text-accent">{it.courseCode}</span>
                  <span className="text-sm text-ink">Session {it.session} · SLO {it.slo}</span>
                </div>
                <a
                href={it.driveLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-2xs text-info transition-colors duration-150 ease-out hover:text-ink">
                  open doc
                  <ExternalLinkIcon className="h-3 w-3" aria-hidden />
                </a>
                <div className="flex w-40 shrink-0 items-center justify-end gap-3">
                  {badge(it.id)}
                  {st !== 'done' &&
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => submitOne(it.id)}
                    disabled={st === 'submitting' || running || capReached}>
                      {st === 'failed' || st === 'held' ? 'Retry' : 'Submit'}
                    </Button>
                  }
                </div>
              </li>);

        })}
        </ul>
      }
    </div>);

}
