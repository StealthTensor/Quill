import React from 'react';
import { DownloadIcon, ExternalLinkIcon, RotateCcwIcon } from 'lucide-react';
import type { Job } from '../types/quill';
import { JobBadge } from './ui/StatusBadge';
import { Button } from './ui/Button';
import { formatElapsed } from '../utils/sessions';

export function JobTable({ jobs, onRetry }: {jobs: Job[];onRetry: (id: string) => void;}) {
  if (!jobs.length) {
    return (
      <p className="px-4 py-10 text-center font-mono text-2xs text-faint">
        No jobs queued. Choose a scope and press Run.
      </p>);

  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {['Student', 'Target', 'Status', 'Output', 'Drive', 'Elapsed', ''].map((h) =>
            <th
              key={h}
              scope="col"
              className="px-2 py-2 font-mono text-2xs font-medium uppercase tracking-wide text-faint first:pl-4 last:pr-4">
              
                {h}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) =>
          <tr key={j.id} className="border-b border-line/60 align-top">
              <td className="py-2 pl-4 pr-2 text-xs text-ink">{j.studentName}</td>
              <td className="px-2 py-2 font-mono text-2xs text-muted">
                {j.courseCode}/{j.session} · SLO {j.slo}
              </td>
              <td className="px-2 py-2">
                <JobBadge status={j.status} />
                {j.error && <p className="mt-1 max-w-xs font-mono text-2xs text-danger">{j.error}</p>}
              </td>
              <td className="px-2 py-2">
                {j.docx ?
              <a
                href={`#download-${j.id}`}
                className="inline-flex items-center gap-1 font-mono text-2xs text-info transition-colors duration-150 ease-out hover:text-ink">
                
                    <DownloadIcon className="h-3 w-3" aria-hidden />
                    {j.docx}
                  </a> :

              <span className="font-mono text-2xs text-faint">—</span>
              }
              </td>
              <td className="px-2 py-2">
                {j.driveUrl ?
              <a
                href={j.driveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-2xs text-info transition-colors duration-150 ease-out hover:text-ink">
                
                    open
                    <ExternalLinkIcon className="h-3 w-3" aria-hidden />
                  </a> :

              <span className="font-mono text-2xs text-faint">—</span>
              }
              </td>
              <td className="px-2 py-2 font-mono text-2xs text-muted">{formatElapsed(j.elapsedMs)}</td>
              <td className="px-2 py-2 pr-4 text-right">
                {j.status === 'failed' &&
              <Button size="sm" variant="danger" onClick={() => onRetry(j.id)}>
                    <RotateCcwIcon className="h-3 w-3" aria-hidden />
                    Retry
                  </Button>
              }
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}