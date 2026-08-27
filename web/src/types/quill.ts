export type SloStatus = 'not_started' | 'pending_review' | 'verified' | 'resubmission';

export type ConnectionState = 'connected' | 'disconnected' | 'checking';

export interface McqOption {
  label: string;
  html: string;
}

export interface McqQuestion {
  id: string;
  html: string;
  options: McqOption[];
  suggested: number;
  confidence: number;
  correct: number;
}

export interface QaPair {
  question: string;
  answer: string;
}

export interface Session {
  number: number;
  unit: number;
  mcqScore: number | null;
  slo1: SloStatus;
  slo2: SloStatus;
  slo1Link: string | null;
  slo2Link: string | null;
  slo1Desc: string;
  slo2Desc: string;
  mcqs: McqQuestion[];
  shortQuestions: QaPair[];
  longQuestions: QaPair[];
}

export interface Course {
  code: string;
  name: string;
  faculty: string;
  batch: string;
  semester: number;
  sessions: Session[];
}

export interface Student {
  id: string;
  name: string;
  regNo: string;
  branch: string;
  section: string;
  department: string;
  semester: number;
  persona: string;
}

export type LogLevel = 'info' | 'success' | 'warn' | 'error';

export interface LogEvent {
  id: string;
  ts: number;
  type: string;
  message: string;
  level: LogLevel;
  details?: string;
}

export type JobStatus =
'queued' |
'generating' |
'filling' |
'uploading' |
'submitting' |
'done' |
'failed';

export interface Job {
  id: string;
  studentName: string;
  courseCode: string;
  session: number;
  slo: 1 | 2;
  status: JobStatus;
  error: string | null;
  docx: string | null;
  driveUrl: string | null;
  elapsedMs: number;
}

export type StepId = 'scan' | 'generate' | 'fill' | 'upload' | 'submit';
export type StepState = 'idle' | 'running' | 'done' | 'error';