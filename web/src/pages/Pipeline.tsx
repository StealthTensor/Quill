import React, { useState } from 'react';
import { PlayIcon, RotateCcwIcon, SquareIcon, Trash2Icon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { StepIndicator } from '../components/StepIndicator';
import { JobTable } from '../components/JobTable';
import { LogStream } from '../components/LogStream';
import { pendingSlos } from '../utils/sessions';

export function Pipeline() {
  const {
    courses,
    students,
    jobs,
    running,
    stepState,
    startPipeline,
    stopPipeline,
    retryJob,
    retryFailed,
    log,
    clearLog
  } = useQuill();

  const [selStudents, setSelStudents] = useState<string[]>([students[0].id]);
  const [selCourses, setSelCourses] = useState<string[]>(courses.map((c) => c.code));
  const [limit, setLimit] = useState(12);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
  set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const availableJobs = courses.
  filter((c) => selCourses.includes(c.code)).
  reduce((n, c) => n + pendingSlos(c).length, 0) * Math.max(selStudents.length, 0);

  const failed = jobs.filter((j) => j.status === 'failed').length;
  const done = jobs.filter((j) => j.status === 'done').length;

  const run = () =>
  startPipeline({ studentIds: selStudents, courseCodes: selCourses, limit });

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <aside className="shrink-0 border-b border-line bg-surface p-5 xl:w-72 xl:border-b-0 xl:border-r">
          <h2 className="font-mono text-2xs uppercase tracking-widest text-faint">scope</h2>

          <fieldset className="mt-4">
            <legend className="mb-2 text-2xs text-muted">Students</legend>
            <div className="space-y-1.5">
              {students.map((s) =>
              <label key={s.id} className="flex cursor-pointer items-center gap-2 text-xs text-ink">
                  <input
                  type="checkbox"
                  checked={selStudents.includes(s.id)}
                  onChange={() => toggle(selStudents, setSelStudents, s.id)}
                  className="h-3.5 w-3.5 rounded border-line bg-raised accent-accent" />
                
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto font-mono text-2xs text-faint">{s.section}</span>
                </label>
              )}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-2 text-2xs text-muted">Courses</legend>
            <div className="space-y-1.5">
              {courses.map((c) =>
              <label key={c.code} className="flex cursor-pointer items-center gap-2 text-xs text-ink">
                  <input
                  type="checkbox"
                  checked={selCourses.includes(c.code)}
                  onChange={() => toggle(selCourses, setSelCourses, c.code)}
                  className="h-3.5 w-3.5 rounded border-line bg-raised accent-accent" />
                
                  <span className="font-mono text-2xs">{c.code}</span>
                  <span className="ml-auto font-mono text-2xs text-faint">{pendingSlos(c).length}</span>
                </label>
              )}
            </div>
          </fieldset>

          <div className="mt-5">
            <label htmlFor="limit" className="mb-2 block text-2xs text-muted">
              How many to process at once
            </label>
            <input
              id="limit"
              type="range"
              min={1}
              max={40}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full accent-accent" />
            
            <p className="mt-1 font-mono text-2xs text-muted">
              {limit} items max · {availableJobs} total pending
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-line px-5 py-5 lg:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <StepIndicator state={stepState} />
              <div className="flex flex-wrap items-center gap-2">
                {running ?
                <Button variant="danger" onClick={stopPipeline}>
                    <SquareIcon className="h-3.5 w-3.5" aria-hidden />
                    Stop
                  </Button> :

                <Button variant="primary" onClick={run} disabled={!availableJobs}>
                    <PlayIcon className="h-4 w-4" aria-hidden />
                    Run {selCourses.length === courses.length ? 'all' : 'selected'}
                  </Button>
                }
                <Button onClick={retryFailed} disabled={!failed}>
                  <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden />
                  Retry failed{failed ? ` (${failed})` : ''}
                </Button>
              </div>
            </div>

            {jobs.length > 0 &&
            <p className="mt-4 font-mono text-2xs text-faint">
                {done}/{jobs.length} jobs done
                {failed ? ` · ${failed} failed` : ''} · {running ? 'running' : 'idle'}
              </p>
            }
          </div>

          <div className="min-h-0 flex-1">
            <JobTable jobs={jobs} onRetry={retryJob} />
          </div>
        </div>
      </div>

      <section className="shrink-0 border-t border-line bg-surface" aria-label="Live log">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="font-mono text-2xs uppercase tracking-widest text-faint">live log</h2>
          <Button size="sm" variant="ghost" onClick={clearLog}>
            <Trash2Icon className="h-3 w-3" aria-hidden />
            Clear
          </Button>
        </div>
        <div className="h-56">
          <LogStream events={log} emptyText="Log cleared." />
        </div>
      </section>
    </div>);

}