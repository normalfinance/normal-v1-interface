import type { Theme, Components } from '@mui/material/styles';

import Fade from '@mui/material/Fade';
import { listClasses } from '@mui/material/List';

// ----------------------------------------------------------------------

const MuiPopover: Components<Theme>['MuiPopover'] = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  // Menus and popovers fade in place. MUI's default Grow scales them open.
  defaultProps: { TransitionComponent: Fade },
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    paper: ({ theme }) => ({
      ...theme.mixins.paperStyles(theme, { dropdown: true }),
      [`& .${listClasses.root}`]: { paddingTop: 0, paddingBottom: 0 },
    }),
  },
};

// ----------------------------------------------------------------------

export const popover = { MuiPopover };
