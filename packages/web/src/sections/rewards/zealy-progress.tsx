'use client';

import { useEffect } from 'react';

interface ZealyProgressProps {
  community: string;
  questId?: string;
  color?: string;
  theme?: 'dark' | 'light';
}

export function ZealyProgress({
  community,
  questId,
  color = '#0954A5',
  theme = 'dark',
}: ZealyProgressProps) {
  useEffect(() => {
    if (document.getElementById('zealy-embed')) return;
    const s = document.createElement('script');
    s.id = 'zealy-embed';
    s.src = 'https://zealy.io/embed.js';
    s.async = true;
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
  }, []);

  return (
    <div
      data-zealy-community={community}
      data-variant="inline"
      data-theme={theme}
      data-color={color}
      {...(questId ? { 'data-quest-id': questId } : {})}
      style={{ width: '100%' }}
    />
  );
}
