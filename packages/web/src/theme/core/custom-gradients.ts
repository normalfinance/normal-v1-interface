import type { ThemeColorScheme } from '../types';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */

export interface CustomGradients {
  textRainbow?: string;
}

export const customGradients: Record<ThemeColorScheme, CustomGradients> = {
  light: {
    textRainbow:
      'linear-gradient(76.69deg, #2DE9C8 0.14%, #00AFF7 19.83%, #947BFF 39.52%, #F8279C 59.2%, #FF6F4C 78.89%, #FFE13D 98.56%)',
  },
  dark: {
    textRainbow:
      'linear-gradient(76.69deg, #2DE9C8 0.14%, #00AFF7 19.83%, #947BFF 39.52%, #F8279C 59.2%, #FF6F4C 78.89%, #FFE13D 98.56%)',
  },
};
