import React from 'react';
import type { JobStatus, SloStatus } from '../../types/quill';
import { SLO_LABEL } from '../../utils/sessions';

const TONE = {
  neutral: 'bg-raised text-faint border-line',
  info: 'bg-info-soft text-info border-info/25',
  warn: 'bg-warn-soft text-warn border-warn/25',
  good: 'bg-accent-soft text-accent border-accent/25',
  bad: 'bg-danger-soft text-danger border-danger/25'
} as const;

type Tone = keyof typeof TONE;

const SLO_TONE: Record<SloStatus, Tone> = {
  not_started: 'neutral',
  pending_review: 'info',
  verified: 'good',
  resubmission: 'warn'
};

const JOB_TONE: Record<JobStatus, Tone> = {
  queued: 'neutral',
  generating: 'info',
  filling: 'info',
  uploading: 'info',
  submitting: 'info',
  done: 'good',
  failed: 'bad'
};

function Shell({ tone, children, pulse }: {tone: Tone;children: React.ReactNode;pulse?: boolean;}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-2xs uppercase tracking-wide ${TONE[tone]}`}>
      
      {pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {children}
    </span>);

}

export function SloBadge({ status }: {status: SloStatus;}) {
  return <Shell tone={SLO_TONE[status]}>{SLO_LABEL[status]}</Shell>;
}

export function JobBadge({ status }: {status: JobStatus;}) {
  const active = status !== 'queued' && status !== 'done' && status !== 'failed';
  return (
    <Shell tone={JOB_TONE[status]} pulse={active}>
      {status}
    </Shell>);

}

export function ScoreBadge({ score }: {score: number | null;}) {
  if (score === null) return <Shell tone="neutral">not attempted</Shell>;
  return <Shell tone={score >= 80 ? 'good' : score >= 60 ? 'warn' : 'bad'}>{score}%</Shell>;
}