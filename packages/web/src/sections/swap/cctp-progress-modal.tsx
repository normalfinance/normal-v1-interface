'use client';

import { useEffect } from 'react';
// Step-by-step progress for a cross-ecosystem (CCTP) swap — same visual
// language as the savings deposit steps. The step list depends on direction:
//   in   (BTC/ETH/SOL → USDC on Stellar): lifi → arriving → topup → burn → bridging → done
//   out  (USDC → BTC/ETH/SOL):            burn → bridging → topup → pivot-swap → done
// Everything after the burn also completes/recovers server-side, so closing
// during 'bridging' is always safe (and we say so).
import { useTranslate } from '@/locales';
import { CHAINS } from '@/lib/chains/registry';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

export type CctpStage =
  | 'funding'
  | 'burn-prepare'
  | 'lifi'
  | 'arriving'
  | 'topup'
  | 'burn'
  | 'bridging'
  | 'pivot-swap'
  | 'delivering'
  | 'done';

// Chain-honest ETA text, derived from the registry's settlement window —
// never hardcoded per chain in copy (2026-08-19 lesson).
const CHAIN_OF: Record<string, 'bitcoin' | 'ethereum' | 'solana'> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
};
function settlementEta(symbol: string): string {
  const chain = CHAIN_OF[symbol];
  if (!chain) return 'a few minutes';
  const { minMinutes, maxMinutes } = CHAINS[chain].settlement;
  return maxMinutes <= 5 ? 'a few minutes' : `usually ${minMinutes}–${maxMinutes} minutes`;
}

interface Props {
  open: boolean;
  direction: 'in' | 'out';
  stage: CctpStage | null;
  error: string | null;
  fromSymbol: string;
  toSymbol: string;
  /** #32 chunk 4b: this run started by moving USDC from the external wallet. */
  includeFunding?: boolean;
  fundingWalletLabel?: string;
  /** #33: is the server-side autopilot active for this user? true = the
   *  mid-flow Base signature runs itself (step copy says so); false = the
   *  inline Enable offer shows during the wait — enabling mid-swap still
   *  helps THIS swap, because the engine re-checks right before that step.
   *  null/undefined = unknown → neutral copy, no offer. */
  autopilot?: boolean | null;
  onEnableAutopilot?: () => void;
  onClose: () => void;
  /** Honest-bridge-endings (Niko): one tap back to a retryable card after a
   *  terminal error — clears the failed run; quote + amount stay filled. */
  onTryAgain?: () => void;
  /** Outbound failures only: abandon the swap and bridge the minted USDC back
   *  to Stellar. Offered IN the failure box (Niko 2026-08-26: "the return
   *  usdc should be in that pop up") so the exit never requires finding the
   *  banner first. */
  onBringBack?: () => void;
  /** Bring-back-in-modal (Niko 2026-08-27): when set, the popup stays open
   *  and shows the REFUND checklist instead of the swap steps. */
  refundStage?: 'topup' | 'burn' | 'done' | null;
  /** Doc 93 0b: why a refund started automatically. */
  refundNotice?: string | null;
  /** Niko 2026-08-28: the swap ended WITHOUT moving funds (source leg
   *  reverted on-chain, or the bridge refunded). Rendered as a calm grey
   *  panel with a Close button — deliberately not the red error surface,
   *  and deliberately without Try again: there is nothing to retry, the
   *  right next step is a fresh swap. */
  calmEnding?: string | null;
}

import { classifyCctpFailure } from './cctp-failure-copy';

const TX_HASH_RE = /0x[0-9a-fA-F]{64}/;

function extractTxHash(raw: string | null): string | null {
  if (!raw) return null;
  return TX_HASH_RE.exec(raw)?.[0] ?? null;
}

/** Raw chain errors are for explorers, not people (Niko 2026-08-26: "that
 *  error was not user friendly"). The hash still renders — small, below.
 *
 *  Doc 95 Wave 7: this used to be a SECOND classifier running over text the
 *  engine had already made friendly, and its bare /network/ pattern rewrote
 *  "Not enough ETH left to pay the NETWORK fee" into "the network did not
 *  answer — try again" — advice for a retry that cannot succeed. The decision
 *  now lives in cctp-failure-copy.ts, is pinned by tests, and only ever ADDS
 *  the one thing the shared classifier cannot know: that on a CCTP swap the
 *  money is safe at the user's own Base address. */
function friendlyError(raw: string, t: (k: string) => string): string {
  return classifyCctpFailure(raw) === 'route-failed'
    ? t(
        'The exchange route failed on the provider side — your USDC is safe in your own account. You can retry, or bring it back as USDC.'
      )
    : raw;
}

export function CctpProgressModal({
  open,
  direction,
  stage: runStage,
  error,
  fromSymbol,
  toSymbol,
  includeFunding = false,
  fundingWalletLabel,
  autopilot = null,
  onEnableAutopilot,
  onClose,
  onTryAgain,
  onBringBack,
  refundStage = null,
  refundNotice = null,
  calmEnding = null,
}: Props) {
  const { t } = useTranslate();
  // Refund mode reuses the whole step machinery below unchanged.
  const stage = refundStage ?? runStage;

  // Instant recovery surface (Niko 2026-08-26: "that thing above the swap
  // card should also show instantly"): the moment a failure is on screen, the
  // banner is told to bypass its freshness grace and re-read.
  useEffect(() => {
    if (open && error) window.dispatchEvent(new Event('nf:cctp-halted'));
  }, [open, error]);

  const steps: { id: CctpStage; label: string; sub: string }[] = refundStage
    ? [
        {
          id: 'topup',
          label: t('Covering network fees'),
          sub: t('Normal sends gas to your address'),
        },
        {
          id: 'burn',
          label: t('Sending your USDC back'),
          sub: t('Approve in your wallet'),
        },
        {
          id: 'done',
          label: t('Returning to Stellar'),
          sub: t('Completes automatically (~20 min) — safe to close'),
        },
      ]
    : direction === 'in'
      ? [
          {
            id: 'lifi',
            label: t('Swapping {{sym}} to USDC', { sym: fromSymbol }),
            sub: t('Via LI.FI · approve in your wallet'),
          },
          {
            id: 'arriving',
            label: t('USDC arriving on Base'),
            sub: t('Cross-chain delivery — {{eta}}', { eta: settlementEta(fromSymbol) }),
          },
          {
            id: 'topup',
            label: t('Covering network fees'),
            sub: t('Normal sends gas to your address'),
          },
          {
            id: 'burn',
            label: t('Starting the Circle bridge'),
            sub: autopilot
              ? t('Automatic — no signature needed')
              : t('Approve in your wallet · 1–2 signatures'),
          },
          {
            id: 'bridging',
            label: t('Bridging to Stellar'),
            sub: t('Circle attestation ~20 min — safe to close'),
          },
          { id: 'done', label: t('Done'), sub: t('{{sym}} delivered', { sym: toSymbol }) },
        ]
      : [
          // #32 chunk 4b: swapping FROM the external wallet starts with the
          // visible funding move — never a silent transfer.
          ...(includeFunding
            ? [
                {
                  id: 'funding' as CctpStage,
                  label: t('Moving USDC from {{wallet}}', {
                    wallet: fundingWalletLabel ?? t('your connected wallet'),
                  }),
                  sub: t('Approve in your wallet — funds go to your own Normal wallet'),
                },
              ]
            : []),
          {
            id: 'burn-prepare',
            label: t('Preparing the bridge transaction'),
            sub: t('A few seconds — no action needed yet'),
          },
          {
            id: 'burn',
            label: t('Starting the Circle bridge'),
            sub: t('Approve in your wallet · 1–2 signatures'),
          },
          {
            id: 'bridging',
            label: t('Bridging to Base'),
            sub: t('Circle attestation — about a minute'),
          },
          {
            id: 'topup',
            label: t('Covering network fees'),
            sub: t('Normal sends gas to your address'),
          },
          {
            id: 'pivot-swap',
            label: t('Swapping USDC to {{sym}}', { sym: toSymbol }),
            sub: autopilot
              ? t('Via LI.FI · automatic — no signature needed')
              : t('Via LI.FI · approve in your wallet'),
          },
          {
            id: 'delivering' as CctpStage,
            label: t('Delivering {{sym}}', { sym: toSymbol }),
            sub: t('Cross-chain arrival — {{eta}}', { eta: settlementEta(toSymbol) }),
          },
          {
            id: 'done',
            label: t('Done'),
            sub: t('{{sym}} delivered', { sym: toSymbol }),
          },
        ];

  const activeIdx = stage ? steps.findIndex((s) => s.id === stage) : -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '24px', p: '22px', maxWidth: 400 } }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: '14px' }}
      >
        <Box sx={{ pr: 1 }}>
          <Typography sx={{ fontSize: '17px', fontWeight: 600, color: '#0A0A0F' }}>
            {t('Swapping {{from}} → {{to}}', { from: fromSymbol, to: toSymbol })}
          </Typography>
          {stage && stage !== 'done' && (
            <Typography
              sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', mt: '3px', lineHeight: 1.4 }}
            >
              {autopilot
                ? t('One signing step — everything after the bridge completes automatically.')
                : direction === 'out'
                  ? t(
                      'Two signing steps: Stellar now, then Base after the bridge — keep this open.'
                    )
                  : t(
                      'Two signing steps: {{sym}} now, then Base after the bridge — keep this open.',
                      { sym: fromSymbol }
                    )}
            </Typography>
          )}
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            all: 'unset',
            width: 28,
            height: 28,
            borderRadius: '8px',
            bgcolor: 'rgba(10,10,15,0.06)',
            cursor: 'pointer',
            color: '#0A0A0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 150ms ease',
            '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
          }}
        >
          <Iconify icon="mingcute:close-line" width={16} />
        </Box>
      </Stack>

      <Stack spacing={0}>
        {refundNotice && (
          <Box
            sx={{
              display: 'flex',
              gap: '8px',
              p: '10px 12px',
              borderRadius: '10px',
              bgcolor: 'rgba(37,99,235,0.07)',
              border: '1px solid rgba(37,99,235,0.18)',
              mb: '10px',
            }}
          >
            <Typography sx={{ fontSize: '12.5px', color: '#1E3A8A', lineHeight: 1.45 }}>
              {refundNotice}
            </Typography>
          </Box>
        )}
        {steps.map((s, idx) => {
          const isDone = stage === 'done' ? s.id !== 'done' || true : idx < activeIdx;
          const isActive = stage === s.id && stage !== 'done';
          const isFinalDone = stage === 'done' && s.id === 'done';
          return (
            <Stack
              key={s.id}
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              sx={{ py: '9px', opacity: isDone || isActive || isFinalDone ? 1 : 0.45 }}
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
                {isDone || isFinalDone ? (
                  <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                ) : isActive && calmEnding && !error ? (
                  // The journey stopped here and nothing is wrong with the
                  // user's funds — a quiet marker, not a red alarm.
                  <Iconify
                    icon="eva:minus-circle-outline"
                    width={18}
                    sx={{ color: 'rgba(10,10,15,0.35)' }}
                  />
                ) : isActive && !error ? (
                  <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
                ) : isActive && error ? (
                  <Iconify icon="eva:alert-triangle-fill" width={18} sx={{ color: '#DC2626' }} />
                ) : (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'rgba(10,10,15,0.15)',
                    }}
                  />
                )}
              </Box>
              <Box>
                <Typography
                  sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.35 }}
                >
                  {s.label}
                </Typography>
                <Typography
                  sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', lineHeight: 1.4 }}
                >
                  {s.sub}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>

      {/* #33: the in-wait Enable offer (Niko 2026-08-21: "the parts in
          between could last 1h so the user would have to sit there to sign
          again"). Shown only while autopilot is provably OFF and the
          signature step hasn't happened yet — enabling here makes THIS swap
          finish itself, because the engine re-checks status right before
          that step. */}
      {!error &&
        !calmEnding &&
        autopilot === false &&
        !!onEnableAutopilot &&
        stage &&
        activeIdx >= 0 &&
        activeIdx <
          steps.findIndex((s) => s.id === (direction === 'in' ? 'burn' : 'pivot-swap')) && (
          <Box
            sx={{
              mt: '12px',
              px: '12px',
              py: '10px',
              borderRadius: '10px',
              bgcolor: 'rgba(10,10,15,0.03)',
              border: '1px solid rgba(10,10,15,0.08)',
            }}
          >
            <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.5 }}>
              {t(
                "Don't want to wait around for the next signature? Enable automatic completion and this swap finishes by itself."
              )}
            </Typography>
            <Box
              component="button"
              onClick={onEnableAutopilot}
              sx={{
                mt: '8px',
                appearance: 'none',
                border: '1px solid rgba(10,10,15,0.14)',
                borderRadius: '10px',
                px: '14px',
                py: '7px',
                fontSize: '12.5px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: '#fff',
                color: '#0A0A0F',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.04)' },
              }}
            >
              {t('Enable auto-finish')}
            </Box>
          </Box>
        )}

      {calmEnding && !error && (
        <Box
          sx={{
            mt: '12px',
            px: '14px',
            py: '12px',
            borderRadius: '10px',
            bgcolor: 'rgba(10,10,15,0.03)',
            border: '1px solid rgba(10,10,15,0.08)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Iconify
              icon="eva:info-outline"
              width={15}
              sx={{ color: 'rgba(10,10,15,0.45)', mt: '2px', flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}>
              {calmEnding}
            </Typography>
          </Stack>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              mt: '12px',
              appearance: 'none',
              border: '1px solid rgba(10,10,15,0.15)',
              borderRadius: '10px',
              px: '16px',
              py: '9px',
              width: '100%',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
              bgcolor: '#fff',
              color: '#0A0A0F',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.04)' },
            }}
          >
            {t('Close')}
          </Box>
        </Box>
      )}
      {error && (
        <Box
          sx={{
            mt: '12px',
            px: '12px',
            py: '10px',
            borderRadius: '10px',
            bgcolor: 'rgba(220,38,38,0.05)',
            border: '1px solid rgba(220,38,38,0.15)',
          }}
        >
          <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.5 }}>
            {friendlyError(error, t)}
          </Typography>
          {extractTxHash(error) && (
            <Typography
              sx={{
                fontSize: '10.5px',
                color: 'rgba(10,10,15,0.4)',
                mt: '3px',
                fontFamily: '"Geist Mono", "Courier New", monospace',
                wordBreak: 'break-all',
              }}
            >
              {extractTxHash(error)}
            </Typography>
          )}
          <Typography
            sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '4px', lineHeight: 1.5 }}
          >
            {t(
              'Nothing is lost — your funds stay in your own account. Any transfer needing a nudge appears above the swap card with a one-tap recovery.'
            )}
          </Typography>
          {onTryAgain && (
            <Box
              component="button"
              onClick={onTryAgain}
              sx={{
                mt: '10px',
                appearance: 'none',
                border: 'none',
                borderRadius: '10px',
                px: '16px',
                py: '9px',
                width: '100%',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: '#0A0A0F',
                color: '#fff',
                '&:hover': { opacity: 0.85 },
              }}
            >
              {t('Try again')}
            </Box>
          )}
          {onBringBack && (
            <Box
              component="button"
              onClick={onBringBack}
              sx={{
                mt: '8px',
                appearance: 'none',
                borderRadius: '10px',
                px: '16px',
                py: '9px',
                width: '100%',
                fontSize: '13px',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: 'transparent',
                border: '1px solid rgba(10,10,15,0.2)',
                color: '#0A0A0F',
                '&:hover': { borderColor: 'rgba(10,10,15,0.45)' },
              }}
            >
              {t('Bring back as USDC')}
            </Box>
          )}
        </Box>
      )}

      {stage === 'bridging' && !error && direction === 'in' && (
        <Typography
          sx={{
            fontSize: '11.5px',
            color: 'rgba(10,10,15,0.45)',
            mt: '10px',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {t('This step runs on our servers — you can safely close this window.')}
        </Typography>
      )}
    </Dialog>
  );
}
