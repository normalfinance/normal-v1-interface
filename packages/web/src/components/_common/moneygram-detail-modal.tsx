'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { refreshMgiStatus } from '@/lib/mgi/db';
import { openTxInAnchorUI } from '@/lib/mgi/client';
import { usePersistStore } from '@normalfinance/state';
import { useMgiTransactions } from '@/hooks/use-mgi-transactions';
import { FAILED_MGI_STATUSES, PENDING_MGI_STATUSES } from '@/lib/mgi/statuses';

import {
  Box,
  Chip,
  Stack,
  Button,
  Dialog,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

// ---------------------------------------------------------------------------
// Detail view for one MoneyGram transaction, opened from an activity row or
// the pending banner. Renders from OUR db row (no SEP-10 needed to look);
// "Refresh status" fetches fresh state from MoneyGram — that one may prompt
// the wallet passkey when no SEP-10 token is cached, which is fine here
// because it's an explicit user click.
// ---------------------------------------------------------------------------

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontSize: '12px',
} as const;

function statusColor(status: string): 'default' | 'info' | 'success' | 'warning' {
  if (status === 'completed') return 'success';
  if (PENDING_MGI_STATUSES.has(status)) return 'info';
  if (FAILED_MGI_STATUSES.has(status)) return 'warning';
  return 'default';
}

function fmtUpdated(iso: string, t: (k: string) => string): string {
  const diff = Date.now() - Date.parse(iso);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('just now');
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MoneyGramDetailModal({
  open,
  txId,
  onClose,
}: {
  open: boolean;
  txId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const { wallet } = usePersistStore();
  const { transactions, mutate } = useMgiTransactions(open);
  const [refreshing, setRefreshing] = useState(false);

  const tx = txId ? (transactions.find((x) => x.id === txId) ?? null) : null;
  const address = wallet.address;

  const handleRefresh = async () => {
    if (!address || !txId || refreshing) return;
    setRefreshing(true);
    try {
      await refreshMgiStatus(address, txId);
      await mutate();
    } catch {
      /* transient — the row keeps its last known state */
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: '100%', maxWidth: 400 } } }}
    >
      <DialogTitle sx={{ p: 2, pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="text.primary">
            {tx?.kind === 'withdrawal' ? t('MoneyGram cash-out') : t('MoneyGram cash deposit')}
          </Typography>
          <IconButton onClick={onClose} aria-label="close dialog">
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {!tx ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {t('Amount')}
                </Typography>
                <Typography variant="subtitle2">
                  {tx.amount ? `$${parseFloat(tx.amount).toFixed(2)} USDC` : '—'}
                </Typography>
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {t('Status')}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    color={statusColor(tx.status)}
                    label={tx.status.replace(/_/g, ' ')}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {fmtUpdated(tx.updatedAt, t)}
                  </Typography>
                </Stack>
              </Stack>

              {tx.externalTransactionId && (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {t('Reference number')}
                  </Typography>
                  <Typography sx={{ ...MONO, fontWeight: 600 }}>
                    {tx.externalTransactionId}
                  </Typography>
                </Stack>
              )}

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {t('Transaction ID')}
                </Typography>
                <Typography sx={{ ...MONO, color: 'text.secondary' }}>
                  {tx.id.slice(0, 8)}…
                </Typography>
              </Stack>
            </Stack>

            {tx.kind === 'deposit' && PENDING_MGI_STATUSES.has(tx.status) && (
              <Typography variant="caption" color="text.secondary">
                {t(
                  'Drop off the cash at the MoneyGram location you selected — no code needed. Your USDC arrives shortly after paying.'
                )}
              </Typography>
            )}

            <Stack spacing={1}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleRefresh}
                disabled={refreshing}
                startIcon={
                  refreshing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <Iconify icon="solar:refresh-bold" />
                  )
                }
              >
                {t('Refresh status')}
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => address && openTxInAnchorUI(address, tx.id)}
                startIcon={<Iconify icon="solar:document-text-bold" />}
              >
                {t('Open MoneyGram details')}
              </Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
