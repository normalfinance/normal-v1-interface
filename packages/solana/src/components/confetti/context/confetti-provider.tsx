'use client';

import { useMemo, useState, useCallback } from 'react';
import Confetti from 'react-confetti';

import { ConfettiProviderProps, ConfettiConfig } from '../types';
import { ConfettiContext } from './confetti-context';

// ----------------------------------------------------------------------

export function ConfettiProvider({ defaultConfig, children }: ConfettiProviderProps) {
  const [confettiConfig, setConfettiConfig] = useState<ConfettiConfig>(defaultConfig);
  const [isConfettiShowing, setIsConfettiShowing] = useState(false);

  /**
   * @params duration - time in milliseconds
   */
  const showConfetti = useCallback((config?: ConfettiConfig) => {
    if (config) setConfettiConfig(config);
    setIsConfettiShowing(true);

    // Stop confetti after config.duration seconds
    setTimeout(() => {
      setIsConfettiShowing(false);
    }, confettiConfig.duration);
  }, []);

  const memoizedValue = useMemo(
    () => ({
      confettiConfig,
      isConfettiShowing,
      showConfetti,
    }),
    [showConfetti]
  );

  return (
    <ConfettiContext.Provider value={memoizedValue}>
      {isConfettiShowing && <Confetti onConfettiComplete={confettiConfig.onConfettiComplete} />}
      {children}
    </ConfettiContext.Provider>
  );
}
