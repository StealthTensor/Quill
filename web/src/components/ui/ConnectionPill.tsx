import React from 'react';
import type { ConnectionState } from '../../types/quill';

const DOT: Record<ConnectionState, string> = {
  connected: 'bg-accent',
  disconnected: 'bg-danger',
  checking: 'bg-warn animate-pulse'
};

const TEXT: Record<ConnectionState, string> = {
  connected: 'text-muted',
  disconnected: 'text-danger',
  checking: 'text-warn'
};

export function ConnectionPill({
  label,
  detail,
  state




}: {label: string;detail?: string;state: ConnectionState;}) {
  return (
    <div className="flex items-center gap-2 font-mono text-2xs">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[state]}`} aria-hidden />
      <span className="text-faint">{label}</span>
      <span className={`truncate ${TEXT[state]}`}>{detail ?? state}</span>
    </div>);

}