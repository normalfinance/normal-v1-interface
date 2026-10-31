import type { CommonColors } from '@mui/material/styles/createPalette';

import type { PaletteColorNoChannels } from './core/palette';
import type { ThemeDirection, ThemeColorScheme, ThemeCssVariables } from './types';

// ----------------------------------------------------------------------

type ThemeConfig = {
  classesPrefix: string;
  modeStorageKey: string;
  direction: ThemeDirection;
  defaultMode: ThemeColorScheme;
  cssVariables: ThemeCssVariables;
  fontFamily: Record<'primary' | 'secondary', string>;
  palette: Record<
    'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'purple',
    PaletteColorNoChannels
  > & {
    common: Pick<CommonColors, 'black' | 'white'>;
    grey: Record<
      '50' | '100' | '200' | '250' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950',
      string
    >;
  };
};

export const themeConfig: ThemeConfig = {
  /** **************************************
   * Base
   *************************************** */
  direction: 'ltr',
  defaultMode: 'light',
  modeStorageKey: 'theme-mode',
  classesPrefix: 'minimal',
  /** **************************************
   * Typography
   *************************************** */
  //Add Figtree as secondary
  fontFamily: {
    primary: 'Satoshi',
    secondary: 'Satoshi',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    primary: {
      lighter: '#cceeff',
      light: '#66d1f8',
      main: '#00aff7',
      dark: '#008ac7',
      darker: '#006897',
      contrastText: '#FFFFFF',
    },
    secondary: {
      lighter: '#e1d9ff',
      light: '#EFD6FF',
      main: '#6E4BFF',
      dark: '#7a65d9',
      darker: '#5f4fb2',
      contrastText: '#FFFFFF',
    },
    info: {
      lighter: '#CAFDF5',
      light: '#61F3F3',
      main: '#00B8D9',
      dark: '#006C9C',
      darker: '#003768',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#D9F5EA',
      light: '#4ADE80',
      main: '#1AB37D',
      dark: '#0A6649',
      darker: '#074A35',
      contrastText: '#FFFFFF',
    },
    warning: {
      lighter: '#FEF3C7',
      light: '#FCD34D',
      main: '#F59E0B',
      dark: '#B45309',
      darker: '#92400E',
      contrastText: '#0A0A0F',
    },
    error: {
      lighter: '#FEE2E2',
      light: '#F87171',
      main: '#DC2626',
      dark: '#B91C1C',
      darker: '#7F1D1D',
      contrastText: '#FFFFFF',
    },
    grey: {
      '50': '#FAFAFB',
      '100': '#F4F4F7',
      '200': '#EEEEF2',
      '250': '#E8E8ED',
      '300': '#DEDEE4',
      '400': '#C4C4CC',
      '500': '#9A9AA3',
      '600': '#6B6B76',
      '700': '#44444E',
      '800': '#2A2A33',
      '900': '#0A0A0F',
      '950': '#2B2B2B',
    },
    common: { black: '#000000', white: '#FFFFFF' },
    purple: {
      lighter: 'rgba(148,123,255,0.29)',
      light: '#947BFF',
      main: '#6E4BFF',
      dark: '#4B29DB',
      darker: '#30189C',
      contrastText: '#FFFFFF',
    },
  },
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: '',
    colorSchemeSelector: 'data-color-scheme',
  },
};
