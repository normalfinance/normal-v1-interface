'use client';

import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { shouldAdoptIntoSlot } from '@/lib/wallet-slot';
import { ensureChainAccount } from '@/lib/turnkey/add-account';
import { useNormalWallet } from '@/hooks/stellar/use-normal-wallet';
import {
  linkWallet,
  checkWalletLinkLimit,
  describeRateLimitReset,
} from '@/services/linked-wallets';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

// ---------------------------------------------------------------------------
// Gate dialog shown when the user starts an action on a chain (send, receive)
// without an address for it yet. The account is provisioned lazily and only
// after the user explicitly confirms here — never as a silent side effect.
// ---------------------------------------------------------------------------

const CHAIN_LABELS: Record<TurnkeyChain, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  stellar: 'Stellar',
};

interface ChainSetupDialogProps {
  open: boolean;
  onClose: () => void;
  chain: TurnkeyChain;
  userId: string;
  userEmail?: string | null;
  /** Called after the chain account exists; the caller resumes the original action. */
  onSuccess: () => void;
}

export function ChainSetupDialog({
  open,
  onClose,
  chain,
  userId,
  userEmail,
  onSuccess,
}: ChainSetupDialogProps) {
  const { t } = useTranslate();
  const { connectWalletWithoutKeypair } = useNormalWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = CHAIN_LABELS[chain];

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      // Same pre-flight as the Normal-wallet dialog: only the stellar branch
      // consumes a wallet-link slot, and discovering the limit AFTER
      // ensureChainAccount would have already minted a passkey and a sub-org
      // for a first-timer. A null answer never blocks — the link re-checks.
      if (chain === 'stellar') {
        const limit = await checkWalletLinkLimit();
        if (limit && !limit.allowed) {
          const wait = limit.reset ? describeRateLimitReset(limit.reset) : null;
          throw new Error(
            wait
              ? t('You can only add 3 wallets per day. Try again in {{wait}}.', { wait })
              : t('You can only add 3 wallets per day.')
          );
        }
      }
      // Lazy provisioning — derives the chain account on the existing wallet,
      // or creates passkey + sub-org + single-chain wallet for first-timers.
      const result = await ensureChainAccount(chain, userId, userEmail);
      // Stellar is the app's primary wallet: link it, and connect it into the
      // persist store ONLY when nothing is connected (the signup/onboarding
      // case — mirrors the wizard's create-wallet step). If an EXTERNAL
      // wallet occupies the slot, the new Turnkey wallet is a COMPANION:
      // linked and server-known, but the user's chosen wallet stays put
      // (#32 chunk 1, invariant I1 — the slot is never stolen). The other
      // chains are read via useTurnkeyWallet, which the caller refetches.
      if (chain === 'stellar') {
        if (!result.stellarAddress) {
          throw new Error(t('Wallet creation did not return a Stellar address'));
        }
        await linkWallet(result.stellarAddress);
        if (shouldAdoptIntoSlot(usePersistStore.getState().wallet.address)) {
          await connectWalletWithoutKeypair(result.stellarAddress);
        }
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogTitle sx={{ px: '22px', pt: '22px', pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}
          >
            {t('Set up your {{chain}} wallet', { chain: label })}
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            disabled={loading}
            sx={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              border: 'none',
              bgcolor: 'rgba(10,10,15,0.06)',
              color: '#0A0A0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 150ms ease',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: '22px', pt: '16px', pb: '22px' }}>
        <Stack spacing={2}>
          <Box
            sx={{
              px: '14px',
              py: '12px',
              borderRadius: '12px',
              bgcolor: 'rgba(59,130,246,0.05)',
              border: '1px solid rgba(59,130,246,0.15)',
            }}
          >
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}>
              {t(
                'You don’t have a {{chain}} address yet. To continue, add {{chain}} to your Normal wallet — it takes one passkey confirmation and is created on the same secure wallet you already use.',
                { chain: label }
              )}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Box
              component="button"
              onClick={handleSetup}
              disabled={loading}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                py: '13px',
                px: '20px',
                borderRadius: '14px',
                border: 'none',
                bgcolor: '#0A0A0F',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.15s',
                '&:hover:not(:disabled)': { bgcolor: '#1a1a25' },
              }}
            >
              {loading ? (
                <CircularProgress size={16} sx={{ color: '#fff' }} />
              ) : (
                <FingerprintIcon sx={{ fontSize: 18 }} />
              )}
              {loading ? t('Setting up…') : t('Set up {{chain}} wallet', { chain: label })}
            </Box>

            <Box
              sx={{
                fontSize: '11.5px',
                color: 'rgba(10,10,15,0.4)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              {t('Secured by your device biometrics. No seed phrase required.')}
            </Box>

            {error && (
              <Box
                sx={{
                  fontSize: '12px',
                  color: '#B91C1C',
                  bgcolor: 'rgba(185,28,28,0.06)',
                  border: '1px solid rgba(185,28,28,0.15)',
                  borderRadius: '10px',
                  px: '12px',
                  py: '8px',
                }}
              >
                {error}
              </Box>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
