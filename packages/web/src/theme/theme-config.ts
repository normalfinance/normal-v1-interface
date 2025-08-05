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
    primary: 'var(--font-circular)',
    secondary: 'var(--font-circular)',
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
      light: '#e0d9ff',
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
      lighter: '#d6fdf6',
      light: '#7efbe1',
      main: '#2de9c8',
      dark: '#24bba3',
      darker: '#1b8c7a',
      contrastText: '#000000',
    },
    warning: {
      lighter: '#fff5c0',
      light: '#ffeb7a',
      main: '#ffe13d',
      dark: '#d9be34',
      darker: '#a38f27',
      contrastText: '#000000',
    },
    error: {
      lighter: '#fcd0e7',
      light: '#f972c0',
      main: '#f8279c',
      dark: '#d02183',
      darker: '#a81b6a',
      contrastText: '#FFFFFF',
    },
    grey: {
      '50': '#FCFDFD',
      '100': '#F9FAFB',
      '200': '#F4F6F8',
      '250': '#f1f3f4',
      '300': '#DFE3E8',
      '400': '#C4CDD5',
      '500': '#919EAB',
      '600': '#637381',
      '700': '#454F5B',
      '800': '#1C252E',
      '900': '#141A21',
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
