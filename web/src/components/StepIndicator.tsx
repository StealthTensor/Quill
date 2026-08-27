import React from 'react';
import { CheckIcon, LoaderIcon, TriangleAlertIcon } from 'lucide-react';
import type { StepId, StepState } from '../types/quill';

const STEPS: Array<{id: StepId;label: string;}> = [
{ id: 'scan', label: 'SCAN' },
{ id: 'generate', label: 'GENERATE' },
{ id: 'fill', label: 'FILL DOCX' },
{ id: 'upload', label: 'UPLOAD' },
{ id: 'submit', label: 'SUBMIT' }];


const CHROME: Record<StepState, string> = {
  idle: 'border-line bg-surface text-faint',
  running: 'border-accent/50 bg-accent-soft text-accent',
  done: 'border-line bg-surface text-accent',
  error: 'border-danger/40 bg-danger-soft text-danger'
};

function Icon({ state }: {state: StepState;}) {
  if (state === 'running') return <LoaderIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />;
  if (state === 'done') return <CheckIcon className="h-3.5 w-3.5" aria-hidden />;
  if (state === 'error') return <TriangleAlertIcon className="h-3.5 w-3.5" aria-hidden />;
  return <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />;
}

export function StepIndicator({ state }: {state: Record<StepId, StepState>;}) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((s, i) =>
      <li key={s.id} className="flex items-center gap-1.5">
          <div
          className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 font-mono text-2xs uppercase tracking-wide transition-colors duration-200 ease-out ${CHROME[state[s.id]]}`}>
          
            <Icon state={state[s.id]} />
            {s.label}
          </div>
          {i < STEPS.length - 1 && <span className="text-faint" aria-hidden>→</span>}
        </li>
      )}
    </ol>);

}