import React, { useState } from 'react';
import type { Session } from '../types/quill';

type Tab = 'mcq' | 'short' | 'long';

const TABS: Array<{id: Tab;label: string;}> = [
{ id: 'mcq', label: 'MCQ' },
{ id: 'short', label: 'Short answer' },
{ id: 'long', label: 'Long answer' }];


export function QuestionsPanel({ session }: {session: Session;}) {
  const [tab, setTab] = useState<Tab>('mcq');
  const pairs = tab === 'short' ? session.shortQuestions : session.longQuestions;

  return (
    <div className="rounded-md border border-line bg-canvas">
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5" role="tablist">
        {TABS.map((t) =>
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`rounded px-2 py-1 font-mono text-2xs transition-colors duration-150 ease-out ${
          tab === t.id ? 'bg-raised text-ink' : 'text-faint hover:text-muted'}`
          }>
          
            {t.label}
          </button>
        )}
        <span className="ml-auto pr-1 font-mono text-2xs text-faint">raw from SRM API</span>
      </div>

      <div className="q-scroll max-h-72 space-y-3 overflow-y-auto p-3">
        {tab === 'mcq' ?
        session.mcqs.map((q, i) =>
        <article key={q.id} className="border-b border-line/60 pb-3 last:border-0 last:pb-0">
                <div className="flex gap-2">
                  <span className="shrink-0 font-mono text-2xs text-faint">Q{i + 1}</span>
                  <div
              className="q-html min-w-0 text-xs leading-relaxed text-ink"
              dangerouslySetInnerHTML={{ __html: q.html }} />
            
                </div>
                <ul className="mt-2 space-y-1 pl-6">
                  {q.options.map((o, j) =>
            <li
              key={o.label}
              className={`flex gap-2 font-mono text-2xs ${
              j === q.correct ? 'text-accent' : 'text-muted'}`
              }>
              
                      <span className="shrink-0">{o.label})</span>
                      <span dangerouslySetInnerHTML={{ __html: o.html }} />
                      {j === q.correct && <span className="ml-1 shrink-0 text-faint">← model answer</span>}
                    </li>
            )}
                </ul>
              </article>
        ) :
        pairs.map((p, i) =>
        <article key={p.question} className="border-b border-line/60 pb-3 last:border-0 last:pb-0">
                <div className="flex gap-2">
                  <span className="shrink-0 font-mono text-2xs text-faint">Q{i + 1}</span>
                  <p className="min-w-0 text-xs leading-relaxed text-ink">{p.question}</p>
                </div>
                <p className="mt-1.5 border-l border-accent/40 pl-3 text-xs leading-relaxed text-muted">
                  {p.answer}
                </p>
              </article>
        )}
      </div>
    </div>);

}