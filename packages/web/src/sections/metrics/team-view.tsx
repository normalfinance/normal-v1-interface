'use client';

import type { ReactNode } from 'react';
import type { MonthlyRow } from '@/lib/metrics/report';
import type {
  SectionKey,
  GasFloatRow,
  ActivityLogRow,
  TeamMetricsSnapshot,
} from '@/lib/metrics/snapshot';

import { fNumber } from '@/utils/format-number';
import { authedFetch } from '@/utils/authed-fetch';
import { useMemo, useState, useEffect } from 'react';
import { SECTION_KEYS } from '@/lib/metrics/snapshot';
import { CHAINS, isChainId } from '@/lib/chains/registry';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { toCsv, MONTHLY_COLUMNS, monthlyReportCsv, buildMonthlyReport } from '@/lib/metrics/report';

import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import {
  fUtc,
  Panel,
  NoData,
  fMoney,
  fLogDate,
  PanelGrid,
  downloadCsv,
  shortAddress,
} from './parts';

// ----------------------------------------------------------------------
// normalfinance.io/dashboard/team: for the team only (signed-in accounts on
// DASHBOARD_TEAM_EMAILS; the API answers everyone else with a 404). Holds
// what should not be public: the relayer gas, the per-wallet activity log,
// plus the monthly report for SDF and investor updates and the sync health.
// ----------------------------------------------------------------------

const SOURCE_LABEL: Record<SectionKey, string> = {
  users: 'Users (Supabase)',
  activity: 'Activity, volume and revenue (database and DeFindex events)',
  walletChains: 'Wallets by chain (database)',
  savingsTvl: 'Savings TVL (DeFindex vault history)',
  yield: 'Yield earned (DeFindex, per saver)',
  holdings: 'Holdings, fee wallets and relayer gas (chain reads)',
};

const ACTION_LABEL: Record<string, string> = {
  swap: 'Swap (Soroswap)',
  swap_lifi: 'Swap (LI.FI)',
  swap_cctp: 'Swap (CCTP)',
  savings_deposit: 'Savings deposit',
  savings_withdraw: 'Savings withdrawal',
  send: 'Send',
  onramp: 'Buy',
  offramp: 'Sell',
};

const GAS_UNIT: Record<string, string> = {
  GAS_BASE: 'ETH',
  GAS_ETHEREUM: 'ETH',
  GAS_STELLAR: 'XLM',
};

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; snapshot: TeamMetricsSnapshot | null }
  | { status: 'denied' }
  | { status: 'error'; message: string };

// ---------------------------------------------------------------------- tables

function SyncHealth({ snapshot }: { snapshot: TeamMetricsSnapshot }) {
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 560 }}>
        <TableHead>
          <TableRow>
            <TableCell>Source</TableCell>
            <TableCell>Last refreshed</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {SECTION_KEYS.map((key) => {
            const section = snapshot.sections[key];
            return (
              <TableRow key={key}>
                <TableCell>{SOURCE_LABEL[key]}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {fUtc(section?.updatedAt ?? null)}
                </TableCell>
                <TableCell>
                  {section?.error ? (
                    <Stack spacing={0.5}>
                      <Chip
                        size="small"
                        variant="soft"
                        // Refreshed in this run but with a note = partial.
                        color={section.updatedAt === snapshot.generatedAt ? 'warning' : 'error'}
                        label={
                          section.updatedAt === snapshot.generatedAt ? 'Partial' : 'Not refreshed'
                        }
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', wordBreak: 'break-word' }}
                      >
                        {section.error}
                      </Typography>
                    </Stack>
                  ) : (
                    <Chip size="small" variant="soft" color="success" label="OK" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function GasTable({ rows }: { rows: GasFloatRow[] }) {
  if (!rows.length) return <NoData />;
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            <TableCell>Wallet</TableCell>
            <TableCell>Top-up address</TableCell>
            <TableCell align="right">Balance</TableCell>
            <TableCell align="right">USD</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.asset}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Typography variant="body2">{row.wallet}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {row.role}
                </Typography>
              </TableCell>
              <TableCell
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  wordBreak: 'break-all',
                  minWidth: 240,
                }}
              >
                {row.address ?? 'Not configured'}
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {fNumber(row.balance, { maximumFractionDigits: 6 })} {GAS_UNIT[row.asset] ?? ''}
              </TableCell>
              <TableCell align="right">{fMoney(row.usd)}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  variant="soft"
                  label={row.verdict}
                  color={
                    row.status === 'top-up' ? 'error' : row.status === 'ok' ? 'success' : 'default'
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function MonthlyTable({ rows }: { rows: MonthlyRow[] }) {
  if (!rows.length) return <NoData />;
  const newestFirst = rows.slice().reverse();
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 1500 }}>
        <TableHead>
          <TableRow>
            {MONTHLY_COLUMNS.map((column) => (
              <TableCell key={column.key} align={column.key === 'month' ? 'left' : 'right'}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {newestFirst.map((row) => (
            <TableRow key={row.month}>
              {MONTHLY_COLUMNS.map((column) => {
                const value = row[column.key];
                return (
                  <TableCell
                    key={column.key}
                    align={column.key === 'month' ? 'left' : 'right'}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    {typeof value === 'number'
                      ? column.money
                        ? fMoney(value)
                        : fNumber(value)
                      : value}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const ACTIVITY_COLUMNS = [
  'Date (UTC)',
  'Wallet',
  'Action',
  'Chain',
  'From',
  'To',
  'Amount',
  'Value (USD)',
  'Fee (USD)',
  'Transaction',
];

function activityCsv(rows: ActivityLogRow[]): string {
  return toCsv(
    ACTIVITY_COLUMNS,
    rows.map((row) => [
      fLogDate(row.date),
      row.wallet,
      ACTION_LABEL[row.action] ?? row.action,
      row.chain,
      row.assetIn,
      row.assetOut,
      row.amount,
      row.amountUsd.toFixed(2),
      row.feeUsd.toFixed(2),
      row.txHash,
    ])
  );
}

function ActivityTable({ rows: allRows }: { rows: ActivityLogRow[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((row) =>
      [
        row.wallet,
        row.txHash,
        row.action,
        ACTION_LABEL[row.action] ?? '',
        row.assetIn,
        row.assetOut,
        row.chain,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [query, allRows]);

  if (!allRows.length) return <NoData />;

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder="Search wallet, transaction, action, chain or asset"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(0);
        }}
        sx={{ maxWidth: 440 }}
      />
      <TableContainer>
        <Table size="small" sx={{ minWidth: 1040 }}>
          <TableHead>
            <TableRow>
              {ACTIVITY_COLUMNS.map((label, i) => (
                <TableCell key={label} align={i >= 6 && i <= 8 ? 'right' : 'left'}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, i) => {
              const href =
                row.txHash && isChainId(row.chain)
                  ? CHAINS[row.chain].explorerTx(row.txHash)
                  : null;
              return (
                <TableRow key={`${row.date}-${row.txHash}-${i}`}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fLogDate(row.date)}</TableCell>
                  <TableCell
                    title={row.wallet}
                    sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    {shortAddress(row.wallet)}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {ACTION_LABEL[row.action] ?? row.action}
                  </TableCell>
                  <TableCell>{isChainId(row.chain) ? CHAINS[row.chain].name : row.chain}</TableCell>
                  <TableCell>{row.assetIn}</TableCell>
                  <TableCell>{row.assetOut}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {fNumber(row.amount, { maximumFractionDigits: 6 })}
                  </TableCell>
                  <TableCell align="right">{fMoney(row.amountUsd)}</TableCell>
                  <TableCell align="right">{fMoney(row.feeUsd)}</TableCell>
                  <TableCell
                    title={row.txHash}
                    sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'nowrap' }}
                  >
                    {href ? (
                      <Link href={href} target="_blank" rel="noopener noreferrer">
                        {shortAddress(row.txHash)}
                      </Link>
                    ) : (
                      shortAddress(row.txHash) || '-'
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[25, 50, 100]}
        onPageChange={(_, next) => setPage(next)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(Number(event.target.value));
          setPage(0);
        }}
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------- page

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Typography variant="h3" component="h1">
        {title}
      </Typography>
      <Typography sx={{ color: 'text.secondary', mt: 1.5 }}>{children}</Typography>
    </Container>
  );
}

export function TeamMetricsView() {
  const { user, isLoading } = useSupabaseAuth();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    // Only signed-in visitors call the API: for a signed-out one, authedFetch's
    // 401 handling would raise the app-wide "session expired" banner.
    if (isLoading || !user) return undefined;
    let cancelled = false;
    setState({ status: 'loading' });
    authedFetch('/api/metrics/team')
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) setState({ status: 'denied' });
        else if (!res.ok)
          setState({ status: 'error', message: `The server answered ${res.status}.` });
        else setState({ status: 'ok', snapshot: (await res.json()).snapshot ?? null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Network error',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, isLoading]);

  const report = useMemo(
    () =>
      state.status === 'ok' && state.snapshot
        ? buildMonthlyReport(state.snapshot, state.snapshot.generatedAt.slice(0, 10))
        : [],
    [state]
  );

  if (isLoading) return <Message title="Team dashboard">Checking your sign-in…</Message>;
  if (!user) {
    return (
      <Message title="Team dashboard">
        For the Normal team only. Sign in with the Login button at the top right, using the email
        that is on the team list.
      </Message>
    );
  }
  if (state.status === 'loading') return <Message title="Team dashboard">Loading…</Message>;
  if (state.status === 'denied') {
    return (
      <Message title="Team dashboard">
        This page is for the Normal team, and {user.email ?? 'this account'} is not on the team
        list. Ask an admin to add it, and make sure the email is confirmed.
      </Message>
    );
  }
  if (state.status === 'error') {
    return <Message title="Team dashboard">Could not load the numbers. {state.message}</Message>;
  }
  const { snapshot } = state;
  if (!snapshot) {
    return (
      <Message title="Team dashboard">
        No numbers yet. They appear after the first daily sync.
      </Message>
    );
  }

  const stamp = snapshot.generatedAt.slice(0, 10);
  const log = snapshot.private.activityLog;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1">
          Team dashboard
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          For the team only. Last update: {fUtc(snapshot.generatedAt)}. The public numbers are on{' '}
          <Link href="/dashboard">the dashboard</Link>.
        </Typography>
      </Stack>

      <PanelGrid>
        <Panel
          wide
          title="Sync health"
          subheader="When each source last refreshed. A stale source keeps its last numbers on both pages."
        >
          <SyncHealth snapshot={snapshot} />
        </Panel>

        <Panel
          wide
          title="Relayer gas"
          subheader="The wallets that pay gas for cross-chain transfers, what is left in each and whether it needs topping up. If one runs dry, a user's money is burned on the source chain and waits."
        >
          <GasTable rows={snapshot.private.gasFloat} />
        </Panel>

        <Panel
          wide
          title="Monthly report"
          subheader="One row per calendar month (UTC), for SDF and investor updates. The current month is still running. Revenue is fees recorded per action; savings is the vault at the month's last reading."
          action={
            <Button
              variant="outlined"
              size="small"
              disabled={!report.length}
              onClick={() =>
                downloadCsv(`normal-monthly-report-${stamp}.csv`, monthlyReportCsv(report))
              }
            >
              Download CSV
            </Button>
          }
        >
          <MonthlyTable rows={report} />
        </Panel>

        <Panel
          wide
          title="Activity"
          subheader={
            log.total > log.rows.length
              ? `Every completed action, newest first. Showing the latest ${fNumber(log.rows.length)} of ${fNumber(log.total)}.`
              : `Every completed action, newest first (${fNumber(log.total)}).`
          }
          action={
            <Button
              variant="outlined"
              size="small"
              disabled={!log.rows.length}
              onClick={() => downloadCsv(`normal-activity-${stamp}.csv`, activityCsv(log.rows))}
            >
              Download CSV
            </Button>
          }
        >
          <ActivityTable rows={log.rows} />
        </Panel>
      </PanelGrid>
    </Container>
  );
}
