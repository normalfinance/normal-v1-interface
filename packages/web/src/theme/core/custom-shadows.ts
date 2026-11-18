import type { ThemeColorScheme } from '../types';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */

export interface CustomShadows {
  z1?: string;
  z4?: string;
  z8?: string;
  z12?: string;
  z16?: string;
  z20?: string;
  z24?: string;
  primary?: string;
  secondary?: string;
  info?: string;
  success?: string;
  warning?: string;
  error?: string;
  card?: string;
  dialog?: string;
  dropdown?: string;
}

// ----------------------------------------------------------------------

// The design is flat (DESIGN.md): depth comes from hairlines and surface
// colour. The tokens stay so MUI and template code keep resolving, but every
// one of them is 'none'.
export function createShadowColor(_colorChannel: string): string {
  return 'none';
}

const flatShadows: CustomShadows = {
  z1: 'none',
  z4: 'none',
  z8: 'none',
  z12: 'none',
  z16: 'none',
  z20: 'none',
  z24: 'none',
  dialog: 'none',
  card: 'none',
  dropdown: 'none',
  primary: 'none',
  secondary: 'none',
  info: 'none',
  success: 'none',
  warning: 'none',
  error: 'none',
};

export const customShadows: Record<ThemeColorScheme, CustomShadows> = {
  light: flatShadows,
  dark: flatShadows,
};
