import React, { useState } from 'react';
import { CheckIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useQuill } from '../contexts/QuillContext';
import { Button } from '../components/ui/Button';
import { Field, inputClass } from '../components/ui/Field';
import { SettingsSection } from '../components/SettingsSection';
import type { Student } from '../types/quill';

const NAV = [
{ id: 'srm', label: 'SRM Account' },
{ id: 'drive', label: 'Google Drive' },
{ id: 'ai', label: 'AI Settings' },
{ id: 'students', label: 'Students' },
{ id: 'pipeline', label: 'Automation Settings' }];


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
  const { student, students: seedStudents, drive, gateway, setGateway, pushLog } = useQuill();
  const [roster, setRoster] = useState<Student[]>(seedStudents);
  const [model, setModel] = useState('fusion');
  const [temp, setTemp] = useState(0.4);
  const [autoSubmit, setAutoSubmit] = useState(true);
  const [retries, setRetries] = useState(2);
  const [parallel, setParallel] = useState(3);
  const [gatewayTest, setGatewayTest] = useState<string | null>(null);

  const testGateway = () => {
    setGateway('checking');
    setGatewayTest('GET /health…');
    window.setTimeout(() => {
      setGateway('connected');
      setGatewayTest(`200 OK · ${model} · 38ms`);
      pushLog('gateway.health', `Gateway responded 200 for model ${model}`, 'success');
    }, 800);
  };

  const updateStudent = (id: string, patch: Partial<Student>) =>
  setRoster((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-6 lg:px-8">
      <header className="border-b border-line pb-5">
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Everything the CLI reads from <span className="font-mono text-xs text-accent">~/.quill/config.toml</span>.
        </p>
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
        description="Credentials used for scan, submit and MCQ endpoints.">
        
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registration number">
            <input className={inputClass} defaultValue={student.regNo} />
          </Field>
          <Field label="Password">
            <input className={inputClass} type="password" defaultValue="••••••••••" />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm">Test connection</Button>
          <p className="font-mono text-2xs text-muted">
            {student.name} · {student.branch} · {student.section} · sem {student.semester}
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
          <Button size="sm">Reauthorize</Button>
        </div>
        <div className="mt-4 max-w-sm">
          <Field label="Upload folder" hint="drive.file scope">
            <select className={inputClass} defaultValue="/Quill/2026-odd">
              <option>/Quill/2026-odd</option>
              <option>/Quill/2026-even</option>
              <option>/My Drive/Worksheets</option>
            </select>
          </Field>
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
        id="students"
        title="Students"
        description="Each profile carries the persona used to write answers in that student's voice."
        aside={
        <Button
          size="sm"
          className="mt-3"
          onClick={() =>
          setRoster((prev) => [
          ...prev,
          {
            id: `stu-${prev.length + 1}-${Date.now()}`,
            name: '',
            regNo: '',
            branch: 'CSE — Core',
            section: '',
            department: 'Computing Technologies',
            semester: 4,
            persona: ''
          }]
          )
          }>
          
            <PlusIcon className="h-3.5 w-3.5" aria-hidden />
            Add student
          </Button>
        }>
        
        <ul className="space-y-3">
          {roster.map((s) =>
          <li key={s.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Name">
                  <input
                  className={inputClass}
                  value={s.name}
                  onChange={(e) => updateStudent(s.id, { name: e.target.value })}
                  placeholder="Full name" />
                
                </Field>
                <Field label="Reg no">
                  <input
                  className={inputClass}
                  value={s.regNo}
                  onChange={(e) => updateStudent(s.id, { regNo: e.target.value })}
                  placeholder="RA23…" />
                
                </Field>
                <Field label="Branch">
                  <input
                  className={inputClass}
                  value={s.branch}
                  onChange={(e) => updateStudent(s.id, { branch: e.target.value })} />
                
                </Field>
                <Field label="Section">
                  <input
                  className={inputClass}
                  value={s.section}
                  onChange={(e) => updateStudent(s.id, { section: e.target.value })} />
                
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Persona" hint={`${s.persona.length} chars`}>
                  <textarea
                  rows={2}
                  value={s.persona}
                  onChange={(e) => updateStudent(s.id, { persona: e.target.value })}
                  className="w-full rounded-md border border-line bg-raised px-3 py-2 font-mono text-xs leading-relaxed text-ink focus:border-accent/50"
                  placeholder="How this student writes…" />
                
                </Field>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                size="sm"
                variant="ghost"
                onClick={() => setRoster((prev) => prev.filter((x) => x.id !== s.id))}>
                
                  <Trash2Icon className="h-3 w-3" aria-hidden />
                  Remove
                </Button>
              </div>
            </li>
          )}
        </ul>
      </SettingsSection>

      <SettingsSection
        id="pipeline"
        title="Automation Settings"
        description="Configure how Quill handles submissions and errors.">
        
        <div className="space-y-4">
          <Toggle
            checked={autoSubmit}
            onChange={setAutoSubmit}
            label="Auto-submit to SRM (turn off to review before submitting)" />
          
          <div className="grid max-w-sm gap-4 sm:grid-cols-2">
            <Field label="Retry failed uploads">
              <input
                className={inputClass}
                type="number"
                min={0}
                max={5}
                value={retries}
                onChange={(e) => setRetries(Number(e.target.value))} />
              
            </Field>
          </div>
        </div>
      </SettingsSection>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-line bg-canvas py-4">
        <p className="mr-auto font-mono text-2xs text-faint">changes write to ~/.quill/config.toml</p>
        <Button variant="ghost">Discard</Button>
        <Button variant="primary" onClick={() => pushLog('config.saved', 'config.toml written', 'success')}>
          Save configuration
        </Button>
      </div>
    </div>);

}