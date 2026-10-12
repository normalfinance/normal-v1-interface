'use client';

import { useTranslate } from '@/locales';
import { useState, useCallback } from 'react';
import { authedFetch } from '@/utils/authed-fetch';
import { usePersistStore } from '@normalfinance/state';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import WalletExportDialog from '@/components/_common/wallet-export-dialog';

// ---------------------------------------------------------------------------
// Settings › Security › Delete account — the web face of DELETE /api/account.
// Same three gates as the server, in the server's order, driven by dryRun so
// the user sees what blocks them BEFORE anything irreversible:
//   export the recovery phrase (never skippable) → nothing in flight →
//   funds (skippable only with an explicit tick) → typed DELETE → gone.
// ---------------------------------------------------------------------------

type Code = 'EXPORT_REQUIRED' | 'IN_FLIGHT' | 'FUNDS_PRESENT' | 'UNAVAILABLE' | 'CONFIRM';

interface Balance {
  symbol: string;
  chain: string;
  balance: number | null;
}

interface GateState {
  code: Code | null; // null = all gates pass
  error?: string;
  wallets?: string[];
  counts?: { cctp: number; ramp: number; moneygram: number };
  balances?: Balance[];
  unreadable?: Balance[];
}

async function callDelete(body: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const r = await authedFetch('/api/account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE', ...body }),
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

function toGate(status: number, data: any): GateState {
  if (status === 200) return { code: null };
  return {
    code: (data?.code as Code) ?? 'UNAVAILABLE',
    error: data?.error,
    wallets: data?.wallets,
    counts: data?.counts,
    balances: data?.balances,
    unreadable: data?.unreadable,
  };
}

export function DeleteAccountCard() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { signOut } = useSupabaseAuth();
  const persist = usePersistStore();

  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [gate, setGate] = useState<GateState | null>(null);
  const [override, setOverride] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [exportWalletId, setExportWalletId] = useState<string | null>(null);

  const check = useCallback(async (withOverride: boolean) => {
    setChecking(true);
    try {
      const { status, data } = await callDelete({ dryRun: true, override: withOverride });
      setGate(toGate(status, data));
    } catch {
      setGate({ code: 'UNAVAILABLE', error: 'Could not reach the server.' });
    } finally {
      setChecking(false);
    }
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setGate(null);
    setOverride(false);
    setUnderstood(false);
    setTyped('');
    void check(false);
  };

  const handleOverrideChange = (v: boolean) => {
    setOverride(v);
    void check(v);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { status, data } = await callDelete({ override });
      if (status !== 200) {
        setGate(toGate(status, data));
        setDeleting(false);
        return;
      }
      // The auth user is already gone server-side; clear everything local and
      // land on a signed-out home page.
      try {
        await signOut();
      } catch {
        /* session is invalid anyway */
      }
      persist.disconnectWallet();
      enqueueSnackbar(t('Your account has been deleted.'), { variant: 'success' });
      window.location.href = '/';
    } catch {
      setDeleting(false);
      enqueueSnackbar(t('Deletion did not complete. Please try again.'), { variant: 'error' });
    }
  };

  const ready = gate?.code === null;
  const canDelete = ready && understood && typed === 'DELETE' && !deleting;

  return (
    <>
      <Box
        sx={{
          p: '22px',
          borderRadius: '22px',
          border: '1px solid rgba(220,38,38,0.2)',
          bgcolor: '#FFFFFF',
          maxWidth: 480,
          mt: 2,
        }}
      >
        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F', mb: '4px' }}>
          {t('Delete account')}
        </Typography>
        <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mb: '16px' }}>
          {t(
            'Removes your Normal login and personal data. Your wallet stays yours: before deleting you must export its recovery phrase, which restores your funds in any wallet.'
          )}
        </Typography>
        <Button
          variant="outlined"
          onClick={handleOpen}
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            color: '#B91C1C',
            borderColor: 'rgba(220,38,38,0.4)',
            '&:hover': { borderColor: '#B91C1C', bgcolor: 'rgba(220,38,38,0.04)' },
          }}
        >
          {t('Delete my account')}
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
      >
        <DialogContent sx={{ px: '22px', py: '26px' }}>
          <Stack spacing={2}>
            <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F' }}>
              {t('Delete your account')}
            </Typography>

            {checking && !gate && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={18} sx={{ color: '#0A0A0F' }} />
                <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)' }}>
                  {t('Checking your wallet…')}
                </Typography>
              </Stack>
            )}

            {gate?.code === 'EXPORT_REQUIRED' && (
              <GateBox tone="warn" title={t('Step 1 — save your recovery phrase')}>
                <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>
                  {t(
                    'After deletion, the recovery phrase is the only way to reach your funds. Export it now; one passkey confirmation per wallet.'
                  )}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1.5 }}>
                  {(gate.wallets ?? []).map((id, i) => (
                    <Button
                      key={id}
                      variant="contained"
                      size="small"
                      onClick={() => setExportWalletId(id)}
                      sx={{ borderRadius: '10px', bgcolor: '#0A0A0F', textTransform: 'none' }}
                    >
                      {gate.wallets && gate.wallets.length > 1
                        ? t('Export wallet {{n}}', { n: i + 1 })
                        : t('Export recovery phrase')}
                    </Button>
                  ))}
                </Stack>
              </GateBox>
            )}

            {gate?.code === 'IN_FLIGHT' && (
              <GateBox tone="warn" title={t('Something is still in progress')}>
                <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>
                  {t(
                    'A swap, purchase or cash-out has not finished yet. Wait for it to complete, then check again.'
                  )}
                </Typography>
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', mt: 1 }}>
                  {t('Swaps: {{a}} · Purchases/sales: {{b}} · MoneyGram: {{c}}', {
                    a: gate.counts?.cctp ?? 0,
                    b: gate.counts?.ramp ?? 0,
                    c: gate.counts?.moneygram ?? 0,
                  })}
                </Typography>
                <Button
                  size="small"
                  onClick={() => check(override)}
                  disabled={checking}
                  sx={{ mt: 1, textTransform: 'none' }}
                >
                  {t('Check again')}
                </Button>
              </GateBox>
            )}

            {gate?.code === 'FUNDS_PRESENT' && (
              <GateBox tone="warn" title={t('Your wallet still holds funds')}>
                <Stack spacing={0.5} sx={{ mb: 1 }}>
                  {(gate.balances ?? []).map((b) => (
                    <Typography
                      key={`${b.chain}-${b.symbol}`}
                      sx={{ fontSize: '13px', fontFamily: '"Geist Mono", monospace' }}
                    >
                      {b.balance} {b.symbol === 'SAVINGS_USDC' ? t('USDC in Savings') : b.symbol}
                    </Typography>
                  ))}
                </Stack>
                <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>
                  {t(
                    'Withdraw or send them first, or accept that only your recovery phrase will reach them from now on.'
                  )}
                </Typography>
                <FormControlLabel
                  sx={{ mt: 1, alignItems: 'flex-start' }}
                  control={
                    <Checkbox
                      checked={override}
                      onChange={(e) => handleOverrideChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '12.5px', lineHeight: 1.45 }}>
                      {t(
                        'I understand only my recovery phrase reaches these funds after deletion.'
                      )}
                    </Typography>
                  }
                />
              </GateBox>
            )}

            {gate?.code === 'UNAVAILABLE' && (
              <GateBox tone="error" title={t('Could not check right now')}>
                <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>
                  {gate.error || t('Please try again in a moment.')}
                </Typography>
                <Button
                  size="small"
                  onClick={() => check(override)}
                  disabled={checking}
                  sx={{ mt: 1, textTransform: 'none' }}
                >
                  {t('Try again')}
                </Button>
              </GateBox>
            )}

            {ready && (
              <>
                <GateBox tone="ok" title={t('Ready to delete')}>
                  <Typography sx={{ fontSize: '13px', lineHeight: 1.5 }}>
                    {t(
                      'Your login, linked wallets, devices and personal data will be removed. Your wallet and passkeys remain on-chain under your recovery phrase.'
                    )}
                  </Typography>
                </GateBox>
                <FormControlLabel
                  sx={{ alignItems: 'flex-start' }}
                  control={
                    <Checkbox
                      checked={understood}
                      onChange={(e) => setUnderstood(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: '12.5px', lineHeight: 1.45 }}>
                      {t('I understand this cannot be undone.')}
                    </Typography>
                  }
                />
                <TextField
                  label={t('Type DELETE to confirm')}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value.toUpperCase())}
                  fullWidth
                  size="small"
                  slotProps={{ htmlInput: { autoComplete: 'off', spellCheck: false } }}
                />
              </>
            )}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => setOpen(false)}
                disabled={deleting}
                sx={{ borderRadius: '12px', textTransform: 'none', color: '#0A0A0F' }}
              >
                {t('Cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={handleDelete}
                disabled={!canDelete}
                startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{
                  borderRadius: '12px',
                  bgcolor: '#B91C1C',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#991B1B' },
                }}
              >
                {deleting ? t('Deleting…') : t('Delete account')}
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      <WalletExportDialog
        open={!!exportWalletId}
        preselectWalletId={exportWalletId ?? undefined}
        requireConfirm
        onConfirmedBackup={() => {
          setExportWalletId(null);
          void check(override); // Turnkey has the activity now — re-run the gates
        }}
        onClose={() => setExportWalletId(null)}
      />
    </>
  );
}

function GateBox({
  tone,
  title,
  children,
}: {
  tone: 'warn' | 'error' | 'ok';
  title: string;
  children: React.ReactNode;
}) {
  const colors =
    tone === 'ok'
      ? { bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.2)', fg: '#047857' }
      : tone === 'error'
        ? { bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.15)', fg: '#B91C1C' }
        : { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.25)', fg: '#92400E' };
  return (
    <Box
      sx={{
        p: '14px',
        borderRadius: '14px',
        bgcolor: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      <Typography sx={{ fontSize: '13px', fontWeight: 700, color: colors.fg, mb: '6px' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
