import React, { useState } from 'react';
import { StarIcon, GithubIcon } from 'lucide-react';

interface StarGateProps {
  onVerified: () => void;
  hoursUsed?: number;
}

export function StarGateModal({ onVerified, hoursUsed }: StarGateProps) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!username.trim()) {
      setError('Enter your GitHub username');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const res = await fetch('/api/stargate/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (data.allowed) {
        onVerified();
      } else {
        setError("Couldn't find your star — make sure you've starred the repo and entered your exact GitHub username.");
      }
    } catch {
      setError('Network error — try again');
    }
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
            <StarIcon className="h-5 w-5 text-accent" />
          </span>
          <div>
            <p className="font-semibold text-ink">Quill is free — forever.</p>
            <p className="text-sm text-muted">One small ask: star the repo on GitHub.</p>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-muted">
          {hoursUsed
            ? `You've been using Quill for ${hoursUsed}+ hours.`
            : "You've been using Quill for 2 days."}{' '}
          Starring the repo takes 3 seconds and helps other students discover this tool.
        </p>

        {/* Star button */}
        <a
          href="https://github.com/StealthTensor/Quill"
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent transition hover:bg-accent/20"
        >
          <GithubIcon className="h-4 w-4" />
          Star on GitHub →
        </a>

        {/* Verify */}
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-2 text-xs text-muted">Already starred? Enter your GitHub username to verify:</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="your-github-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              className="flex-1 rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <button
              onClick={handleCheck}
              disabled={checking}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-canvas transition hover:opacity-90 disabled:opacity-50"
            >
              {checking ? '...' : 'Verify'}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      </div>
    </div>
  );
}
