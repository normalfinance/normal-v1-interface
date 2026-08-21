'use client';

// ---------------------------------------------------------------------------
// Wallet recovery-phrase export (doc 79). The ONE screen where our custody
// story inverts: everywhere else we tell the user we cannot touch their
// funds; here we hand them the master key.
//
// SECURITY MODEL (verified against Turnkey docs 2026-08-21):
//   - The phrase is decrypted and displayed ONLY inside Turnkey's own iframe
//     (export.turnkey.com), in ITS origin. Our JS, DOM, network and logs see
//     only the HPKE-encrypted bundle — never the plaintext.
//   - Only the USER'S PASSKEY can authorize the export (Turnkey is
//     deny-by-default; our server key and the autopilot delegate cannot).
//   - The exported BIP-39 phrase restores every chain in standard wallets
//     (MetaMask/Phantom/Freighter/Sparrow) — our derivation paths are all
//     ecosystem standards (doc 79 §2).
// We therefore never store, log, copy, or transmit the phrase from here; the
// only "save" affordances belong to the iframe itself.
// ---------------------------------------------------------------------------

import { useTranslate } from '@/locales';
import { useRef, useState, useCallback } from 'react';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';
import { runWebauthnCeremony } from '@/lib/turnkey/webauthn-guard';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

const TURNKEY_EXPORT_IFRAME_URL = 'https://export.turnkey.com';
const IFRAME_CONTAINER_ID = 'turnkey-export-iframe-container';
const IFRAME_ELEMENT_ID = 'turnkey-export-iframe';

type Phase = 'warn' | 'revealing' | 'revealed' | 'error';

export default function WalletExportDialog({
  open,
  onClose,
  /** Mandatory-backup mode (doc 79 D2): after wallet creation the user must
   *  confirm they saved the phrase before the flow proceeds. onClose is
   *  disabled until 'revealed'; onConfirmedBackup fires on the checkbox. */
  requireConfirm = false,
  onConfirmedBackup,
}: {
  open: boolean;
  onClose: () => void;
  requireConfirm?: boolean;
  onConfirmedBackup?: () => void;
}) {
  const { t } = useTranslate();
  const [phase, setPhase] = useState<Phase>('warn');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const stamperRef = useRef<{ clear: () => void } | null>(null);

  const teardown = useCallback(() => {
    // Removing the iframe wipes its decrypted phrase from the DOM entirely.
    try {
      stamperRef.current?.clear();
    } catch {
      /* already gone */
    }
    stamperRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    // In mandatory mode the dialog can only close once the phrase has been
    // revealed AND the user ticked "I saved it" — never before.
    if (requireConfirm && !(phase === 'revealed' && confirmed)) return;
    teardown();
    setPhase('warn');
    setError(null);
    setConfirmed(false);
    onClose();
  }, [requireConfirm, phase, confirmed, teardown, onClose]);

  const reveal = useCallback(async () => {
    setError(null);
    setPhase('revealing');
    try {
      const info = await getTurnkeyWalletInfo();
      if (!info?.subOrgId || !info.walletId) {
        throw new Error(t('No Normal wallet found to export.'));
      }

      const container = document.getElementById(IFRAME_CONTAINER_ID);
      if (!container) throw new Error(t('Export view is not ready — try again.'));

      // 1) Mount Turnkey's export iframe; init() returns ITS one-time public
      //    key. The phrase will only ever be decrypted inside this iframe.
      const { IframeStamper } = await import('@turnkey/iframe-stamper');
      const stamper = new IframeStamper({
        iframeUrl: TURNKEY_EXPORT_IFRAME_URL,
        iframeElementId: IFRAME_ELEMENT_ID,
        iframeContainer: container,
      });
      stamperRef.current = stamper;
      const targetPublicKey = await stamper.init();

      // 2) Ask Turnkey to export, encrypted to the iframe's key, authorized
      //    by the user's PASSKEY (guarded like every ceremony, #51/#63).
      const rpId =
        typeof window !== 'undefined'
          ? (process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname)
          : 'localhost';
      const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
      const { TurnkeyClient } = await import('@turnkey/http');
      const client = new TurnkeyClient(
        { baseUrl: 'https://api.turnkey.com' },
        new WebauthnStamper({ rpId })
      );
      const activity = await runWebauthnCeremony(() =>
        client.exportWallet({
          type: 'ACTIVITY_TYPE_EXPORT_WALLET',
          timestampMs: String(Date.now()),
          organizationId: info.subOrgId,
          parameters: { walletId: info.walletId, targetPublicKey },
        })
      );
      const bundle = activity?.activity?.result?.exportWalletResult?.exportBundle;
      if (!bundle) throw new Error(t('Turnkey did not return an export bundle.'));

      // 3) Inject the encrypted bundle; the iframe decrypts + renders the
      //    phrase in its own origin. We never see the plaintext.
      await stamper.injectWalletExportBundle(bundle, info.subOrgId);
      setPhase('revealed');
    } catch (e: any) {
      teardown();
      setError(String(e?.message ?? e));
      setPhase('error');
    }
  }, [t, teardown]);

  const locked = requireConfirm && !(phase === 'revealed' && confirmed);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '20px', p: '24px', maxWidth: 460 } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: '8px' }}
      >
        <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#0A0A0F' }}>
          {t('Your recovery phrase')}
        </Typography>
        {!locked && (
          <Box
            component="button"
            onClick={handleClose}
            sx={{ all: 'unset', cursor: 'pointer', color: 'rgba(10,10,15,0.4)', display: 'flex' }}
          >
            <Iconify icon="mingcute:close-line" width={22} />
          </Box>
        )}
      </Stack>

      {/* Warnings are shown in EVERY phase — this is the one screen where the
          user is holding the master key. */}
      <Box
        sx={{
          px: '14px',
          py: '12px',
          borderRadius: '12px',
          bgcolor: 'rgba(220,38,38,0.05)',
          border: '1px solid rgba(220,38,38,0.16)',
          mb: '16px',
        }}
      >
        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#991B1B', mb: '4px' }}>
          {t('Anyone with this phrase controls all your crypto.')}
        </Typography>
        <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.65)', lineHeight: 1.55 }}>
          {t(
            'Write it on paper and store it offline. Never type it into any website or share it — Normal will never ask you for it. This phrase restores your Bitcoin, Ethereum, Solana and Stellar in wallets like MetaMask, Phantom or Freighter, even if Normal is unavailable.'
          )}
        </Typography>
      </Box>

      {phase === 'warn' && (
        <>
          <Typography
            sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.6)', lineHeight: 1.6, mb: '18px' }}
          >
            {t(
              'You will confirm with your passkey. The phrase is shown only inside a secure Turnkey window — Normal never sees it.'
            )}
          </Typography>
          <Button
            onClick={reveal}
            fullWidth
            sx={{
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              bgcolor: '#0A0A0F',
              borderRadius: '12px',
              py: '11px',
              '&:hover': { bgcolor: '#0A0A0F', opacity: 0.85 },
            }}
          >
            {t('Reveal recovery phrase')}
          </Button>
        </>
      )}

      {phase === 'revealing' && (
        <Stack alignItems="center" spacing={1.5} sx={{ py: '28px' }}>
          <CircularProgress size={22} sx={{ color: '#0A0A0F' }} />
          <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.55)' }}>
            {t('Confirm with your passkey…')}
          </Typography>
        </Stack>
      )}

      {/* The iframe container is always mounted (init needs it in the DOM);
          it only holds content once revealed. */}
      <Box
        id={IFRAME_CONTAINER_ID}
        sx={{
          display: phase === 'revealed' ? 'block' : 'none',
          mt: '4px',
          p: '14px',
          borderRadius: '12px',
          border: '1px solid rgba(10,10,15,0.12)',
          bgcolor: '#FAFAFB',
          minHeight: 96,
          wordBreak: 'break-word',
        }}
      />

      {phase === 'revealed' && (
        <>
          <Typography
            sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '10px', lineHeight: 1.5 }}
          >
            {t(
              'Copy this from the box above into offline storage. A file on your computer is safer than nothing, but paper kept offline is safest.'
            )}
          </Typography>
          {requireConfirm && (
            <Box
              component="label"
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '9px',
                mt: '14px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <Typography sx={{ fontSize: '13px', color: '#0A0A0F', lineHeight: 1.5 }}>
                {t("I've saved my recovery phrase somewhere safe and offline.")}
              </Typography>
            </Box>
          )}
          <Button
            onClick={() => {
              if (requireConfirm) onConfirmedBackup?.();
              handleClose();
            }}
            disabled={requireConfirm && !confirmed}
            fullWidth
            sx={{
              mt: '16px',
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              bgcolor: '#0A0A0F',
              borderRadius: '12px',
              py: '11px',
              '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.2)', color: '#fff' },
              '&:hover': { bgcolor: '#0A0A0F', opacity: 0.85 },
            }}
          >
            {requireConfirm ? t('Done — continue') : t('Done')}
          </Button>
        </>
      )}

      {phase === 'error' && (
        <>
          <Box
            sx={{
              px: '14px',
              py: '12px',
              borderRadius: '12px',
              bgcolor: 'rgba(10,10,15,0.03)',
              border: '1px solid rgba(10,10,15,0.1)',
              mb: '14px',
            }}
          >
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.5 }}>
              {error ?? t('Could not reveal the phrase.')}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', mt: '4px' }}>
              {t('Nothing was exposed. You can try again.')}
            </Typography>
          </Box>
          <Button
            onClick={reveal}
            fullWidth
            sx={{
              textTransform: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: '#0A0A0F',
              border: '1px solid rgba(10,10,15,0.14)',
              borderRadius: '12px',
              py: '11px',
            }}
          >
            {t('Try again')}
          </Button>
        </>
      )}
    </Dialog>
  );
}
