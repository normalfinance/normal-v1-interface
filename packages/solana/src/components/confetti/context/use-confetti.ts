'use client';

import { useContext } from 'react';

import { ConfettiContext } from './confetti-context';

// ----------------------------------------------------------------------

export function useConfetti() {
  const context = useContext(ConfettiContext);

  if (!context) throw new Error('useConfettiContext must be use inside ConfettiProvider');

  return context;
}
