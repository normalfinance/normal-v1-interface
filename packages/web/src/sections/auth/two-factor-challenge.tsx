'use client';

import type { SvgIconComponent } from '@mui/icons-material';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { authedFetch } from '@/utils/authed-fetch';
import { supabase } from '@/lib/createSupabaseClient';
import { twoFactorErrorMessage } from '@/lib/auth/two-factor';

import KeyOutlined from '@mui/icons-material/KeyOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import PhonelinkLockOutlined from '@mui/icons-material/PhonelinkLockOutlined';
import { Box, Alert, Stack, Button, TextField, Typography, CircularProgress } from '@mui/material';

import { CodeInput } from '@/components/_common/code-input';
import { HAIRLINE, MONO_FONT } from '@/components/_common/brand';

const CODE_LENGTH = 6;

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)' } };

const linkButtonSx = { color: 'text.secondary', fontSize: '0.8125rem' };

// The icon tile from the navbar menus, a size up: soft fill, hairline, outlined icon.
function IconTile({ icon: Icon, small }: { icon: SvgIconComponent; small: boolean }) {
  return (
    <Box
      sx={(theme) => ({
        width: small ? 40 : 48,
        height: small ? 40 : 48,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F4F4F7',
        border: HAIRLINE,
        borderRadius: 'var(--radius-md)',
        color: '#0A0A0F',
        ...theme.applyStyles('dark', {
          bgcolor: 'rgba(255,255,255,0.06)',
          borderColor: 'rgba(255,255,255,0.10)',
          color: 'text.primary',
        }),
      })}
    >
      <Icon sx={{ fontSize: small ? 20 : 24 }} />
    </Box>
  );
}

type TwoFactorChallengeProps = {
  /** Signs out of this half-finished login. */
  onCancel: () => void;
  /** A recovery code removed 2FA and ended every session, so they log in again. */
  onRecovered: () => void;
  /** Set when the code confirms an action rather than finishing a login. */
  onVerified?: () => void;
};

// The second step of signing in. It sits between the first step and the app:
// the session exists but the provider doesn't count it as signed in until the
// code upgrades it, so when this succeeds the page simply moves on. The same
// screen confirms each action afterwards (components/_common/action-code-gate).
export function TwoFactorChallenge({ onCancel, onRecovered, onVerified }: TwoFactorChallengeProps) {
  const { t } = useTranslate();
  const confirmingAction = !!onVerified;

  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [code, setCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchTo = (recovery: boolean) => {
    setUseRecoveryCode(recovery);
    setCode('');
    setRecoveryCode('');
    setError(null);
  };

  const verify = async (digits: string) => {
    setBusy(true);
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      const factor = data?.totp[0];
      if (listError || !factor) throw listError ?? new Error('No authenticator on this account');

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: digits,
      });
      if (verifyError) throw verifyError;
      // A login stays busy: the session just changed, so the page is moving on.
      onVerified?.();
    } catch (err) {
      setCode('');
      setBusy(false);
      setError(twoFactorErrorMessage(err));
    }
  };

  const handleCodeChange = (digits: string) => {
    setCode(digits);
    setError(null);
  };

  const handleRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!recoveryCode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch('/api/auth/two-factor/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: recoveryCode }),
      });
      if (res.ok) {
        onRecovered();
        return;
      }
      if (res.status === 429) setError('Too many attempts. Wait a few minutes and try again.');
      else if (res.status === 400) setError("That recovery code isn't valid.");
      else setError('Something went wrong. Your code still works, so please try again.');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setBusy(false);
  };

  let heading = t('Enter your code');
  let subtitle = t('Open your authenticator app and enter the 6-digit code for Normal.');
  let icon: SvgIconComponent = PhonelinkLockOutlined;
  if (useRecoveryCode) {
    heading = t('Use a recovery code');
    subtitle = t('This turns off two-factor authentication. You can set it up again in Settings.');
    icon = KeyOutlined;
  } else if (confirmingAction) {
    heading = t('Confirm with your code');
    subtitle = t('Enter the 6-digit code from your authenticator app to continue.');
    icon = VerifiedUserOutlined;
  }

  const renderStatus = () => {
    if (busy) {
      return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
          <CircularProgress size={14} color="inherit" />
          <Typography sx={{ fontSize: 13 }}>{t('Checking your code…')}</Typography>
        </Stack>
      );
    }
    if (error) {
      return (
        <Alert severity="error" sx={{ borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
          {t(error)}
        </Alert>
      );
    }
    return (
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.disabled' }}>
        <AccessTimeOutlined sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: 13 }}>{t('The code changes every 30 seconds.')}</Typography>
      </Stack>
    );
  };

  return (
    <Stack spacing={3}>
      <Stack spacing={2}>
        <IconTile icon={icon} small={confirmingAction} />
        <Stack spacing={0.75}>
          <Typography
            component="h1"
            sx={{
              fontSize: confirmingAction ? 20 : 30,
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--auth-ink, #0A0A0F)',
            }}
          >
            {heading}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: confirmingAction ? 14 : 15 }}
          >
            {subtitle}
          </Typography>
        </Stack>
      </Stack>

      {useRecoveryCode ? (
        <Stack component="form" spacing={2} onSubmit={handleRecovery}>
          <TextField
            label={t('Recovery code')}
            value={recoveryCode}
            onChange={(event) => {
              setRecoveryCode(event.target.value);
              setError(null);
            }}
            fullWidth
            autoFocus
            disabled={busy}
            slotProps={{
              htmlInput: {
                autoComplete: 'one-time-code',
                spellCheck: false,
                style: { fontFamily: MONO_FONT },
              },
            }}
            sx={fieldSx}
          />
          {error && (
            <Alert severity="error" sx={{ borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
              {t(error)}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            size="large"
            variant="contained"
            disabled={busy || !recoveryCode.trim()}
          >
            {busy ? t('One moment…') : t('Use recovery code')}
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <CodeInput
            value={code}
            onChange={handleCodeChange}
            onComplete={verify}
            length={CODE_LENGTH}
            disabled={busy}
            error={!!error}
            size={confirmingAction ? 'small' : 'medium'}
            autoFocus
          />
          {renderStatus()}
        </Stack>
      )}

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={0.5}
        sx={{ pt: 2, borderTop: HAIRLINE }}
      >
        <Button
          variant="text"
          size="small"
          disabled={busy}
          onClick={() => switchTo(!useRecoveryCode)}
          sx={linkButtonSx}
        >
          {useRecoveryCode ? t('Use your authenticator app') : t('Lost your phone?')}
        </Button>
        <Typography aria-hidden="true" sx={{ color: 'text.disabled', fontSize: 13 }}>
          ·
        </Typography>
        <Button variant="text" size="small" disabled={busy} onClick={onCancel} sx={linkButtonSx}>
          {confirmingAction ? t('Cancel') : t('Cancel and log out')}
        </Button>
      </Stack>
    </Stack>
  );
}
