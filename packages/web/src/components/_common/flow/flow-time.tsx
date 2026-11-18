'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Time on the journey: how long a finished step took ("6s", "2 min 10s") and
// a running clock on the step under way ("0:42"). Numbers changing is the one
// movement the app allows; nothing else here moves.
// ---------------------------------------------------------------------------

/** How long something took, in words people read at a glance. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${Math.max(seconds, 1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 10 && rest) return `${minutes} min ${rest}s`;
  return `${minutes} min`;
}

/** A clock: 0:42, 12:05, 1:02:10. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Time since `since`, ticking once a second while on screen. */
export function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{formatClock(now - since)}</span>;
}
