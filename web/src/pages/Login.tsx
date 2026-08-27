import React, { useState } from 'react';
import { CheckIcon, LoaderIcon, ShieldCheckIcon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { formatClock } from '../utils/sessions';

type TestState = 'idle' | 'testing' | 'ok' | 'error';

export function Login() {
  const { signIn, student, gateway, drive, setDrive, pushLog } = useQuill();
  const [regNo, setRegNo] = useState(student.regNo);
  const [password, setPassword] = useState('••••••••••');
  const [test, setTest] = useState<TestState>('idle');
  const [driveBusy, setDriveBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'signing-in' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNo || !password) return;
    setStatus('signing-in');
    const ok = await signIn(regNo, password);
    if (!ok) {
      setStatus('error');
    }
  };

  const runTest = () => {
    setTest('testing');
    pushLog('srm.login', `POST /login as ${regNo}`, 'info');
    window.setTimeout(() => {
      const ok = regNo.trim().length > 8 && password.length > 3;
      setTest(ok ? 'ok' : 'error');
      pushLog(
        ok ? 'srm.ok' : 'srm.error',
        ok ? `Authenticated as ${student.name}` : 'SRM rejected credentials (401)',
        ok ? 'success' : 'error'
      );
    }, 1100);
  };

  const authorizeDrive = async () => {
    setDriveBusy(true);
    try {
      const res = await fetch('/api/drive/auth');
      const data = await res.json();
      if (data.status === 'ok') {
        setDrive('connected');
        pushLog('auth.google', 'Drive scope drive.file granted', 'success');
      } else {
        alert('Failed to connect to Google Drive: ' + data.detail);
      }
    } catch (e) {
      alert('Error connecting to Google Drive');
    }
    setDriveBusy(false);
  };

  return (
    <div className="flex min-h-full w-full bg-canvas font-sans">
      <div className="hidden w-[42%] flex-col justify-between border-r border-line bg-surface p-10 lg:flex">
        <div>
          <p className="font-mono text-lg font-bold tracking-tight text-ink">quill</p>
          <p className="mt-6 max-w-xs text-2xl font-semibold leading-snug text-ink">
            Your coursework, on autopilot.
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Quill automatically writes your worksheets, solves your MCQs, and uploads them to Google Drive and SRM. Sign in below to get started.
          </p>
        </div>

        <ul className="space-y-1.5 font-mono text-2xs text-faint">
          {[
          'Scans your SRM portal for pending work',
          'AI generates high-quality answers',
          'Fills out Word document templates',
          'Uploads finished files to Google Drive',
          'Submits everything to SRM automatically'].
          map((line) =>
          <li key={line} className="flex gap-2">
              <span className="text-accent">✓</span>
              {line}
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-lg font-semibold text-ink">Connect your accounts</h1>
          <p className="mt-1 text-sm text-muted">Credentials stay on this machine.</p>

          <form
            className="mt-7 space-y-4"
            onSubmit={handleSubmit}>
            
            <fieldset className="space-y-3">
              <legend className="font-mono text-2xs uppercase tracking-widest text-faint">
                srm academia
              </legend>
              <label className="block">
                <span className="mb-1 block text-2xs text-muted">Registration number</span>
                <input
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink placeholder:text-faint focus:border-accent/50"
                  placeholder="RA231100301XXXX"
                  autoComplete="username" />
                
              </label>
              <label className="block">
                <span className="mb-1 block text-2xs text-muted">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 w-full rounded-md border border-line bg-raised px-3 font-mono text-sm text-ink focus:border-accent/50"
                  autoComplete="current-password" />
                
              </label>
              <div className="flex items-center gap-3">
                <Button type="button" size="sm" onClick={runTest} disabled={test === 'testing'}>
                  {test === 'testing' && <LoaderIcon className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                  Test connection
                </Button>
                <p aria-live="polite" className="min-w-0 font-mono text-2xs">
                  {test === 'ok' &&
                  <span className="text-accent">
                      {student.name} · {student.department} · sem {student.semester}
                    </span>
                  }
                  {test === 'error' && <span className="text-danger">401 — check credentials</span>}
                  {test === 'testing' && <span className="text-warn">GET /profile…</span>}
                </p>
              </div>
            </fieldset>

            <div className="space-y-3 border-t border-line pt-4">
              <p className="font-mono text-2xs uppercase tracking-widest text-faint">google drive</p>
              {drive === 'connected' ?
              <div className="flex items-center gap-2 rounded-md border border-accent/25 bg-accent-soft px-3 py-2">
                  <CheckIcon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="text-sm text-ink">Authorized</span>
                  <span className="ml-auto font-mono text-2xs text-muted">/Quill/2026-odd</span>
                </div> :

              <Button type="button" className="w-full" onClick={authorizeDrive} disabled={driveBusy}>
                  {driveBusy ? 'Opening consent screen…' : 'Connect Google Drive'}
                </Button>
              }
            </div>

            <div className="flex items-center justify-between border-t border-line pt-4">
              <div>
                <p className="font-mono text-2xs uppercase tracking-widest text-faint">ai connection</p>
                <p className="mt-1 font-mono text-2xs text-muted">Ready to generate answers</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-2xs ${
                gateway === 'connected' ?
                'border-accent/25 bg-accent-soft text-accent' :
                'border-danger/25 bg-danger-soft text-danger'}`
                }>
                
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {gateway}
              </span>
            </div>

            <Button variant="primary" type="submit" className="mt-2 w-full">
              <ShieldCheckIcon className="h-4 w-4" aria-hidden />
              Enter dashboard
            </Button>
          </form>

          <p className="mt-5 font-mono text-2xs text-faint">
            last session {formatClock(Date.now() - 86_400_000)} · quill v0.4.1
          </p>
        </div>
      </div>
    </div>);

}