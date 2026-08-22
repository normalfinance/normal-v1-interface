'use client';

// ---------------------------------------------------------------------------
// #32 chunk 3 — the guided "get a Normal wallet" dialog (doc 72 §3, Niko's
// UX directive). Shown ONLY to an external-wallet user starting a cross-chain
// swap; signup/onboarding is untouched. Four steps, each resumable because
// the current step is DERIVED from chain state on every open
// (lib/normal-wallet-setup.ts):
//
//   1. create     passkey ceremony → Turnkey wallet (slot NOT stolen — I1)
//   2. activate   pre-filled XLM send FROM the external wallet (kit signs)
//   3. trustline  USDC changeTrust ON the companion (passkey signs)
//   4. fund       pre-filled USDC send FROM the external wallet (kit signs)
//
// One-time cost: 2 passkey ceremonies + 2 external approvals. After this,
// swaps are passkey-only (chunk 4 wires the engines).
// ---------------------------------------------------------------------------

import type { Token } from '@normalfinance/types';

import QRCode from 'qrcode';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useStellarConfig } from '@/hooks';
import { useState, useEffect, useCallback } from 'react';
import { useStellarTokens } from '@/hooks/use-stellar-tokens';
import { useSendToken } from '@/hooks/stellar/use-send-token';
import { ensureChainAccount } from '@/lib/turnkey/add-account';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { friendlyTurnkeyError } from '@/lib/turnkey/passkey-stamper';
import { getXlmToken, getSwapUsdcToken } from '@/utils/token-selectors';
import { getTurnkeyWalletInfo, invalidateTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import {
  linkWallet,
  checkWalletLinkLimit,
  describeRateLimitReset,
} from '@/services/linked-wallets';
import {
  probeCompanion,
  type SetupStep,
  deriveSetupStep,
  SETUP_FUNDING_XLM,
  type CompanionProbe,
  addCompanionUsdcTrustline,
} from '@/lib/normal-wallet-setup';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';

const MONO = { fontFamily: '"Geist Mono", "Courier New", monospace' } as const;

interface Props {
  open: boolean;
  onClose: () => void;
  /** USDC the user typed in the swap — pre-fills the fund step. */
  neededUsdc?: number;
  /** Fired once the wallet is ready (created + activated + trustline + funded). */
  onReady?: () => void;
}

const STEP_ORDER: SetupStep[] = ['create', 'activate', 'trustline', 'fund'];

export function NormalWalletSetupDialog({ open, onClose, neededUsdc = 0, onReady }: Props) {
  const { t } = useTranslate();
  const config = useStellarConfig();
  const { user } = useSupabaseAuth();
  const { send: stellarSend } = useSendToken();
  const tokens = useStellarTokens();

  const [companionAddress, setCompanionAddress] = useState<string | null>(null);
  const [probe, setProbe] = useState<CompanionProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundingXlm, setFundingXlm] = useState(String(SETUP_FUNDING_XLM));
  const [fundUsdc, setFundUsdc] = useState('');
  const [qrUrl, setQrUrl] = useState('');

  const step: SetupStep = deriveSetupStep(companionAddress, probe, neededUsdc);

  // Re-derive everything on open — THE resumability mechanism: a killed tab
  // reopens at the first unmet condition, a funded wallet derives to 'ready'.
  const refresh = useCallback(async () => {
    setProbing(true);
    setError(null);
    try {
      const info = await getTurnkeyWalletInfo();
      const addr = info?.stellarAddress ?? null;
      setCompanionAddress(addr);
      setProbe(addr ? await probeCompanion(addr, config) : null);
    } catch (e: any) {
      setError(friendlyTurnkeyError(e));
    } finally {
      setProbing(false);
    }
  }, [config]);

  // QR for the companion address, so XLM can be sent from ANYWHERE — an
  // exchange, a phone wallet, a friend (Niko staging 2026-08-22: the
  // connected wallet had USDC but not enough XLM, so the "send from your
  // connected wallet" button was a dead end with no other way forward).
  useEffect(() => {
    if (!open || !companionAddress) {
      setQrUrl('');
      return;
    }
    QRCode.toDataURL(companionAddress, {
      width: 168,
      margin: 1,
      color: { dark: '#0A0A0F', light: '#FFFFFF' },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [open, companionAddress]);

  // Arrival checker: while the wallet still needs XLM (or USDC), re-probe
  // every 4s so the dialog ADVANCES BY ITSELF the moment funds land —
  // whoever sent them, however they were sent.
  useEffect(() => {
    if (!open) return undefined;
    if (step !== 'activate' && step !== 'fund') return undefined;
    const id = setInterval(() => {
      refresh();
    }, 4000);
    return () => clearInterval(id);
  }, [open, step, refresh]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    if (open && neededUsdc > 0 && !fundUsdc) {
      setFundUsdc(BigNumber(neededUsdc).toFixed(2, BigNumber.ROUND_UP));
    }
  }, [open, neededUsdc, fundUsdc]);

  useEffect(() => {
    if (open && step === 'ready') onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const findToken = (symbol: 'XLM' | 'USDC'): Token | null =>
    (symbol === 'XLM' ? getXlmToken(tokens) : getSwapUsdcToken(tokens, config)) ?? null;

  const runStep = async () => {
    setBusy(true);
    setError(null);
    try {
      if (step === 'create') {
        if (!user) throw new Error(t('You must be signed in.'));
        // Ask about the daily wallet limit BEFORE the passkey ceremony.
        // Creating the passkey and the Turnkey sub-org are the expensive,
        // irreversible half; discovering the limit afterwards (live
        // 2026-08-22) left a real passkey saved on the device, a real
        // sub-org created, and an error that read like nothing had worked.
        // A null answer means "could not tell" — never block on that, the
        // link call re-checks authoritatively anyway.
        const limit = await checkWalletLinkLimit();
        if (limit && !limit.allowed) {
          const wait = limit.reset ? describeRateLimitReset(limit.reset) : null;
          throw new Error(
            wait
              ? t('You can only add 3 wallets per day. Try again in {{wait}}.', { wait })
              : t('You can only add 3 wallets per day.')
          );
        }
        const result = await ensureChainAccount('stellar', user.id, user.email);
        if (!result.stellarAddress) throw new Error(t('Wallet creation returned no address'));
        await linkWallet(result.stellarAddress);
        // Deliberately NO slot adoption (invariant I1): this dialog only
        // exists for a user whose external wallet is connected — the new
        // Normal wallet is their companion, and their chosen wallet stays
        // on screen.
        invalidateTurnkeyWalletInfo();
      } else if (step === 'activate') {
        const xlm = findToken('XLM');
        if (!xlm) throw new Error(t('XLM balance not loaded yet — try again in a moment.'));
        const amount = BigNumber(fundingXlm);
        if (!amount.gte(2)) throw new Error(t('At least 2 XLM is needed to activate the wallet.'));
        // Name the real problem instead of "the transfer was not completed"
        // (Niko staging 2026-08-22: the connected wallet held USDC but too
        // little XLM, so the button could never work and the message said
        // nothing about why — or about the QR right above it).
        if (BigNumber(xlm.balance || 0).lt(amount)) {
          throw new Error(
            t(
              '{{wallet}} only has {{have}} XLM — either lower the amount, or use the QR code above to send at least 1 XLM from another wallet or an exchange.',
              {
                wallet: t('Your connected wallet'),
                have: BigNumber(xlm.balance || 0).toFixed(2),
              }
            )
          );
        }
        const hash = await stellarSend({
          destination: companionAddress!,
          token: xlm,
          amount: amount.toFixed(7, BigNumber.ROUND_DOWN),
        });
        if (!hash) throw new Error(t('The XLM transfer was not completed.'));
      } else if (step === 'trustline') {
        await addCompanionUsdcTrustline(companionAddress!, config);
      } else if (step === 'fund') {
        const usdc = findToken('USDC');
        // "Try again in a moment" is only true while balances are still
        // arriving. Once they HAVE arrived, waiting changes nothing and the
        // real answer is that this wallet holds no USDC — say which.
        if (!usdc)
          throw new Error(
            tokens.length === 0
              ? t('Balances are still loading — try again in a moment.')
              : t('Your connected wallet has no USDC to move.')
          );
        const amount = BigNumber(fundUsdc || 0);
        if (!amount.gt(0)) throw new Error(t('Enter the USDC amount to move.'));
        if (amount.gt(usdc.balance))
          throw new Error(t('Your connected wallet does not hold that much USDC.'));
        const hash = await stellarSend({
          destination: companionAddress!,
          token: usdc,
          amount: amount.toFixed(7, BigNumber.ROUND_DOWN),
        });
        if (!hash) throw new Error(t('The USDC transfer was not completed.'));
      }
      await refresh();
    } catch (e: any) {
      setError(friendlyTurnkeyError(e));
    } finally {
      setBusy(false);
    }
  };

  const stepMeta: Record<SetupStep, { label: string; sub: string; cta: string }> = {
    create: {
      label: t('Create your Normal wallet'),
      sub: t('One passkey confirmation — your connected wallet stays connected.'),
      cta: t('Create with passkey'),
    },
    activate: {
      label: t('Activate it with a little XLM'),
      sub: t('New Stellar accounts need XLM to exist — sent from your connected wallet.'),
      cta: t('Send XLM'),
    },
    trustline: {
      label: t('Allow USDC on the new wallet'),
      sub: t('One passkey confirmation adds the USDC trustline.'),
      cta: t('Add trustline'),
    },
    fund: {
      label: t('Move the USDC you want to swap'),
      sub: t('Sent from your connected wallet — you approve it there.'),
      cta: t('Move USDC'),
    },
    ready: {
      label: t('Your Normal wallet is ready'),
      sub: t('Cross-chain swaps now run through it with your passkey.'),
      cta: t('Done'),
    },
  };

  const activeIdx = step === 'ready' ? STEP_ORDER.length : STEP_ORDER.indexOf(step);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px', p: '22px' } } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: '6px' }}
      >
        <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F' }}>
          {t('Set up your Normal wallet')}
        </Typography>
        <Box
          component="button"
          onClick={busy ? undefined : onClose}
          sx={{ all: 'unset', cursor: 'pointer', color: 'rgba(10,10,15,0.4)', display: 'flex' }}
        >
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>
      <Typography
        sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)', mb: '14px', lineHeight: 1.5 }}
      >
        {t(
          'Cross-chain swaps run through your Normal wallet — a passkey-secured wallet that can hold BTC, ETH and SOL.'
        )}
      </Typography>

      {probing && !probe && !companionAddress ? (
        <Stack alignItems="center" sx={{ py: '28px' }}>
          <CircularProgress size={22} sx={{ color: '#0A0A0F' }} />
        </Stack>
      ) : (
        <>
          {/* Step list */}
          <Stack spacing={0} sx={{ mb: '8px' }}>
            {STEP_ORDER.map((s, idx) => {
              const done = idx < activeIdx;
              const active = idx === activeIdx;
              return (
                <Stack
                  key={s}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                  sx={{ py: '8px', opacity: done || active ? 1 : 0.45 }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: '1px',
                    }}
                  >
                    {done ? (
                      <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                    ) : active && busy ? (
                      <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
                    ) : (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: active ? '#0A0A0F' : 'rgba(10,10,15,0.15)',
                          mt: '2px',
                        }}
                      />
                    )}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F' }}>
                      {stepMeta[s].label}
                    </Typography>
                    {active && (
                      <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)' }}>
                        {stepMeta[s].sub}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              );
            })}
          </Stack>

          {/* Step inputs */}
          {step === 'activate' && (
            <>
              {/* Option A — send from anywhere (always available). */}
              <Box
                sx={{
                  p: '14px',
                  mb: '12px',
                  borderRadius: '14px',
                  border: '1px solid rgba(10,10,15,0.1)',
                  bgcolor: '#FAFAFB',
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '12.5px',
                    color: 'rgba(10,10,15,0.6)',
                    mb: '10px',
                    lineHeight: 1.5,
                  }}
                >
                  {t(
                    'Send at least 1 XLM to this address from any wallet or exchange — this screen continues by itself as soon as it arrives.'
                  )}
                </Typography>
                {qrUrl && (
                  <Box
                    component="img"
                    src={qrUrl}
                    alt={t('Normal wallet address')}
                    sx={{ width: 168, height: 168, borderRadius: '10px', mb: '8px' }}
                  />
                )}
                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                  <Typography
                    sx={{
                      ...MONO,
                      fontSize: '11.5px',
                      color: '#0A0A0F',
                      wordBreak: 'break-all',
                      textAlign: 'left',
                    }}
                  >
                    {companionAddress}
                  </Typography>
                  {companionAddress && (
                    <CopyIconButton value={companionAddress} alert={t('Address copied')} />
                  )}
                </Stack>
                {probing && (
                  <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '6px' }}>
                    {t('Watching for the payment…')}
                  </Typography>
                )}
              </Box>

              {/* Option B — the shortcut, only when the connected wallet can
                  actually pay: XLM there, not just USDC. */}
              <Typography
                sx={{
                  fontSize: '12px',
                  color: 'rgba(10,10,15,0.5)',
                  mb: '6px',
                  textAlign: 'center',
                }}
              >
                {t('or send it from your connected wallet')}
              </Typography>
              <TextField
                size="small"
                fullWidth
                value={fundingXlm}
                onChange={(e) => setFundingXlm(e.target.value.replace(/[^0-9.]/g, ''))}
                label={t('XLM to send')}
                sx={{ mb: '10px', '& input': { ...MONO, fontSize: '14px' } }}
              />
            </>
          )}
          {step === 'fund' && (
            <TextField
              size="small"
              fullWidth
              value={fundUsdc}
              onChange={(e) => setFundUsdc(e.target.value.replace(/[^0-9.]/g, ''))}
              label={t('USDC to move')}
              sx={{ mb: '10px', '& input': { ...MONO, fontSize: '14px' } }}
            />
          )}

          {error && (
            <Typography
              sx={{
                fontSize: '12px',
                color: '#B91C1C',
                bgcolor: 'rgba(185,28,28,0.06)',
                border: '1px solid rgba(185,28,28,0.15)',
                borderRadius: '10px',
                px: '12px',
                py: '8px',
                mb: '10px',
                wordBreak: 'break-word',
              }}
            >
              {error}
            </Typography>
          )}

          <Box
            component="button"
            onClick={step === 'ready' ? onClose : runStep}
            disabled={busy || probing}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              py: '13px',
              borderRadius: '14px',
              border: 'none',
              bgcolor: '#0A0A0F',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: busy || probing ? 'not-allowed' : 'pointer',
              opacity: busy || probing ? 0.7 : 1,
              '&:hover:not(:disabled)': { bgcolor: '#1a1a25' },
            }}
          >
            {busy ? (
              <CircularProgress size={16} sx={{ color: '#fff' }} />
            ) : step === 'create' || step === 'trustline' ? (
              <FingerprintIcon sx={{ fontSize: 18 }} />
            ) : null}
            {busy ? t('Working…') : stepMeta[step].cta}
          </Box>

          {step === 'ready' && (
            <Typography
              sx={{
                fontSize: '11.5px',
                color: 'rgba(10,10,15,0.45)',
                mt: '10px',
                textAlign: 'center',
              }}
            >
              {t('Your funds sit on your own wallets at every step.')}
            </Typography>
          )}
        </>
      )}
    </Dialog>
  );
}

export default NormalWalletSetupDialog;
