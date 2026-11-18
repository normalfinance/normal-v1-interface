import type { Theme, Components } from '@mui/material/styles';

import Fade from '@mui/material/Fade';
import { tooltipClasses } from '@mui/material/Tooltip';

// ----------------------------------------------------------------------

const MuiTooltip: Components<Theme>['MuiTooltip'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  // Fade in place; MUI's default Grow scales the tooltip open.
  defaultProps: { TransitionComponent: Fade },
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    tooltip: ({ theme }) => ({
      borderRadius: 'var(--radius-sm)',
      backgroundColor: theme.vars.palette.grey[900],
      ...theme.applyStyles('dark', {
        backgroundColor: theme.vars.palette.grey[700],
      }),
    }),
    arrow: ({ theme }) => ({
      color: theme.vars.palette.grey[900],
      ...theme.applyStyles('dark', {
        color: theme.vars.palette.grey[700],
      }),
    }),
    popper: {
      [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]: {
        marginTop: 12,
      },
      [`&.${tooltipClasses.popper}[data-popper-placement*="top"] .${tooltipClasses.tooltip}`]: {
        marginBottom: 12,
      },
      [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]: {
        marginLeft: 12,
      },
      [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]: {
        marginRight: 12,
      },
    },
  },
};

// ----------------------------------------------------------------------

export const tooltip = { MuiTooltip };
