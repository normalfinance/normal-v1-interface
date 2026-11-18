import type { Theme, Components } from '@mui/material/styles';

// ----------------------------------------------------------------------

const MuiPaper: Components<Theme>['MuiPaper'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: { elevation: 0 },

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: { backgroundImage: 'none' },
    outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
  },
};

// ----------------------------------------------------------------------

export const paper = { MuiPaper };
