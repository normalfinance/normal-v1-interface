'use client';

import * as React from 'react';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Box, Chip, Stack, Typography, Link, Button, Tooltip } from '@mui/material';
import { enqueueSnackbar } from 'notistack';
import { usePersistStore } from '@normalfinance/state';
import { runWithdrawCancelFlow } from '@/lib/mgi/client';

// ---- Shared types (compatible with your mocks & real) ----------------
export type Sep24Kind = 'deposit' | 'withdrawal';
export type Sep24Status =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_external'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'no_market'
  | 'too_small'
  | 'too_large'
  | 'error';

type MaybeAmt = string | number | null | undefined | { amount?: string | number; asset?: string };

export interface Sep24Row {
  id: string;
  kind: Sep24Kind;
  status: Sep24Status;
  amount_in?: MaybeAmt;
  amount_out?: MaybeAmt;
  amount_fee?: MaybeAmt;
  started_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  refunded_at?: string | null;
  more_info_url?: string | null;
  external_transaction_id?: string | null; // MoneyGram reference number (withdraw)
}

// ---- Helpers ---------------------------------------------------------
const pickAmount = (v: MaybeAmt) => {
  if (v == null) return null;
  if (typeof v === 'object' && 'amount' in v) return (v as any).amount ?? null;
  return v;
};
const pickAsset = (v: MaybeAmt) => {
  if (v && typeof v === 'object' && 'asset' in v) return (v as any).asset ?? undefined;
  return undefined;
};
const fmtAmt = (v: MaybeAmt, fallbackAsset?: string) => {
  const amt = pickAmount(v);
  if (amt == null) return '—';
  const asset = pickAsset(v) ?? fallbackAsset ?? 'USDC';
  return `${Number(amt).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${asset}`;
};
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

function statusColor(status: Sep24Status): 'default' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending_user_transfer_start':
    case 'pending_anchor':
    case 'pending_stellar':
    case 'pending_external':
      return 'info';
    case 'no_market':
    case 'too_small':
    case 'too_large':
    case 'expired':
    case 'error':
      return 'warning';
    case 'refunded':
      return 'default';
    default:
      return 'default';
  }
}
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function StatusChip({ status }: { status: Sep24Status }) {
  return <Chip size="small" color={statusColor(status)} label={pretty(status)} />;
}

function canCancel(row: Sep24Row) {
  if (row.kind !== 'withdrawal') return false;
  const terminal: Sep24Status[] = [
    'completed',
    'refunded',
    'expired',
    'no_market',
    'too_small',
    'too_large',
    'error',
  ];
  return !terminal.includes(row.status);
}

// ---- Columns (built as a factory so we can capture handlers) --------
function buildColumns() {
  const columns: GridColDef<Sep24Row>[] = [
    {
      field: 'kind',
      headerName: 'Type',
      width: 120,
      renderCell: ({ value }) => (String(value) === 'withdrawal' ? 'Withdraw' : 'Deposit'),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 210,
      renderCell: ({ value }) => <StatusChip status={String(value) as Sep24Status} />,
    },
    {
      field: 'external_transaction_id',
      headerName: 'Reference #',
      width: 180,
      renderCell: ({ row }) =>
        row.kind === 'withdrawal' ? row.external_transaction_id || '—' : '—',
    },
    {
      field: 'amount_in',
      headerName: 'Amount In (Wallet / Agent)',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }) => fmtAmt(row.amount_in),
    },
    {
      field: 'amount_fee',
      headerName: 'Fees',
      width: 120,
      renderCell: ({ row }) => fmtAmt(row.amount_fee),
    },
    {
      field: 'amount_out',
      headerName: 'Received (Deposit) / Payout (Withdraw)',
      flex: 1.1,
      minWidth: 220,
      renderCell: ({ row }) =>
        row.kind === 'deposit'
          ? fmtAmt(row.amount_out, 'USDC')
          : fmtAmt(row.amount_out /* may be local currency */),
    },
    {
      field: 'started_at',
      headerName: 'Started',
      width: 190,
      renderCell: ({ row }) => fmtDate(row.started_at),
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      width: 190,
      renderCell: ({ row }) => fmtDate(row.updated_at || row.completed_at || row.refunded_at),
    },
    {
      field: 'more_info_url',
      headerName: 'More Info',
      width: 120,
      sortable: false,
      renderCell: ({ value }) =>
        value ? (
          <Link href={String(value)} target="_blank" rel="noopener">
            Open
          </Link>
        ) : (
          '—'
        ),
    },
    {
      field: 'id',
      headerName: 'Transaction ID',
      width: 240,
    },
    // ---- NEW: Actions (Cancel/Refund) --------------------------------
    {
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      sortable: false,
      renderCell: ({ row }) => {
        const disabled = !canCancel(row);
        const title =
          row.kind !== 'withdrawal'
            ? 'Cancel available only for withdrawals'
            : disabled
              ? 'This transaction cannot be canceled'
              : 'Open MoneyGram Cancel UI';
        return (
          <Tooltip title={title}>
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={disabled}
                onClick={async () => {
                  try {
                    const address = usePersistStore.getState().wallet.address as string | undefined;
                    if (!address) {
                      enqueueSnackbar('Connect your wallet first', { variant: 'warning' });
                      return;
                    }
                    enqueueSnackbar('Opening MoneyGram cancel…', { variant: 'info' });

                    await runWithdrawCancelFlow(address, row.id, () => {
                      enqueueSnackbar(
                        'Cancel flow finished. Status will update shortly (refunded).',
                        { variant: 'success' }
                      );
                    });
                  } catch (e: any) {
                    enqueueSnackbar(e?.message || 'Cancel failed', { variant: 'error' });
                  }
                }}
              >
                Cancel
              </Button>
            </span>
          </Tooltip>
        );
      },
    },
  ];
  return columns;
}

// ---- Component -------------------------------------------------------
export default function MoneyGramTransactionsTable({
  rows,
  loading = false,
  title = 'MoneyGram Transactions',
}: {
  rows: Sep24Row[];
  loading?: boolean;
  title?: string;
}) {
  const columns = React.useMemo(() => buildColumns(), []);

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography variant="h6">{title}</Typography>

      <Box
        sx={{
          height: 520,
          width: '100%',
          '& .MuiDataGrid-root': { borderRadius: 2 },
        }}
      >
        <DataGrid<Sep24Row>
          rows={rows}
          getRowId={(r) => r.id}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 10 } },
          }}
          pageSizeOptions={[5, 10, 25]}
          density="compact"
        />
      </Box>
    </Stack>
  );
}
