'use client';

import NextLink from 'next/link';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { INK, MUTED, FAINT, PAPER } from '@/theme/brand-colors';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { hasVerifiedFactor, TWO_FACTOR_ENABLED } from '@/lib/auth/two-factor';

import { Box, Button, Typography, IconButton } from '@mui/material';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';

import { Iconify } from '@/components/template/iconify';

import { BLOCK_SX } from './brand';

const DISMISSED_KEY = 'nf:two-factor-prompt-dismissed';
const DISMISSED_FOR_MS = 30 * 24 * 60 * 60 * 1000;

function dismissedRecently(userId: string): boolean {
  try {
    const at = Number(localStorage.getItem(`${DISMISSED_KEY}:${userId}`));
    return Number.isFinite(at) && Date.now() - at < DISMISSED_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissed(userId: string): void {
  try {
    localStorage.setItem(`${DISMISSED_KEY}:${userId}`, String(Date.now()));
  } catch {
    /* it comes back next visit, which is harmless */
  }
}

/**
 * Suggests 2FA once there's money worth protecting, however it arrived. Nothing
 * here depends on which deposit flow ran: the caller just says funds are present.
 */
export function TwoFactorPrompt({ hasFunds }: { hasFunds: boolean }) {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  // Starts hidden: localStorage isn't readable until after the first paint.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (user) setHidden(dismissedRecently(user.id));
  }, [user]);

  if (!TWO_FACTOR_ENABLED || !user || !hasFunds || hidden || hasVerifiedFactor(user)) return null;

  return (
    <Box
      sx={{
        ...BLOCK_SX,
        py: '14px',
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-md)',
          bgcolor: INK,
        }}
      >
        <VerifiedUserOutlinedIcon sx={{ fontSize: 20, color: PAPER }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 500, color: INK }}>
          {t('Protect your account')}
        </Typography>
        <Typography sx={{ fontSize: '13px', color: MUTED, lineHeight: 1.45 }}>
          {t('Turn on two-factor authentication so your email alone is never enough.')}
        </Typography>
      </Box>

      <Button
        component={NextLink}
        href={`${paths.settings}?tab=security`}
        variant="contained"
        size="small"
        sx={{ flexShrink: 0, px: '14px' }}
      >
        {t('Turn on')}
      </Button>

      <IconButton
        aria-label={t('Dismiss')}
        size="small"
        onClick={() => {
          rememberDismissed(user.id);
          setHidden(true);
        }}
        sx={{ flexShrink: 0, color: FAINT }}
      >
        <Iconify icon="mingcute:close-line" width={16} />
      </IconButton>
    </Box>
  );
}
