'use client';

import { createContext } from 'react';

import type { ConfettiContextValue } from '../types';

// ----------------------------------------------------------------------

export const ConfettiContext = createContext<ConfettiContextValue | undefined>(undefined);
