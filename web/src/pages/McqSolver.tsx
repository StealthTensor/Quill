import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2Icon, SparklesIcon, TriangleAlertIcon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { ScoreBadge } from '../components/ui/StatusBadge';

type Submit = {ok: boolean;message: string;} | null;

export function McqSolver() {
  const { courseCode, session } = useParams<{courseCode: string;session: string;}>();
  const { courses, submitMcqScore, pushLog } = useQuill();
  const course = courses.find((c) => c.code === courseCode);
  const sess = course?.sessions.find((s) => s.number === Number(session));

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [solved, setSolved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Submit>(null);

  const score = useMemo(() => {
    if (!sess) return { correct: 0, pct: 0, total: 5 };
    const correct = sess.mcqs.filter((q) => answers[q.id] === q.correct).length;
    return {
      correct,
      pct: Math.round(correct / sess.mcqs.length * 100),
      total: sess.mcqs.length
    };
  }, [sess, answers]);

  if (!course || !sess) {
    return (
      <div className="px-8 py-16">
        <h1 className="text-sm font-semibold text-ink">Session not found</h1>
        <Link to="/" className="mt-1 block text-sm text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>);

  }

  const autoSolve = () => {
    const next: Record<string, number> = {};
    sess.mcqs.forEach((q) => {
      next[q.id] = q.suggested;
    });
    setAnswers(next);
    setSolved(true);
    pushLog('mcq.solved', `${course.code}/${sess.number} — 5 answers proposed by gateway`, 'info', 'model: fusion\ntemperature: 0.2');
  };

  const submit = () => {
    setSubmitting(true);
    window.setTimeout(() => {
      setSubmitting(false);
      submitMcqScore(course.code, sess.number, score.pct);
      setResult({ ok: true, message: `SRM accepted score: ${score.pct}% (attempt recorded)` });
    }, 900);
  };

  const answeredAll = sess.mcqs.every((q) => answers[q.id] !== undefined);

  return (
    <div className="mx-auto max-w-4xl px-5 py-6 lg:px-8">
      <header className="border-b border-line pb-5">
        <p className="font-mono text-2xs text-faint">
          <Link to={`/courses/${course.code}`} className="transition-colors duration-150 ease-out hover:text-ink">
            {course.code}
          </Link>{' '}
          / session {sess.number} / mcq
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink">
              Session {sess.number} · Unit {sess.unit}
            </h1>
            <p className="mt-1 font-mono text-2xs text-muted">
              {course.name} · {course.faculty}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-mono text-2xs uppercase tracking-wide text-faint">previous</p>
              <div className="mt-1">
                <ScoreBadge score={sess.mcqScore} />
              </div>
            </div>
            <Button variant="primary" onClick={autoSolve}>
              <SparklesIcon className="h-4 w-4" aria-hidden />
              Auto-solve with AI
            </Button>
          </div>
        </div>
      </header>

      <ol className="divide-y divide-line">
        {sess.mcqs.map((q, i) => {
          const picked = answers[q.id];
          return (
            <li key={q.id} className="py-5">
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-2xs text-faint">Q{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className="q-html text-sm leading-relaxed text-ink"
                    dangerouslySetInnerHTML={{ __html: q.html }} />
                  

                  <fieldset className="mt-3 space-y-1.5">
                    <legend className="sr-only">Options for question {i + 1}</legend>
                    {q.options.map((o, j) => {
                      const isPick = picked === j;
                      const isSuggested = solved && q.suggested === j;
                      return (
                        <label
                          key={o.label}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition-colors duration-150 ease-out ${
                          isPick ?
                          'border-accent/50 bg-accent-soft' :
                          isSuggested ?
                          'border-accent/25 bg-raised' :
                          'border-line bg-surface hover:border-line-strong'}`
                          }>
                          
                          <input
                            type="radio"
                            name={q.id}
                            checked={isPick}
                            onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: j }))}
                            className="mt-0.5 h-3.5 w-3.5 accent-accent" />
                          
                          <span className="font-mono text-2xs text-faint">{o.label}</span>
                          <span
                            className="min-w-0 flex-1 text-xs leading-relaxed text-ink"
                            dangerouslySetInnerHTML={{ __html: o.html }} />
                          
                          {isSuggested &&
                          <span className="shrink-0 font-mono text-2xs text-accent">
                              ai · {Math.round(q.confidence * 100)}%
                            </span>
                          }
                        </label>);

                    })}
                  </fieldset>

                  {solved && q.confidence < 0.7 &&
                  <p className="mt-2 flex items-center gap-1.5 font-mono text-2xs text-warn">
                      <TriangleAlertIcon className="h-3 w-3" aria-hidden />
                      low confidence — worth overriding manually
                    </p>
                  }
                </div>
              </div>
            </li>);

        })}
      </ol>

      <div className="sticky bottom-0 flex flex-col gap-3 border-t border-line bg-canvas py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-sm text-ink">
            {score.correct}/{score.total} correct = <span className="text-accent">{score.pct}%</span>
          </p>
          <p className="mt-0.5 font-mono text-2xs text-faint">
            {answeredAll ? 'all questions answered' : 'score preview — answer all 5 to submit'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {result &&
          <p
            className={`flex items-center gap-1.5 font-mono text-2xs ${result.ok ? 'text-accent' : 'text-danger'}`}
            aria-live="polite">
            
              <CheckCircle2Icon className="h-3.5 w-3.5" aria-hidden />
              {result.message}
            </p>
          }
          <Button variant="primary" onClick={submit} disabled={!answeredAll || submitting}>
            {submitting ? 'Submitting…' : 'Submit to SRM'}
          </Button>
        </div>
      </div>
    </div>);

}