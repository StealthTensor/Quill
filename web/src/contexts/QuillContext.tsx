import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ConnectionState,
  Course,
  Job,
  JobStatus,
  LogEvent,
  LogLevel,
  StepId,
  StepState,
  Student } from
'../types/quill';

export interface PipelineScope {
  studentIds: string[];
  courseCodes: string[];
  limit: number;
}

interface QuillValue {
  authed: boolean;
  signIn: (regNo: string, password: string) => Promise<boolean>;
  signOut: () => void;
  student: Student | null;
  students: Student[];
  courses: Course[];
  srm: ConnectionState;
  drive: ConnectionState;
  gateway: ConnectionState;
  setSrm: (s: ConnectionState) => void;
  setDrive: (s: ConnectionState) => void;
  setGateway: (s: ConnectionState) => void;
  log: LogEvent[];
  pushLog: (type: string, message: string, level?: LogLevel, details?: string) => void;
  clearLog: () => void;
  jobs: Job[];
  running: boolean;
  stepState: Record<StepId, StepState>;
  startPipeline: (scope: PipelineScope) => void;
  startTargeted: (courseCode: string, session: number, slo: 1 | 2) => void;
  stopPipeline: () => void;
  retryJob: (id: string) => void;
  retryFailed: () => void;
  scanning: boolean;
  scanNow: () => void;
  refreshState: () => Promise<void>;
  submitMcqScore: (code: string, session: number, score: number) => void;
}

const QuillContext = createContext<QuillValue | null>(null);

const nextStatus: Record<JobStatus, JobStatus> = {
  queued: 'generating',
  generating: 'filling',
  filling: 'uploading',
  uploading: 'submitting',
  submitting: 'done',
  done: 'done',
  failed: 'failed'
};

const STAGE_EVENT: Partial<Record<JobStatus, {type: string;text: string;}>> = {
  generating: { type: 'request.sent', text: 'prompt built and sent to gateway' },
  filling: { type: 'document.written', text: 'slots filled into worksheet template' },
  uploading: { type: 'drive.upload', text: 'uploading .docx to Drive folder /Quill/2026-odd' },
  submitting: { type: 'submit.sent', text: 'POST /submitlink with Drive link' },
  done: { type: 'submit.ok', text: 'accepted by SRM — status now pending review' }
};

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${seq++}`;

export function QuillProvider({
  children,
  startSignedIn
}: {children: React.ReactNode;startSignedIn: boolean;}) {
  const [authed, setAuthed] = useState(startSignedIn);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [srm, setSrm] = useState<ConnectionState>('disconnected');
  const [drive, setDrive] = useState<ConnectionState>('disconnected');
  const [gateway, setGateway] = useState<ConnectionState>('disconnected');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [running, setRunning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [log, setLog] = useState<LogEvent[]>([]);

  const refreshState = useCallback(async () => {
    const res = await fetch('/api/state');
    const data = await res.json();
    setCourses(data.courses || []);
    if (data.students?.length) {
      setStudents(data.students);
    }
    setSrm(data.srm ?? 'disconnected');
    setDrive(data.drive ?? 'disconnected');
    setGateway(data.gateway ?? 'disconnected');
  }, []);

  useEffect(() => {
    refreshState().catch(err => console.error("Failed to fetch state", err));
  }, [refreshState]);

  const pushLog = useCallback(
    (type: string, message: string, level: LogLevel = 'info', details?: string) => {
      setLog((prev) => [{ id: uid('ev'), ts: Date.now(), type, message, level, details }, ...prev].slice(0, 300));
    },
    []
  );

  const clearLog = useCallback(() => setLog([]), []);

  const signIn = useCallback(async (regNo: string, password: string) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: regNo, password })
      });
      const data = await res.json();
      if (data.ok) {
        setAuthed(true);
        setSrm('connected');
        // Fetch fresh state after login
        const stateRes = await fetch('/api/state');
        const stateData = await stateRes.json();
        setCourses(stateData.courses || []);
        setStudents(stateData.students || []);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, []);

  const markSubmitted = useCallback((code: string, session: number, slo: 1 | 2) => {
    setCourses((prev) =>
    prev.map((c) =>
    c.code !== code ?
    c :
    {
      ...c,
      sessions: c.sessions.map((s) =>
      s.number !== session ?
      s :
      slo === 1 ?
      {
        ...s,
        slo1: 'pending_review',
        slo1Link: `https://drive.google.com/file/d/${code.toLowerCase()}-${session}-slo1/view`
      } :
      {
        ...s,
        slo2: 'pending_review',
        slo2Link: `https://drive.google.com/file/d/${code.toLowerCase()}-${session}-slo2/view`
      }
      )
    }
    )
    );
  }, []);

  // The server owns which worksheets get processed (it scans SRM). The job table
  // is built live from the SSE stream so it always mirrors real work.
  const scopeRef = useRef<PipelineScope>({ studentIds: [], courseCodes: [], limit: 18 });

  useEffect(() => {
    if (!running) return;

    const sc = scopeRef.current;
    const qs = new URLSearchParams({ limit: String(sc.limit ?? 18) });
    if (sc.courseCodes?.length) qs.set('courses', sc.courseCodes.join(','));
    const es = new EventSource(`/api/run/stream?${qs.toString()}`);

    // Build the job table live from the stream so it always mirrors real work.
    // Events look like: "[21LEM202T] Session 103 SLO 1 — generating answers..."
    const applyToJob = (msg: string) => {
      const m = msg.match(/\[(\w+)\]\s*Session\s*(\d+)\s*SLO\s*(\d)/);
      if (!m) return;
      const code = m[1], sess = Number(m[2]), slo = Number(m[3]);
      let status: JobStatus | null = null;
      if (/^Submitting:/i.test(msg)) status = 'queued';
      else if (/downloading worksheet|generating answers/i.test(msg)) status = 'generating';
      else if (/filled \d+\/\d+ slots/i.test(msg)) status = 'filling';
      else if (/uploading to Google Drive/i.test(msg)) status = 'uploading';
      else if (/submitting link/i.test(msg)) status = 'submitting';
      else if (/✅ submitted|saved to Review/i.test(msg)) status = 'done';
      else if (/failed|crashed|rejected|unavailable|skipping/i.test(msg)) status = 'failed';
      if (!status) return;
      setJobs((prev) => {
        const i = prev.findIndex((j) => j.courseCode === code && j.session === sess && j.slo === slo);
        if (i < 0) {
          return [...prev, {
            id: uid('job'),
            studentName: students[0]?.name ?? 'Student',
            courseCode: code, session: sess, slo: (slo as 1 | 2),
            status, error: null, docx: null, driveUrl: null, elapsedMs: 0
          }];
        }
        return prev.map((j, k) => k === i ? { ...j, status } : j);
      });
    };

    const handleEvent = (level: LogLevel, msg: string) => {
        pushLog('pipeline.event', msg, level);
        applyToJob(msg);
    };

    es.addEventListener('start', (e) => handleEvent('info', e.data));
    es.addEventListener('progress', (e) => handleEvent('info', e.data));
    es.addEventListener('success', (e) => handleEvent('success', e.data));
    es.addEventListener('error', (e) => handleEvent('error', e.data));
    es.addEventListener('skip', (e) => handleEvent('info', e.data));

    // Tick elapsed time on whatever job is actively processing, so the row
    // visibly moves even while a slow model is still generating.
    const active: JobStatus[] = ['generating', 'filling', 'uploading', 'submitting'];
    const ticker = window.setInterval(() => {
      setJobs((prev) => prev.map((j) => active.includes(j.status) ? { ...j, elapsedMs: j.elapsedMs + 1000 } : j));
    }, 1000);

    es.addEventListener('end', (e) => {
        handleEvent('success', e.data);
        setRunning(false);
        es.close();

        // Refresh state
        fetch('/api/state').then(r => r.json()).then(data => {
            setCourses(data.courses || []);
        });
    });

    es.onerror = () => {
        handleEvent('error', 'Connection to pipeline lost');
        setRunning(false);
        es.close();
    };

    return () => {
      window.clearInterval(ticker);
      es.close();
    };
  }, [running, pushLog]);

  const startPipeline = useCallback(
    (scope: PipelineScope) => {
      scopeRef.current = scope;
      setJobs([]);
      pushLog('pipeline.start', 'Starting pipeline…', 'info');
      setRunning(true);
    },
    [pushLog]
  );

  const startTargeted = useCallback(
    (courseCode: string, session: number, slo: 1 | 2) => {
      // The server scans this course's pending work; the clicked SLO is included.
      scopeRef.current = { studentIds: [], courseCodes: [courseCode], limit: 18 };
      setJobs([]);
      pushLog('pipeline.start', `Running ${courseCode} pending…`, 'info');
      setRunning(true);
    },
    [pushLog]
  );

  const stopPipeline = useCallback(() => {
    setRunning(false);
    pushLog('pipeline.stopped', 'Pipeline stopped by operator', 'warn');
  }, [pushLog]);

  const retryJob = useCallback(
    (id: string) => {
      setJobs((prev) =>
      prev.map((j) => j.id === id ? { ...j, status: 'uploading', error: null } : j)
      );
      pushLog('job.retry', `Retrying job ${id}`, 'info');
      setRunning(true);
    },
    [pushLog]
  );

  const retryFailed = useCallback(() => {
    setJobs((prev) => prev.map((j) => j.status === 'failed' ? { ...j, status: 'uploading', error: null } : j));
    pushLog('job.retry', 'Retrying all failed jobs', 'info');
    setRunning(true);
  }, [pushLog]);

  const scanNow = useCallback(async () => {
    setScanning(true);
    pushLog('scan.start', 'Re-fetching course data from SRM…', 'info');
    try {
      await refreshState();
      pushLog('scan.complete', 'Worksheets refreshed from SRM portal', 'success');
    } catch {
      pushLog('scan.error', 'Scan failed — could not reach SRM portal', 'error');
    } finally {
      setScanning(false);
    }
  }, [refreshState, pushLog]);

  const submitMcqScore = useCallback(
    (code: string, session: number, score: number) => {
      setCourses((prev) =>
      prev.map((c) =>
      c.code !== code ?
      c :
      { ...c, sessions: c.sessions.map((s) => s.number === session ? { ...s, mcqScore: score } : s) }
      )
      );
      pushLog('mcq.submitted', `${code}/${session} scored ${score}%`, 'success');
    },
    [pushLog]
  );

  const stepState = useMemo<Record<StepId, StepState>>(() => {
    const has = (s: JobStatus) => jobs.some((j) => j.status === s);
    const anyFailed = jobs.some((j) => j.status === 'failed');
    const allDone = jobs.length > 0 && jobs.every((j) => j.status === 'done' || j.status === 'failed');
    const reached = (stages: JobStatus[]) => jobs.some((j) => stages.includes(j.status));
    const past = (stage: JobStatus) => {
      const order: JobStatus[] = ['queued', 'generating', 'filling', 'uploading', 'submitting', 'done'];
      const at = order.indexOf(stage);
      return jobs.some((j) => order.indexOf(j.status) > at || j.status === 'done');
    };
    if (!jobs.length) return { scan: 'idle', generate: 'idle', fill: 'idle', upload: 'idle', submit: 'idle' };
    return {
      scan: 'done',
      generate: has('generating') ? 'running' : past('generating') ? 'done' : 'idle',
      fill: has('filling') ? 'running' : past('filling') ? 'done' : 'idle',
      upload: has('uploading') ? 'running' : anyFailed ? 'error' : past('uploading') ? 'done' : 'idle',
      submit: has('submitting') ? 'running' : allDone && reached(['done']) ? 'done' : 'idle'
    };
  }, [jobs]);

  const value: QuillValue = {
    authed,
    signIn,
    signOut: () => { setAuthed(false); setSrm('disconnected'); setCourses([]); setStudents([]); },
    student: students[0] ?? null,
    students,
    courses,
    srm,
    drive,
    gateway,
    setSrm,
    setDrive,
    setGateway,
    log,
    pushLog,
    clearLog,
    jobs,
    running,
    stepState,
    startPipeline,
    startTargeted,
    stopPipeline,
    retryJob,
    retryFailed,
    scanning,
    scanNow,
    refreshState,
    submitMcqScore
  };

  return <QuillContext.Provider value={value}>{children}</QuillContext.Provider>;
}

export function useQuill(): QuillValue {
  const ctx = useContext(QuillContext);
  if (!ctx) throw new Error('useQuill must be used inside QuillProvider');
  return ctx;
}