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
import { format } from '@normalfinance/utils';
import { buildAuthHeaders } from '@/utils/http';
import { CHAINS, CHAIN_IDS } from '@/lib/chains/registry';
import { useRef, useState, useEffect, useCallback } from 'react';
import { runWebauthnCeremony } from '@/lib/turnkey/webauthn-guard';
import { getTurnkeyWalletInfo, type TurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';

/** One Turnkey wallet (seed) as returned by /api/turnkey/wallets. */
interface WalletSeed {
  walletId: string;
  label: string;
  origin: string;
  isPrimary: boolean;
  addresses: Record<string, string | null>;
}
import { createPasskeyStamper, friendlyTurnkeyError } from '@/lib/turnkey/passkey-stamper';

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
  preselectWalletId,
  /** Mandatory-backup mode (doc 79 D2): after wallet creation the user must
   *  confirm they saved the phrase before the flow proceeds. onClose is
   *  disabled until 'revealed'; onConfirmedBackup fires on the checkbox. */
  requireConfirm = false,
  onConfirmedBackup,
}: {
  open: boolean;
  onClose: () => void;
  /** Open straight onto this wallet (doc 83 phase 2). Settings passes it when
   *  the user asked to export ONE named wallet, so the dialog never starts on
   *  a different seed than the row they clicked. */
  preselectWalletId?: string;
  requireConfirm?: boolean;
  onConfirmedBackup?: () => void;
}) {
  const { t } = useTranslate();
  const [phase, setPhase] = useState<Phase>('warn');
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  // The addresses this ONE phrase restores — shown so the user can SEE it's
  // their whole wallet, not one chain (Niko 2026-08-21: "I don't even know
  // which wallet it is for?"). One HD seed derives all four.
  const [info, setInfo] = useState<TurnkeyWalletInfo | null>(null);
  // doc 83: a sub-organization can hold SEVERAL wallets, each its own phrase
  // with its own addresses. Reading walletId from one place and the addresses
  // from another is what made the old dialog able to show wallet A's
  // addresses above wallet B's phrase. Both now come from the same seed.
  const [seeds, setSeeds] = useState<WalletSeed[]>([]);
  const [seedIndex, setSeedIndex] = useState(0);
  const seed: WalletSeed | null = seeds[seedIndex] ?? null;
  const stamperRef = useRef<{ clear: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    getTurnkeyWalletInfo()
      .then(setInfo)
      .catch(() => {});
    (async () => {
      try {
        const res = await fetch('/api/turnkey/wallets', {
          headers: await buildAuthHeaders(),
          credentials: 'include',
        });
        const data = await res.json();
        const list: WalletSeed[] = Array.isArray(data?.wallets) ? data.wallets : [];
        setSeeds(list);
        const wanted = preselectWalletId
          ? list.findIndex((w) => w.walletId === preselectWalletId)
          : -1;
        setSeedIndex(wanted >= 0 ? wanted : 0);
      } catch {
        // Falls back to the single-wallet path below — export must not depend
        // on this list being reachable.
        setSeeds([]);
      }
    })();
  }, [open, preselectWalletId]);

  // Prefer the SELECTED seed's own addresses; fall back to the wallet row only
  // when the seed list is unavailable (migration pending / older deployment).
  const seedAddress = (id: (typeof CHAIN_IDS)[number]): string | null => {
    if (seed) return seed.addresses[id] ?? null;
    return (info?.[CHAINS[id].addressField] as string | undefined) ?? null;
  };
  const coveredChains = CHAIN_IDS.filter((id) => !!seedAddress(id));

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
      const wallet = await getTurnkeyWalletInfo();
      if (!wallet?.subOrgId) {
        throw new Error(t('No Normal wallet found to export.'));
      }
      setInfo(wallet);
      // The wallet whose phrase we are about to reveal. The selected seed wins
      // over the row: they differ exactly in the case this feature exists for.
      const exportWalletId = seed?.walletId ?? wallet.walletId;
      if (!exportWalletId) {
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

      // Style the phrase inside Turnkey's iframe to match our design — the
      // default is a raw browser textarea (Niko 2026-08-21). We can only
      // reach the iframe's content through this API, never read it.
      await stamper
        .applySettings({
          styles: {
            padding: '0',
            margin: '0',
            borderWidth: '0',
            borderStyle: 'none',
            fontSize: '15px',
            fontWeight: '600',
            fontFamily: '"Geist Mono", ui-monospace, "Courier New", monospace',
            lineHeight: '1.9',
            color: '#0A0A0F',
            backgroundColor: 'transparent',
            width: '100%',
            height: '84px',
            resize: 'none',
            overflowWrap: 'break-word',
            wordWrap: 'break-word',
          },
        })
        .catch(() => {
          /* styling is cosmetic — a failure must never hide the phrase */
        });

      // 2) Ask Turnkey to export, encrypted to the iframe's key, authorized
      //    by the user's PASSKEY (guarded like every ceremony, #51/#63).
      const { TurnkeyClient } = await import('@turnkey/http');
      const client = new TurnkeyClient(
        { baseUrl: 'https://api.turnkey.com' },
        await createPasskeyStamper()
      );
      const activity = await runWebauthnCeremony(() =>
        client.exportWallet({
          type: 'ACTIVITY_TYPE_EXPORT_WALLET',
          timestampMs: String(Date.now()),
          organizationId: wallet.subOrgId,
          parameters: { walletId: exportWalletId, targetPublicKey },
        })
      );
      const bundle = activity?.activity?.result?.exportWalletResult?.exportBundle;
      if (!bundle) throw new Error(t('Turnkey did not return an export bundle.'));

      // 3) Inject the encrypted bundle; the iframe decrypts + renders the
      //    phrase in its own origin. We never see the plaintext.
      await stamper.injectWalletExportBundle(bundle, wallet.subOrgId);
      setPhase('revealed');
    } catch (e: any) {
      teardown();
      setError(friendlyTurnkeyError(e));
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '8px' }}>
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
            'Write it on paper and store it offline. Never type it into any website or share it — Normal will never ask you for it.'
          )}
        </Typography>
      </Box>

      {/* The key clarification: this ONE phrase is the WHOLE wallet. Show the
          exact addresses it restores so the user connects phrase → wallet. */}
      <Box
        sx={{
          px: '14px',
          py: '12px',
          borderRadius: '12px',
          bgcolor: 'rgba(10,10,15,0.03)',
          border: '1px solid rgba(10,10,15,0.08)',
          mb: '16px',
        }}
      >
        <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#0A0A0F', mb: '6px' }}>
          {seeds.length > 1
            ? t('This phrase restores {{label}} — and only these addresses:', {
                label: seed?.label ?? t('this wallet'),
              })
            : t('One phrase — your whole wallet. It restores all of these:')}
        </Typography>

        {/* Only shown when there IS a choice. Each wallet is a different seed
            with different addresses, so picking the wrong one means saving a
            phrase that does not open the wallet you meant. */}
        {seeds.length > 1 && phase === 'warn' && (
          <Stack direction="row" spacing={0.5} sx={{ mb: '8px', flexWrap: 'wrap' }}>
            {seeds.map((w, i) => (
              <Box
                key={w.walletId}
                onClick={() => setSeedIndex(i)}
                sx={{
                  cursor: 'pointer',
                  px: '10px',
                  py: '4px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: i === seedIndex ? '#0A0A0F' : 'rgba(10,10,15,0.15)',
                  color: i === seedIndex ? '#FFF' : 'rgba(10,10,15,0.7)',
                  background: i === seedIndex ? '#0A0A0F' : 'transparent',
                }}
              >
                {w.label}
              </Box>
            ))}
          </Stack>
        )}
        <Stack spacing={0.5}>
          {coveredChains.map((id) => (
            <Stack key={id} direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.55)' }}>
                {CHAINS[id].name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '11.5px',
                  color: 'rgba(10,10,15,0.7)',
                  fontFamily: '"Geist Mono", "Courier New", monospace',
                }}
              >
                {format.fTruncate(seedAddress(id)!, 14)}
              </Typography>
            </Stack>
          ))}
        </Stack>
        <Typography
          sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '8px', lineHeight: 1.5 }}
        >
          {t(
            'Enter these words in MetaMask (Ethereum), Phantom (Solana), Freighter (Stellar) or Sparrow (Bitcoin) and the same addresses come back — even if Normal is unavailable.'
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
          it only holds content once revealed. Styled as a "secret card" — a
          soft framed panel with a small lock header — so the phrase reads as
          part of our UI, not a raw browser textarea. The phrase itself lives
          in Turnkey's iframe (styled via applySettings); we never see it. */}
      <Box sx={{ display: phase === 'revealed' ? 'block' : 'none', mt: '4px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            mb: '8px',
          }}
        >
          <Iconify
            icon="solar:lock-keyhole-minimalistic-bold"
            width={14}
            sx={{ color: 'rgba(10,10,15,0.4)' }}
          />
          <Typography
            sx={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(10,10,15,0.4)',
            }}
          >
            {t('Recovery phrase')}
          </Typography>
        </Box>
        <Box
          id={IFRAME_CONTAINER_ID}
          sx={{
            px: '16px',
            py: '16px',
            borderRadius: '14px',
            border: '1px solid rgba(10,10,15,0.1)',
            bgcolor: '#F6F6F8',
            boxShadow: 'inset 0 1px 2px rgba(10,10,15,0.04)',
            wordBreak: 'break-word',
            // The iframe fills the box; its own textarea is styled transparent
            // (applySettings) so this panel's background shows through.
            '& iframe': { width: '100%', border: '0', display: 'block' },
          }}
        />
      </Box>

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
