import type { Shadows } from '@mui/material/styles';

import type { ThemeColorScheme } from '../types';

// ----------------------------------------------------------------------

// The design is flat (DESIGN.md): every MUI elevation resolves to no shadow.
const flatShadows = Array(25).fill('none') as Shadows;

export const shadows: Record<ThemeColorScheme, Shadows> = {
  light: flatShadows,
  dark: flatShadows,
};
