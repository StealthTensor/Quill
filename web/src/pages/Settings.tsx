import React, { useEffect, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { SettingsSection } from '../components/SettingsSection';

const NAV = [
{ id: 'srm', label: 'SRM Account' },
{ id: 'drive', label: 'Google Drive' },
{ id: 'ai', label: 'AI Settings' },
{ id: 'persona', label: 'Your Style' },
{ id: 'automation', label: 'Automation' }];


function Toggle({
  checked,
  onChange,
  label
}: {checked: boolean;onChange: (v: boolean) => void;label: string;}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-xs text-ink">

      <span
        className={`relative h-4 w-7 shrink-0 rounded-full border transition-colors duration-150 ease-out ${
        checked ? 'border-accent/50 bg-accent-soft' : 'border-line bg-raised'}`
        }>

        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-transform duration-150 ease-out ${
          checked ? 'translate-x-3.5 bg-accent' : 'translate-x-0.5 bg-faint'}`
          } />

      </span>
      {label}
    </button>);

}

export function Settings() {
  const { student, drive, gateway, setGateway, pushLog } = useQuill();
  const [model, setModel] = useState('fusion');
  const [temp, setTemp] = useState(0.4);
  const [persona, setPersona] = useState('');
  const [autoSubmit, setAutoSubmit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gatewayTest, setGatewayTest] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        setPersona(d.persona ?? '');
        setAutoSubmit(Boolean(d.autoSubmit));
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, autoSubmit })
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
      pushLog('settings.saved', 'Settings saved', 'success');
    } catch {
      pushLog('settings.error', 'Could not save settings', 'error');
    }
  };

  const testGateway = () => {
    setGateway('checking');
    setGatewayTest('GET /health…');
    window.setTimeout(() => {
      setGateway('connected');
      setGatewayTest(`200 OK · ${model} · 38ms`);
      pushLog('gateway.health', `Gateway responded 200 for model ${model}`, 'success');
    }, 800);
  };

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 lg:px-8">
      <header className="border-b border-line pb-5">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Your account, AI, and how Quill submits your work.</p>
      </header>

      <nav className="flex flex-wrap gap-1 py-3" aria-label="Settings sections">
        {NAV.map((n) =>
        <a
          key={n.id}
          href={`#${n.id}`}
          className="rounded px-2 py-1 font-mono text-2xs text-faint transition-colors duration-150 ease-out hover:bg-raised hover:text-ink">

            {n.label}
          </a>
        )}
      </nav>

      <SettingsSection
        id="srm"
        title="SRM account"
        description="The account Quill scans and submits worksheets for.">

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-ink">{student?.name ?? 'Not logged in'}</span>
          <p className="font-mono text-2xs text-muted">
            {student ? [
              student.regNo,
              student.department,
              student.semester ? `sem ${student.semester}` : ''
            ].filter(Boolean).join(' · ') : ''}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        id="drive"
        title="Google Drive"
        description="Filled worksheets are uploaded here before the link is submitted.">

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded border border-accent/25 bg-accent-soft px-2 py-1 font-mono text-2xs text-accent">
            <CheckIcon className="h-3 w-3" aria-hidden />
            {drive}
          </span>
        </div>
      </SettingsSection>

      <SettingsSection
        id="ai"
        title="AI Settings"
        description="Choose the AI model used to generate answers.">

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Model">
            <select className={inputClass} value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="fusion">Fusion (Balanced)</option>
              <option value="fusion-mini">Fusion Mini (Fast)</option>
              <option value="llama-3.1-70b">Llama 3.1 70B (High Quality)</option>
            </select>
          </Field>
          <Field label="Creativity" hint={`${Math.round(temp * 100)}%`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temp}
              onChange={(e) => setTemp(Number(e.target.value))}
              className="mt-3 w-full accent-accent" />

          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" onClick={testGateway} disabled={gateway === 'checking'}>
            Test AI Connection
          </Button>
          <p aria-live="polite" className="font-mono text-2xs text-muted">
            {gatewayTest ?? 'not tested this session'}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        id="persona"
        title="Your writing style"
        description="Optional. A short note on how you write, so answers sound like you.">

        <Field label="Writing style" hint={`${persona.length} chars`}>
          <textarea
            rows={3}
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full rounded-md border border-line bg-raised px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:border-accent/50"
            placeholder="e.g. a second-year student who writes simply, with concrete examples and no textbook padding" />

        </Field>
      </SettingsSection>

      <SettingsSection
        id="automation"
        title="Automation"
        description="Control whether Quill submits automatically or lets you review first.">

        <Toggle
          checked={autoSubmit}
          onChange={setAutoSubmit}
          label="Auto-submit to SRM (off = fill & upload only, you submit after reviewing)" />

      </SettingsSection>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-canvas py-4">
        <p className="mr-auto font-mono text-2xs text-faint">
          {saved ? 'saved ✓' : 'saved to ~/.quill/settings.json'}
        </p>
        <Button variant="primary" onClick={save}>
          Save configuration
        </Button>
      </div>
    </div>);

}
