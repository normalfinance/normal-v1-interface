import type { Theme, Components } from '@mui/material/styles';

// ----------------------------------------------------------------------

const MuiDrawer: Components<Theme>['MuiDrawer'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  // A drawer appears in place: MUI's default slides it in (DESIGN.md: nothing moves).
  defaultProps: { transitionDuration: 0 },
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    paperAnchorRight: ({ ownerState, theme }) => ({
      ...(ownerState.variant === 'temporary' && {
        ...theme.mixins.paperStyles(theme),
        boxShadow: 'none',
        borderLeft: `1px solid ${theme.vars.palette.divider}`,
      }),
    }),
    paperAnchorLeft: ({ ownerState, theme }) => ({
      ...(ownerState.variant === 'temporary' && {
        ...theme.mixins.paperStyles(theme),
        boxShadow: 'none',
        borderRight: `1px solid ${theme.vars.palette.divider}`,
      }),
    }),
  },
};

// ----------------------------------------------------------------------

export const drawer = { MuiDrawer };
