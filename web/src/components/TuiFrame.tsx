import React from 'react';

export function TuiFrame({
  command,
  children



}: {command: string;children: React.ReactNode;}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-canvas">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <span className="flex gap-1" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
          <span className="h-2 w-2 rounded-full bg-line-strong" />
        </span>
        <span className="font-mono text-2xs text-muted">
          <span className="text-accent">$</span> {command}
        </span>
      </div>
      <div className="q-scroll overflow-x-auto p-4">
        <pre className="min-w-max font-mono text-[11px] leading-[1.6] text-muted">{children}</pre>
      </div>
    </div>);

}