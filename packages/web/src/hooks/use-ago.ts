import { useState, useEffect } from 'react';

export function useAgo(initialTimestamp: number) {
  const [elapsed, setElapsed] = useState(() => Date.now() - initialTimestamp);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - initialTimestamp);
    }, 1000);
    return () => clearInterval(interval);
  }, [initialTimestamp]);

  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}
