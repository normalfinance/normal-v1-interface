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
    'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error',
    PaletteColorNoChannels
  > & {
    common: Pick<CommonColors, 'black' | 'white'>;
    grey: Record<
      '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
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
  fontFamily: {
    primary: 'CircularStd',
    secondary: 'Inter',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    primary: {
      lighter: '#7bd9ff',
      light: '#3ac5ff',
      main: '#00aff7',
      dark: '#0083b9',
      darker: '#00577b',
      contrastText: '#FFFFFF',
    },
    secondary: {
      lighter: '#c9bdff',
      light: '#af9cff',
      main: '#947bff',
      dark: '#5119B7', //
      darker: '#27097A', //
      contrastText: '#FFFFFF',
    },
    info: {
      lighter: '#7bd9ff',
      light: '#3ac5ff',
      main: '#00aff7',
      dark: '#0083b9',
      darker: '#00577b',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#96f4e3',
      light: '#61eed6',
      main: '#2de9c8',
      dark: '#14bd9f',
      darker: '#0d7e6a',
      contrastText: '#ffffff',
    },
    warning: {
      lighter: '#fff09e',
      light: '#ffe86d',
      main: '#ffe13d',
      dark: '#edc800',
      darker: '#9e8600',
      contrastText: '#1C252E',
    },
    error: {
      lighter: '#fb93cd',
      light: '#fa5db5',
      main: '#f8279c',
      dark: '#d00778',
      darker: '#8b0550',
      contrastText: '#FFFFFF',
    },
    grey: {
      '50': '#FCFDFD',
      '100': '#F9FAFB',
      '200': '#F4F6F8',
      '300': '#DFE3E8',
      '400': '#C4CDD5',
      '500': '#919EAB',
      '600': '#637381',
      '700': '#454F5B',
      '800': '#1C252E',
      '900': '#141A21',
    },
    common: { black: '#000000', white: '#FFFFFF' },
  },
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: '',
    colorSchemeSelector: 'data-color-scheme',
  },
};
