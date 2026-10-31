'use client';

import type { Factor } from '@supabase/supabase-js';

import { useTranslate } from '@/locales';
import { authedFetch } from '@/utils/authed-fetch';
import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { TWO_FACTOR_ENABLED, twoFactorErrorMessage } from '@/lib/auth/two-factor';

import { Box, Stack, Alert, Button, TextField, Typography } from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';
import { BLOCK_SX, MONO_FONT } from '@/components/_common/brand';
import WalletExportDialog from '@/components/_common/wallet-export-dialog';

const RECOVERY_CODES_URL = '/api/auth/two-factor/recovery-codes';
const WALLETS_URL = '/api/turnkey/wallets';
const CODE_LENGTH = 6;

type Step =
  | { name: 'idle' }
  | { name: 'phrase'; wallets: string[]; saved: string[] }
  | { name: 'setup'; factorId: string; qrCode: string; secret: string }
  | { name: 'codes'; codes: string[] }
  | { name: 'confirm'; action: 'turn-off' | 'new-codes' };

const primaryButtonSx = {
  borderRadius: 'var(--radius-md)',
  bgcolor: '#0A0A0F',
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '-0.01em',
  '&:hover': { bgcolor: '#2A2A33' },
  '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: '#9A9AA3' },
};

const secondaryButtonSx = {
  fontSize: '13px',
  fontWeight: 500,
  color: '#0A0A0F',
  border: '1px solid rgba(10,10,15,0.14)',
  borderRadius: 'var(--radius-md)',
  px: '14px',
  '&:hover': { bgcolor: 'rgba(10,10,15,0.04)' },
};

const dangerButtonSx = {
  ...secondaryButtonSx,
  color: '#B42318',
  border: '1px solid rgba(180,35,24,0.3)',
  '&:hover': { bgcolor: 'rgba(180,35,24,0.05)' },
};

function CodeField({ busy, onComplete }: { busy: boolean; onComplete: (code: string) => void }) {
  const { t } = useTranslate();
  const [code, setCode] = useState('');

  // Clears itself after a wrong code, once the attempt is over.
  useEffect(() => {
    if (!busy) setCode('');
  }, [busy]);

  return (
    <TextField
      label={t('6-digit code')}
      value={code}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
        setCode(digits);
        if (digits.length === CODE_LENGTH) onComplete(digits);
      }}
      fullWidth
      autoFocus
      disabled={busy}
      slotProps={{
        htmlInput: {
          maxLength: CODE_LENGTH,
          inputMode: 'numeric',
          autoComplete: 'one-time-code',
          style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.25rem' },
        },
      }}
      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)' } }}
    />
  );
}

// Settings → Security. Every change here needs a fresh code from the app, so an
// unlocked laptop isn't enough to turn 2FA off or mint new recovery codes.
export function TwoFactorCard() {
  const { t } = useTranslate();
  const { supabase } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  // undefined while loading, null when 2FA is off.
  const [factor, setFactor] = useState<Factor | null | undefined>(undefined);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [step, setStep] = useState<Step>({ name: 'idle' });
  const [exportingWallet, setExportingWallet] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp[0] ?? null;
    setFactor(verified);
    if (!verified) return;
    const res = await authedFetch(RECOVERY_CODES_URL);
    if (res.ok) setRemaining((await res.json()).remaining);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const backToIdle = () => {
    setStep({ name: 'idle' });
    setError(null);
    void load();
  };

  const createRecoveryCodes = async () => {
    const res = await authedFetch(RECOVERY_CODES_URL, { method: 'POST' });
    if (!res.ok) throw new Error('recovery codes failed');
    const { codes } = (await res.json()) as { codes: string[] };
    setStep({ name: 'codes', codes });
  };

  // With a code on every send and export, someone who loses their phone and
  // recovery codes has only this phrase left, so it comes before 2FA can start.
  // Each wallet has its own. An account with no Normal wallet has none to save,
  // and a failed lookup stops here rather than skipping the step.
  const beginTurnOn = async () => {
    setBusy(true);
    setError(null);
    let wallets: string[];
    try {
      const res = await authedFetch(WALLETS_URL);
      if (!res.ok) throw new Error('wallets failed');
      const data = (await res.json()) as { wallets?: { walletId: string }[] };
      wallets = (data.wallets ?? []).map(({ walletId }) => walletId);
    } catch {
      setError('Something went wrong. Please try again.');
      setBusy(false);
      return;
    }
    if (wallets.length === 0) {
      await startSetup();
      return;
    }
    setBusy(false);
    setStep({ name: 'phrase', wallets, saved: [] });
  };

  const markPhraseSaved = (walletId: string) =>
    setStep((current) =>
      current.name === 'phrase' ? { ...current, saved: [...current.saved, walletId] } : current
    );

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      // A setup abandoned halfway would block a new one under the same name.
      const { data: list } = await supabase.auth.mfa.listFactors();
      const abandoned = (list?.all ?? []).filter((item) => item.status === 'unverified');
      await Promise.all(abandoned.map(({ id }) => supabase.auth.mfa.unenroll({ factorId: id })));

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
        issuer: 'Normal',
      });
      if (enrollError) throw enrollError;
      setStep({
        name: 'setup',
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (err) {
      setError(twoFactorErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancelSetup = async () => {
    if (step.name === 'setup') await supabase.auth.mfa.unenroll({ factorId: step.factorId });
    backToIdle();
  };

  const verifyCode = async (factorId: string, code: string) => {
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (verifyError) throw verifyError;
  };

  const finishSetup = async (code: string) => {
    if (step.name !== 'setup') return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(step.factorId, code);
    } catch (err) {
      setError(twoFactorErrorMessage(err));
      setBusy(false);
      return;
    }
    try {
      await createRecoveryCodes();
    } catch {
      // 2FA is on either way; the card offers new codes from here.
      backToIdle();
      setError('Two-factor is on, but your recovery codes failed. Create them below.');
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async (code: string) => {
    if (step.name !== 'confirm' || !factor) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(factor.id, code);
      if (step.action === 'new-codes') {
        await createRecoveryCodes();
        return;
      }
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unenrollError) throw unenrollError;
      // The token still says the code was entered until it's refreshed.
      await supabase.auth.refreshSession();
      await authedFetch(RECOVERY_CODES_URL, { method: 'DELETE' });
      enqueueSnackbar(t('Two-factor authentication is off.'), { variant: 'success' });
      backToIdle();
    } catch (err) {
      setError(twoFactorErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async (codes: string[]) => {
    await navigator.clipboard.writeText(codes.join('\n'));
    enqueueSnackbar(t('Recovery codes copied.'), { variant: 'success' });
  };

  const downloadCodes = (codes: string[]) => {
    const text = `Normal recovery codes\n\nEach code works once.\n\n${codes.join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'normal-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Hidden until launch, but anyone who already has 2FA can always manage it.
  if (factor === undefined || (!factor && !TWO_FACTOR_ENABLED)) return null;

  const renderHeader = () => (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '4px' }}>
      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0F' }}>
        {t('Two-factor authentication')}
      </Typography>
      <Typography
        sx={{
          fontSize: '11px',
          fontWeight: 500,
          px: '9px',
          py: '3px',
          borderRadius: 'var(--radius-sm)',
          bgcolor: factor ? 'rgba(26,179,125,0.12)' : 'rgba(10,10,15,0.06)',
          color: factor ? '#0A6649' : '#6B6B76',
        }}
      >
        {factor ? t('On') : t('Off')}
      </Typography>
    </Stack>
  );

  const renderDescription = (text: string) => (
    <Typography sx={{ fontSize: '13px', color: '#6B6B76', lineHeight: 1.55, mb: '16px' }}>
      {t(text)}
    </Typography>
  );

  const renderPhrase = (wallets: string[], saved: string[]) => (
    <>
      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0F', mb: '4px' }}>
        {t('Save your recovery phrase first')}
      </Typography>
      {renderDescription(
        "If you lose your phone and your recovery codes, this phrase is the only way back to your funds. Normal can't recover it for you."
      )}
      <Stack spacing={1} sx={{ mb: '12px' }}>
        {wallets.map((walletId, index) => {
          const isSaved = saved.includes(walletId);
          const label =
            wallets.length > 1
              ? t('Export wallet {{n}}', { n: index + 1 })
              : t('Export recovery phrase');
          return (
            <Button
              key={walletId}
              fullWidth
              disabled={isSaved}
              onClick={() => setExportingWallet(walletId)}
              sx={secondaryButtonSx}
            >
              {isSaved ? t('Saved') : label}
            </Button>
          );
        })}
      </Stack>
      <Button
        fullWidth
        variant="contained"
        disabled={busy || saved.length < wallets.length}
        onClick={startSetup}
        sx={primaryButtonSx}
      >
        {busy ? t('One moment…') : t('Continue')}
      </Button>
      <Stack alignItems="center" sx={{ mt: '4px' }}>
        <Button variant="text" size="small" disabled={busy} onClick={backToIdle}>
          {t('Cancel')}
        </Button>
      </Stack>
    </>
  );

  const renderSetup = (qrCode: string, secret: string) => (
    <>
      {renderDescription(
        'Scan this QR code with an authenticator app, such as Google Authenticator, Authy or 1Password. Then enter the 6-digit code it shows.'
      )}
      <Stack alignItems="center" spacing={2}>
        <Box
          component="img"
          src={qrCode}
          alt={t('QR code for your authenticator app')}
          sx={{ width: 176, height: 176, display: 'block' }}
        />
        <Box sx={{ width: '100%' }}>
          <Typography sx={{ fontSize: '12px', color: '#6B6B76', mb: '6px' }}>
            {t("Can't scan it? Enter this key in your app instead:")}
          </Typography>
          <Box
            sx={{
              px: '12px',
              py: '10px',
              fontFamily: MONO_FONT,
              fontSize: '12.5px',
              color: '#0A0A0F',
              wordBreak: 'break-all',
              bgcolor: '#F4F4F7',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {secret}
          </Box>
        </Box>
        <CodeField busy={busy} onComplete={finishSetup} />
        <Button variant="text" size="small" disabled={busy} onClick={cancelSetup}>
          {t('Cancel')}
        </Button>
      </Stack>
    </>
  );

  const renderCodes = (codes: string[]) => (
    <>
      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0F', mb: '4px' }}>
        {t('Save your recovery codes')}
      </Typography>
      {renderDescription(
        "If you lose your phone, one of these codes gets you back in. Each works once, and you won't see them again. Keep them somewhere safe, away from your email."
      )}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: '8px 16px',
          p: '14px',
          mb: '12px',
          fontFamily: MONO_FONT,
          fontSize: '12.5px',
          color: '#0A0A0F',
          bgcolor: '#F4F4F7',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {codes.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </Box>
      <Stack direction="row" spacing={1} sx={{ mb: '12px' }}>
        <Button fullWidth onClick={() => copyCodes(codes)} sx={secondaryButtonSx}>
          {t('Copy')}
        </Button>
        <Button fullWidth onClick={() => downloadCodes(codes)} sx={secondaryButtonSx}>
          {t('Download')}
        </Button>
      </Stack>
      <Button fullWidth variant="contained" onClick={backToIdle} sx={primaryButtonSx}>
        {t("I've saved my codes")}
      </Button>
    </>
  );

  const renderConfirm = (action: 'turn-off' | 'new-codes') => (
    <>
      {renderDescription(
        action === 'turn-off'
          ? 'Enter a code from your authenticator app to turn off two-factor authentication.'
          : 'Enter a code from your authenticator app. Your old recovery codes will stop working.'
      )}
      <Stack alignItems="center" spacing={1}>
        <CodeField busy={busy} onComplete={confirmAction} />
        <Button variant="text" size="small" disabled={busy} onClick={backToIdle}>
          {t('Cancel')}
        </Button>
      </Stack>
    </>
  );

  const renderIdle = () =>
    factor ? (
      <>
        {renderDescription(
          "You'll enter a code from your authenticator app when you log in and before you send, swap, deposit or withdraw."
        )}
        {remaining !== null && (
          <Typography sx={{ fontSize: '13px', color: '#0A0A0F', mb: '12px' }}>
            {t('Recovery codes left')}: <strong>{remaining}</strong>
          </Typography>
        )}
        <Stack direction="row" spacing={1}>
          <Button
            onClick={() => setStep({ name: 'confirm', action: 'new-codes' })}
            sx={secondaryButtonSx}
          >
            {t('New recovery codes')}
          </Button>
          <Button
            onClick={() => setStep({ name: 'confirm', action: 'turn-off' })}
            sx={dangerButtonSx}
          >
            {t('Turn off')}
          </Button>
        </Stack>
      </>
    ) : (
      <>
        {renderDescription(
          'Ask for a 6-digit code from an authenticator app when you log in and before you send, swap, deposit or withdraw, so your email or password alone is never enough.'
        )}
        <Button
          fullWidth
          variant="contained"
          disabled={busy}
          onClick={beginTurnOn}
          sx={primaryButtonSx}
        >
          {busy ? t('One moment…') : t('Turn on')}
        </Button>
      </>
    );

  return (
    <Box sx={{ ...BLOCK_SX, maxWidth: 480, mt: 2 }}>
      {step.name !== 'codes' && renderHeader()}

      {step.name === 'idle' && renderIdle()}
      {step.name === 'phrase' && renderPhrase(step.wallets, step.saved)}
      {step.name === 'setup' && renderSetup(step.qrCode, step.secret)}
      {step.name === 'codes' && renderCodes(step.codes)}
      {step.name === 'confirm' && renderConfirm(step.action)}

      {error && (
        <Alert severity="error" sx={{ mt: '12px', borderRadius: 'var(--radius-md)' }}>
          {t(error)}
        </Alert>
      )}

      <WalletExportDialog
        open={!!exportingWallet}
        preselectWalletId={exportingWallet ?? undefined}
        requireConfirm
        cancellable
        onConfirmedBackup={() => exportingWallet && markPhraseSaved(exportingWallet)}
        onClose={() => setExportingWallet(null)}
      />
    </Box>
  );
}
