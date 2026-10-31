'use client';

import type { AuthMode } from '@/lib/auth/auth-routes';

import NextLink from 'next/link';
import { useTranslate } from '@/locales';
import { authHref } from '@/lib/auth/auth-routes';

import { Box } from '@mui/material';

type Props = {
  mode: AuthMode;
  next: string | null;
  disabled?: boolean;
};

const OPTIONS: { mode: AuthMode; label: string }[] = [
  { mode: 'login', label: 'Log in' },
  { mode: 'signup', label: 'Sign up' },
];

// Dark track, so the option you're NOT on reads as a high-contrast button
// rather than a greyed-out tab: this is how someone without an account finds
// the way in.
export function AuthModeSwitch({ mode, next, disabled = false }: Props) {
  const { t } = useTranslate();

  return (
    <Box
      component="nav"
      aria-label={t('Log in or sign up')}
      sx={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        p: '4px',
        borderRadius: 'var(--radius-md)',
        bgcolor: 'var(--auth-ink)',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 4,
          width: 'calc(50% - 4px)',
          borderRadius: 'var(--radius-md)',
          bgcolor: 'background.paper',
          transform: mode === 'signup' ? 'translateX(100%)' : 'none',
          transition: 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        }}
      />
      {OPTIONS.map((option) => {
        const active = option.mode === mode;
        return (
          <Box
            key={option.mode}
            component={NextLink}
            href={authHref(option.mode, next)}
            replace
            scroll={false}
            aria-current={active ? 'page' : undefined}
            sx={{
              position: 'relative',
              py: 1.25,
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 500,
              color: active ? 'var(--auth-ink)' : 'var(--auth-on-ink)',
              transition: 'color 200ms',
              '&:focus-visible': { outline: '2px solid #6E8BFF', outlineOffset: 2 },
            }}
          >
            {t(option.label)}
          </Box>
        );
      })}
    </Box>
  );
}
