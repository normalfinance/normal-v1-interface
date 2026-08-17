'use client';

import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { useState, useEffect } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { deriveWalletReadiness } from '@/lib/stellar/wallet-readiness';
import { checkTrustline, fetchAccountStrict } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useSnackbar } from '@/components/template/snackbar';
import ExternalWalletSetupDialog from '@/components/_common/external-wallet-setup-dialog';

// ---------------------------------------------------------------------------
// #74: the one notice for "this wallet can't hold USDC yet". Self-contained:
// probes the address, maps through deriveWalletReadiness, renders NOTHING
// while checking / on probe failure / when ready.
//
// The fix follows the wallet's signer — never crossed:
// - kind 'slot': the CONNECTED wallet signs its own changeTrust inline
//   (useTrustLine routes to the kit or the Normal wallet, whichever is
//   connected).
// - kind 'companion': only the passkey can fix the companion, so the action
//   opens the guided setup dialog via onOpenSetup.
// Activation can't be signed at all (someone must SEND ≥1 XLM), so that
// state is guidance text — plus the setup dialog for the companion, which
// includes its funding step.
// ---------------------------------------------------------------------------

// One toast EVER per address (localStorage, not session): the moment right
// after connecting is when the user can still connect the dots — after that,
// the persistent surfaces (drawer badge, swap-page notice) take over.
const TOAST_SEEN_KEY = 'nf:readiness-toast-v1';

/**
 * #74 P5: mounted once in the layout; watches the connected EXTERNAL wallet
 * and, the first time an address is seen, probes it and toasts if it can't
 * hold USDC. A FAILED probe toasts nothing (failure ≠ empty). Renders null.
 */
export function PostConnectReadinessToast() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();
  const { wallet } = usePersistStore();

  const isExternal = wallet.walletType != null && wallet.walletType !== 'normal-wallet';
  const address = isExternal ? wallet.address : undefined;

  useEffect(() => {
    if (!address) return undefined;
    let cancelled = false;
    const seenKey = `${TOAST_SEEN_KEY}:${address}`;
    try {
      if (localStorage.getItem(seenKey)) return undefined;
    } catch {
      return undefined;
    }

    (async () => {
      try {
        const account = await fetchAccountStrict(address, config);
        if (cancelled) return;
        const label = connectedWalletLabel(wallet.walletType);
        if (!account) {
          localStorage.setItem(seenKey, '1');
          enqueueSnackbar(
            t(
              '{{wallet}} connected — it is not active on Stellar yet. Open your wallet drawer to set it up.',
              { wallet: label }
            ),
            { variant: 'warning', autoHideDuration: 10_000 }
          );
          return;
        }
        const trustline = await checkTrustline(address, 'USDC', config.USDC_ISSUER, config);
        if (cancelled || trustline.exists) return;
        localStorage.setItem(seenKey, '1');
        enqueueSnackbar(
          t(
            '{{wallet}} connected — it has no USDC trustline yet, so USDC sent to it would bounce. You can add one from the wallet menu.',
            { wallet: label }
          ),
          { variant: 'warning', autoHideDuration: 10_000 }
        );
      } catch {
        // Probe failed → we know nothing → say nothing (and do NOT mark as
        // seen, so a healthy next session can still inform).
      }
    })();

    return () => {
      cancelled = true;
    };
    // The toast deliberately has no inline fix — it points at the drawer
    // badge, which owns the add-trustline action with a visible busy state.
  }, [address, wallet.walletType, config, enqueueSnackbar, t]);

  return null;
}

interface WalletReadinessNoticeProps {
  address: string | undefined;
  /** Display name for the wallet the notice is about (e.g. "Lobstr"). */
  walletLabel: string;
  /** Who can sign fixes — see header comment. */
  kind: 'slot' | 'companion';
  /** Required for kind='companion': opens the guided Normal-wallet setup. */
  onOpenSetup?: () => void;
  /** Suppress the not-activated state (for hosts that already render their
   *  own activation UI, e.g. the receive modal). */
  hideActivation?: boolean;
}

export default function WalletReadinessNotice({
  address,
  walletLabel,
  kind,
  onOpenSetup,
  hideActivation,
}: WalletReadinessNoticeProps) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const config = useStellarConfig();
  const probe = useAccountStatus(address || undefined);
  const { addTrustLine } = useTrustLine();
  const [busy, setBusy] = useState(false);
  // #74 follow-up (Niko): the not-activated fix is a guided popup — QR to
  // fund with XLM, then the trustline as step 2 — not just guidance text.
  const [setupOpen, setSetupOpen] = useState(false);

  if (!address) return null;
  const readiness = deriveWalletReadiness(probe);
  // checking → no warning flash; unknown → a failed probe asserts nothing.
  if (readiness === 'checking' || readiness === 'unknown' || readiness === 'ready') return null;
  if (readiness === 'not-activated' && hideActivation) return null;

  const handleAddTrustline = async () => {
    try {
      setBusy(true);
      await addTrustLine('USDC', config.USDC_ISSUER);
      enqueueSnackbar(t('USDC trustline added — this wallet can now hold USDC.'), {
        variant: 'success',
      });
      await probe.refetch();
    } catch (e: any) {
      enqueueSnackbar(e?.message || t('Could not add the USDC trustline.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const isActivation = readiness === 'not-activated';
  const message = isActivation
    ? t('{{wallet}} is not active on Stellar yet — send it at least 1 XLM to activate it.', {
        wallet: walletLabel,
      })
    : t('{{wallet}} has no USDC trustline — USDC sent to it would bounce back to the sender.', {
        wallet: walletLabel,
      });

  // The action the right signer can actually perform. Slot wallet:
  // no-trustline = one inline signature; not-activated = the guided QR
  // dialog (activation money must come from outside, then the trustline
  // continues as its step 2). Companion: always the passkey setup dialog.
  const action =
    kind === 'companion' && onOpenSetup
      ? { label: t('Set up'), onClick: onOpenSetup, busy: false }
      : kind === 'slot'
        ? isActivation
          ? { label: t('Set up'), onClick: () => setSetupOpen(true), busy: false }
          : { label: t('Add trustline'), onClick: handleAddTrustline, busy }
        : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        p: '10px 12px',
        borderRadius: '12px',
        bgcolor: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.35)',
      }}
    >
      <Typography sx={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
        {message}
        {!isActivation && (
          <Box component="span" sx={{ color: 'rgba(146,64,14,0.7)' }}>
            {' '}
            {t('Adding one reserves ~0.5 XLM.')}
          </Box>
        )}
      </Typography>
      {action && (
        <Box
          component="button"
          onClick={action.busy ? undefined : action.onClick}
          sx={{
            flexShrink: 0,
            appearance: 'none',
            border: '1px solid rgba(146,64,14,0.4)',
            borderRadius: '999px',
            px: '12px',
            py: '5px',
            fontSize: '11.5px',
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: action.busy ? 'default' : 'pointer',
            bgcolor: 'transparent',
            color: '#92400E',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            '&:hover': action.busy ? {} : { bgcolor: 'rgba(245,158,11,0.12)' },
          }}
        >
          {action.busy && <CircularProgress size={12} sx={{ color: '#92400E' }} />}
          {action.label}
        </Box>
      )}
      {/* Mounted here so EVERY surface that shows the notice gets the guided
          flow for free. Closing re-probes: the badge advances or vanishes
          immediately instead of waiting for a remount. */}
      {kind === 'slot' && (
        <ExternalWalletSetupDialog
          open={setupOpen}
          onClose={() => {
            setSetupOpen(false);
            probe.refetch();
          }}
          address={address}
          walletLabel={walletLabel}
        />
      )}
    </Box>
  );
}
