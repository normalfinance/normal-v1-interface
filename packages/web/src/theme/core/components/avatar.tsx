import type { Theme, Components, ComponentsVariants } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';
import { MUTED, CANVAS } from '@/theme/brand-colors';

import { avatarGroupClasses } from '@mui/material/AvatarGroup';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../../extend-theme-types.d.ts}
 */

export type AvatarGroupExtendVariant = {
  compact: true;
};

// ----------------------------------------------------------------------

const COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;

// ----------------------------------------------------------------------

const avatarColors: Record<string, ComponentsVariants<Theme>['MuiAvatar']> = {
  colors: COLORS.map((color) => ({
    props: ({ ownerState }) => ownerState.color === color,
    style: ({ theme }) => ({
      color: theme.vars.palette[color].contrastText,
      backgroundColor: theme.vars.palette[color].main,
    }),
  })),
  defaultColor: [
    {
      props: ({ ownerState }) => ownerState.color === 'default',
      style: ({ theme }) => ({
        color: theme.vars.palette.text.secondary,
        backgroundColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.24),
      }),
    },
  ],
};

const MuiAvatar: Components<Theme>['MuiAvatar'] = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: { variants: [avatarColors.defaultColor, avatarColors.colors].flat() },
    rounded: { borderRadius: 'var(--radius-md)' },
    // A person's initial is grey on the canvas, whatever the letter
    // (2026-11-08): colour only where it means something, and a name's first
    // letter means nothing. The template coloured it per letter
    // (colorByName); an explicit `color` prop still picks a palette colour.
    colorDefault: ({ ownerState }) => ({
      ...(!!ownerState.alt && {
        color: MUTED,
        backgroundColor: CANVAS,
        fontWeight: 500,
      }),
    }),
  },
};

// ----------------------------------------------------------------------

const MuiAvatarGroup: Components<Theme>['MuiAvatarGroup'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: { max: 4 },

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ ownerState }) => ({
      justifyContent: 'flex-end',
      ...(ownerState.variant === 'compact' && {
        width: 40,
        height: 40,
        position: 'relative',
        [`& .${avatarGroupClasses.avatar}`]: {
          margin: 0,
          width: 28,
          height: 28,
          position: 'absolute',
          '&:first-of-type': { left: 0, bottom: 0, zIndex: 9 },
          '&:last-of-type': { top: 0, right: 0 },
        },
      }),
    }),
    avatar: ({ theme }) => ({
      fontSize: 16,
      fontWeight: theme.typography.fontWeightSemiBold,
      '&:first-of-type': {
        fontSize: 12,
        color: theme.vars.palette.primary.dark,
        backgroundColor: theme.vars.palette.primary.lighter,
      },
    }),
  },
};

// ----------------------------------------------------------------------

export const avatar = { MuiAvatar, MuiAvatarGroup };
