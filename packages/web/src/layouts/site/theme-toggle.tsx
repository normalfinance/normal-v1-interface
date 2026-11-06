'use client';

import { INK, HOVER, HAIRLINE_COLOR } from '@/theme/brand-colors';

import IconButton from '@mui/material/IconButton';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';

import { useSiteTheme, useSiteThemeScope } from './use-site-theme';

// ----------------------------------------------------------------------

/** Rendered once by the site frame: keeps <html> in the visitor's mode. */
export function SiteThemeScope() {
  useSiteThemeScope();
  return null;
}

/**
 * The header's switch, the site's only one: one tap between light and dark.
 * Until it is used the site follows the system setting. 40px square, the
 * height of the button beside it.
 */
export function ThemeToggleButton() {
  const { mode, setChoice } = useSiteTheme();
  const next = mode === 'dark' ? 'light' : 'dark';

  return (
    <IconButton
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => setChoice(next)}
      sx={{
        width: 40,
        height: 40,
        color: INK,
        border: `1px solid ${HAIRLINE_COLOR}`,
        borderRadius: 'var(--radius-md)',
        '&:hover': { bgcolor: HOVER },
      }}
    >
      {mode === 'dark' ? (
        <LightModeOutlined fontSize="small" />
      ) : (
        <DarkModeOutlined fontSize="small" />
      )}
    </IconButton>
  );
}
