'use client';

// In-flight cross-ecosystem transfers, shown above the swap card. Post-burn
// stages complete server-side (cron + this component's status reads, which
// advance the state machine opportunistically) — the banner reassures the user
// and shows live progress after a closed tab or reload.

import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

interface TransferRow {
  id: string;
  status: string;
  srcAsset: string;
  dstAsset: string;
  amountWire: string;
  burnTxHash: string | null;
}

const STATUS_COPY: Record<string, string> = {
  CREATED: 'Preparing…',
  BURN_SUBMITTED: 'Bridging to Stellar — waiting for Circle (~20 min)',
  BURN_CONFIRMED: 'Bridging to Stellar — waiting for Circle (~20 min)',
  ATTESTED: 'Delivering on Stellar…',
  MINT_SUBMITTED: 'Delivering on Stellar…',
};

export function CctpResumeBanner() {
  const { t } = useTranslate();
  const { user } = useSupabaseAuth();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);

  const refresh = useCallback(async () => {
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/cctp/transfers', { headers, credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const pending: TransferRow[] = (data.transfers ?? []).filter(
        (tr: TransferRow) => tr.status !== 'COMPLETED' && tr.burnTxHash // pre-burn rows aren't in-flight value
      );
      setTransfers(pending);
      // Status reads advance the machine — poke the newest one each cycle.
      if (pending[0]) {
        fetch(`/api/cctp/transfers/${pending[0].id}`, { headers, credentials: 'include' }).catch(() => {});
      }
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [user, refresh]);

  if (!transfers.length) return null;

  return (
    <Box sx={{ mb: '12px', p: '12px 16px', borderRadius: '14px', bgcolor: 'rgba(110,139,255,0.07)', border: '1px solid rgba(110,139,255,0.25)' }}>
      {transfers.map((tr) => (
        <Stack key={tr.id} direction="row" spacing={1.5} alignItems="center" sx={{ py: '4px' }}>
          <CircularProgress size={14} sx={{ color: '#3E51B1', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F' }}>
              {t('{{amount}} USDC · {{from}} → {{to}} in transit', {
                amount: (Number(tr.amountWire) / 1e6).toFixed(2),
                from: tr.srcAsset,
                to: tr.dstAsset,
              })}
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.5)' }}>
              {t(STATUS_COPY[tr.status] ?? 'Processing…')} · {t('completes automatically')}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Box>
  );
}
