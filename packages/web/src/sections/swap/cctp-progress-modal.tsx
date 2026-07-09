'use client';

// Step-by-step progress for a cross-ecosystem (CCTP) swap — same visual
// language as the savings deposit steps. The step list depends on direction:
//   in   (BTC/ETH/SOL → USDC on Stellar): lifi → arriving → topup → burn → bridging → done
//   out  (USDC → BTC/ETH/SOL):            burn → bridging → topup → pivot-swap → done
// Everything after the burn also completes/recovers server-side, so closing
// during 'bridging' is always safe (and we say so).

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';

export type CctpStage =
  | 'lifi'
  | 'arriving'
  | 'topup'
  | 'burn'
  | 'bridging'
  | 'pivot-swap'
  | 'done';

interface Props {
  open: boolean;
  direction: 'in' | 'out';
  stage: CctpStage | null;
  error: string | null;
  fromSymbol: string;
  toSymbol: string;
  onClose: () => void;
}

export function CctpProgressModal({ open, direction, stage, error, fromSymbol, toSymbol, onClose }: Props) {
  const { t } = useTranslate();

  const steps: { id: CctpStage; label: string; sub: string }[] =
    direction === 'in'
      ? [
          { id: 'lifi', label: t('Swapping {{sym}} to USDC', { sym: fromSymbol }), sub: t('Via LI.FI · approve in your wallet') },
          { id: 'arriving', label: t('USDC arriving on Base'), sub: t('Cross-chain delivery — a few minutes') },
          { id: 'topup', label: t('Covering network fees'), sub: t('Normal sends gas to your address') },
          { id: 'burn', label: t('Starting the Circle bridge'), sub: t('Approve in your wallet · 1–2 signatures') },
          { id: 'bridging', label: t('Bridging to Stellar'), sub: t('Circle attestation ~20 min — safe to close') },
          { id: 'done', label: t('Done'), sub: t('{{sym}} delivered', { sym: toSymbol }) },
        ]
      : [
          { id: 'burn', label: t('Starting the Circle bridge'), sub: t('Approve in your wallet · 1–2 signatures') },
          { id: 'bridging', label: t('Bridging to Base'), sub: t('Circle attestation — about a minute') },
          { id: 'topup', label: t('Covering network fees'), sub: t('Normal sends gas to your address') },
          { id: 'pivot-swap', label: t('Swapping USDC to {{sym}}', { sym: toSymbol }), sub: t('Via LI.FI · approve in your wallet') },
          { id: 'done', label: t('Done'), sub: t('{{sym}} on its way to your wallet', { sym: toSymbol }) },
        ];

  const activeIdx = stage ? steps.findIndex((s) => s.id === stage) : -1;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: '24px', p: '22px', maxWidth: 400 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '14px' }}>
        <Typography sx={{ fontSize: '17px', fontWeight: 600, color: '#0A0A0F' }}>
          {t('Swapping {{from}} → {{to}}', { from: fromSymbol, to: toSymbol })}
        </Typography>
        <Box component="button" onClick={onClose} sx={{ all: 'unset', cursor: 'pointer', color: 'rgba(10,10,15,0.4)', display: 'flex' }}>
          <Iconify icon="mingcute:close-line" width={20} />
        </Box>
      </Stack>

      <Stack spacing={0}>
        {steps.map((s, idx) => {
          const isDone = stage === 'done' ? s.id !== 'done' || true : idx < activeIdx;
          const isActive = stage === s.id && stage !== 'done';
          const isFinalDone = stage === 'done' && s.id === 'done';
          return (
            <Stack key={s.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: '9px', opacity: isDone || isActive || isFinalDone ? 1 : 0.45 }}>
              <Box sx={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', mt: '1px' }}>
                {isDone || isFinalDone ? (
                  <Iconify icon="lets-icons:check-fill" width={20} sx={{ color: '#1AB37D' }} />
                ) : isActive && !error ? (
                  <CircularProgress size={16} sx={{ color: '#0A0A0F' }} />
                ) : isActive && error ? (
                  <Iconify icon="eva:alert-triangle-fill" width={18} sx={{ color: '#DC2626' }} />
                ) : (
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(10,10,15,0.15)' }} />
                )}
              </Box>
              <Box>
                <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#0A0A0F', lineHeight: 1.35 }}>
                  {s.label}
                </Typography>
                <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', lineHeight: 1.4 }}>
                  {s.sub}
                </Typography>
              </Box>
            </Stack>
          );
        })}
      </Stack>

      {error && (
        <Box sx={{ mt: '12px', px: '12px', py: '10px', borderRadius: '10px', bgcolor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.5 }}>
            {error}
          </Typography>
          <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '4px', lineHeight: 1.5 }}>
            {t('Nothing is lost — your funds stay in your own account. Any transfer needing a nudge appears above the swap card with a one-tap recovery.')}
          </Typography>
        </Box>
      )}

      {stage === 'bridging' && !error && direction === 'in' && (
        <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '10px', textAlign: 'center', lineHeight: 1.5 }}>
          {t('This step runs on our servers — you can safely close this window.')}
        </Typography>
      )}
      {direction === 'out' && stage && stage !== 'done' && !error && (
        <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.45)', mt: '10px', textAlign: 'center', lineHeight: 1.5 }}>
          {t('Please keep this window open until the last signature.')}
        </Typography>
      )}
    </Dialog>
  );
}
