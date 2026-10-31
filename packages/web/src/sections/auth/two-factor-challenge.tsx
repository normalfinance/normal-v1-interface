'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { authedFetch } from '@/utils/authed-fetch';
import { supabase } from '@/lib/createSupabaseClient';
import { twoFactorErrorMessage } from '@/lib/auth/two-factor';

import { Alert, Stack, Button, TextField, Typography, CircularProgress } from '@mui/material';

const CODE_LENGTH = 6;

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)' } };

const linkButtonSx = { color: 'text.secondary', fontSize: '0.8125rem' };

type TwoFactorChallengeProps = {
  /** Signs out of this half-finished login. */
  onCancel: () => void;
  /** A recovery code removed 2FA and ended every session, so they log in again. */
  onRecovered: () => void;
};

// The second step of signing in. It sits between the first step and the app:
// the session exists but the provider doesn't count it as signed in until the
// code upgrades it, so when this succeeds the page simply moves on.
export function TwoFactorChallenge({ onCancel, onRecovered }: TwoFactorChallengeProps) {
  const { t } = useTranslate();

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
      // Stays busy: the session just changed, so the page is already moving on.
    } catch (err) {
      setCode('');
      setBusy(false);
      setError(twoFactorErrorMessage(err));
    }
  };

  // Six digits submit by themselves, same as the emailed sign-in code.
  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) verify(digits);
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

  const heading = useRecoveryCode ? t('Use a recovery code') : t('Enter your code');
  const subtitle = useRecoveryCode
    ? t('This turns off two-factor authentication. You can set it up again in Settings.')
    : t('Open your authenticator app and enter the 6-digit code for Normal.');

  return (
    <Stack spacing={3}>
      <Stack spacing={0.75}>
        <Typography
          component="h1"
          sx={{ fontSize: 30, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          {heading}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15 }}>
          {subtitle}
        </Typography>
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
                style: { fontFamily: '"Geist Mono", ui-monospace, monospace' },
              },
            }}
            sx={fieldSx}
          />
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
        <TextField
          label={t('6-digit code')}
          value={code}
          onChange={(event) => handleCodeChange(event.target.value)}
          fullWidth
          autoFocus
          disabled={busy}
          slotProps={{
            htmlInput: {
              maxLength: CODE_LENGTH,
              inputMode: 'numeric',
              autoComplete: 'one-time-code',
              style: {
                textAlign: 'center',
                letterSpacing: '0.6em',
                fontSize: '1.5rem',
                fontWeight: 500,
              },
            },
          }}
          sx={fieldSx}
        />
      )}

      {busy && !useRecoveryCode && (
        <Stack alignItems="center">
          <CircularProgress size={24} />
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
          {t(error)}
        </Alert>
      )}

      <Stack alignItems="center" spacing={0.5}>
        <Button
          variant="text"
          size="small"
          disabled={busy}
          onClick={() => switchTo(!useRecoveryCode)}
          sx={linkButtonSx}
        >
          {useRecoveryCode ? t('Use your authenticator app') : t('Lost your phone?')}
        </Button>
        <Button variant="text" size="small" disabled={busy} onClick={onCancel} sx={linkButtonSx}>
          {t('Cancel and log out')}
        </Button>
      </Stack>
    </Stack>
  );
}
