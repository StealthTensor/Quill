import React, { useState } from 'react';
import { ChevronRightIcon } from 'lucide-react';
import type { LogEvent } from '../types/quill';
import { formatClock } from '../utils/sessions';

const LEVEL: Record<LogEvent['level'], string> = {
  info: 'text-info',
  success: 'text-accent',
  warn: 'text-warn',
  error: 'text-danger'
};

function Row({ event }: {event: LogEvent;}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-b border-line/60 last:border-0">
      <div className="flex items-start gap-3 px-4 py-1.5 font-mono text-2xs leading-5">
        <span className="shrink-0 text-faint">{formatClock(event.ts)}</span>
        <span className={`w-40 shrink-0 truncate ${LEVEL[event.level]}`}>{event.type}</span>
        <span className="min-w-0 flex-1 text-muted">{event.message}</span>
        {event.details &&
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 rounded text-faint transition-colors duration-150 ease-out hover:text-ink">
          
            <ChevronRightIcon
            className={`h-3.5 w-3.5 transition-transform duration-150 ease-out ${open ? 'rotate-90' : ''}`} />
          
            <span className="sr-only">Toggle details</span>
          </button>
        }
      </div>
      {open && event.details &&
      <pre className="mx-4 mb-2 overflow-x-auto rounded border border-line bg-canvas px-3 py-2 font-mono text-2xs leading-5 text-muted">
          {event.details}
        </pre>
      }
    </li>);

}

export function LogStream({ events, emptyText = 'No events yet.' }: {events: LogEvent[];emptyText?: string;}) {
  if (!events.length) {
    return <p className="px-4 py-6 font-mono text-2xs text-faint">{emptyText}</p>;
  }
  return (
    <ul className="q-scroll max-h-full overflow-y-auto">
      {events.map((e) =>
      <Row key={e.id} event={e} />
      )}
    </ul>);

}