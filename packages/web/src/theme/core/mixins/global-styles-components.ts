import type { Theme, CSSObject } from '@mui/material/styles';

import { dividerClasses } from '@mui/material/Divider';
import { checkboxClasses } from '@mui/material/Checkbox';
import { menuItemClasses } from '@mui/material/MenuItem';
import { autocompleteClasses } from '@mui/material/Autocomplete';

// ----------------------------------------------------------------------

/**
 * Generates styles for menu items.
 *
 * @param {Theme} theme - The theme object.
 * @returns {CSSObject} The CSS object for menu item styles.
 *
 * @example
 * ...theme.mixins.menuItemStyles(theme)
 */
export function menuItemStyles(theme: Theme): CSSObject {
  return {
    ...theme.typography.body2,
    padding: theme.spacing(0.75, 1),
    borderRadius: 'var(--radius-sm)',
    '&:not(:last-of-type)': {
      marginBottom: 4,
    },
    [`&.${menuItemClasses.selected}`]: {
      fontWeight: theme.typography.fontWeightSemiBold,
      backgroundColor: theme.vars.palette.action.selected,
      '&:hover': { backgroundColor: theme.vars.palette.action.hover },
    },
    [`& .${checkboxClasses.root}`]: {
      padding: theme.spacing(0.5),
      marginLeft: theme.spacing(-0.5),
      marginRight: theme.spacing(0.5),
    },
    [`&.${autocompleteClasses.option}[aria-selected="true"]`]: {
      backgroundColor: theme.vars.palette.action.selected,
      '&:hover': { backgroundColor: theme.vars.palette.action.hover },
    },
    [`&+.${dividerClasses.root}`]: {
      margin: theme.spacing(0.5, 0),
    },
  };
}

// ----------------------------------------------------------------------

/**
 * Generates styles for paper components.
 *
 * @param {PaperStyleOptions} props - The properties for the paper styles.
 * @param {Theme} props.theme - The theme object.
 * @param {string} [props.color] - The background color.
 * @param {boolean} [props.dropdown] - Whether the paper is a dropdown.
 * @returns {CSSObject} The CSS object for paper styles.
 *
 * @example
 * ...theme.mixins.paperStyles(theme, { dropdown: true, blur: 20, color: varAlpha(theme.vars.palette.background.defaultChannel, 0.9) }),
 */
export type PaperStyleOptions = {
  blur?: number;
  color?: string;
  dropdown?: boolean;
};

export function paperStyles(theme: Theme, options?: PaperStyleOptions): CSSObject {
  const { color, dropdown } = options ?? {};
  return {
    backgroundColor: color ?? theme.vars.palette.background.paper,
    ...(dropdown && {
      padding: theme.spacing(0.5),
      boxShadow: 'none',
      border: `1px solid ${theme.vars.palette.divider}`,
      borderRadius: 'var(--radius-lg)',
    }),
  };
}
