'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { PENDING_MGI_STATUSES } from '@/lib/mgi/statuses';
import { useMgiTransactions } from '@/hooks/use-mgi-transactions';

import { Box, Stack, Button, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import MoneyGramDetailModal from './moneygram-detail-modal';

// ---------------------------------------------------------------------------
// In-flight MoneyGram transactions pinned above the USDC activity table, so a
// user who closed the deposit dialog (or reloads on another day/device) can
// still see and manage the pending cash drop-off. Renders from OUR db rows —
// zero SEP-10/passkey involvement until the user opens details.
// ---------------------------------------------------------------------------

export default function MoneyGramPendingBanner() {
  const { t } = useTranslate();
  const { transactions } = useMgiTransactions();
  const [detailId, setDetailId] = useState<string | null>(null);

  const pending = transactions.filter((tx) => PENDING_MGI_STATUSES.has(tx.status)).slice(0, 3);
  if (!pending.length) return null;

  return (
    <>
      <Stack spacing={1} sx={{ mb: 2 }}>
        {pending.map((tx) => (
          <Box
            key={tx.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              px: '16px',
              py: '12px',
              borderRadius: '12px',
              bgcolor: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
            }}
          >
            <Iconify icon="solar:hand-money-bold" width={22} style={{ color: '#B45309' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ color: '#92400E' }}>
                {tx.kind === 'deposit'
                  ? t('MoneyGram cash deposit pending')
                  : t('MoneyGram cash-out pending')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#B45309' }}>
                {tx.amount ? `$${parseFloat(tx.amount).toFixed(2)} USDC · ` : ''}
                {tx.kind === 'deposit'
                  ? t('drop off the cash at your chosen location to complete it')
                  : t('awaiting completion')}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => setDetailId(tx.id)}
              sx={{ flexShrink: 0 }}
            >
              {t('Details')}
            </Button>
          </Box>
        ))}
      </Stack>

      <MoneyGramDetailModal open={!!detailId} txId={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}
