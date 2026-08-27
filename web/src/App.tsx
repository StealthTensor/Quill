import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QuillProvider, useQuill } from './contexts/QuillContext';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CourseDetail } from './pages/CourseDetail';
import { Pipeline } from './pages/Pipeline';
import { McqSolver } from './pages/McqSolver';
import { Settings } from './pages/Settings';
import { Reference } from './pages/Reference';

function Routed() {
  const { authed } = useQuill();

  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>);

  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route
        path="*"
        element={
        <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses/:courseCode" element={<CourseDetail />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/mcq/:courseCode/:session" element={<McqSolver />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/reference" element={<Reference />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        } />
      
    </Routes>);

}

export function App({ startSignedIn = false }: {startSignedIn?: boolean;}) {
  return (
    <div className="h-full w-full bg-canvas">
      <BrowserRouter>
        <QuillProvider startSignedIn={startSignedIn}>
          <Routed />
        </QuillProvider>
      </BrowserRouter>
    </div>);

}