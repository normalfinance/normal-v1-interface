'use client';

import type { ReactNode } from 'react';
import type {
  Point,
  Slice,
  SectionKey,
  GasFloatRow,
  StackedDaily,
  PublicMetricsSnapshot,
} from '@/lib/metrics/snapshot';

import { useMemo, useState } from 'react';
import { CHAINS, isChainId } from '@/lib/chains/registry';
import { fNumber, fCurrency } from '@/utils/format-number';
import { SECTION_KEYS, PRE_RECORDING_FEES } from '@/lib/metrics/snapshot';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { useTheme, useColorScheme } from '@mui/material/styles';

import { Chart, useChart } from '@/components/template/chart';

// ----------------------------------------------------------------------
// normalfinance.io/dashboard: the charts that used to live on Dune, read from
// the snapshot the daily sync saves (lib/metrics/snapshot.ts). Nothing here
// computes a figure; it only draws what the snapshot holds.
// ----------------------------------------------------------------------

const PRODUCT_LABEL: Record<string, string> = {
  savings: 'Savings',
  cctp: 'CCTP',
  soroswap: 'Soroswap',
  lifi: 'LI.FI',
  send: 'Sends',
  ramp: 'Buy and sell',
  [PRE_RECORDING_FEES]: 'LI.FI, before recording',
};

// One colour per product, the same on every chart, from the validated
// categorical order (dataviz reference palette; light and dark steps).
const PRODUCT_COLOR: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    savings: '#2a78d6',
    cctp: '#eb6834',
    soroswap: '#1baf7a',
    lifi: '#eda100',
    send: '#e87ba4',
    ramp: '#008300',
    [PRE_RECORDING_FEES]: '#6250d6',
  },
  dark: {
    savings: '#3987e5',
    cctp: '#d95926',
    soroswap: '#199e70',
    lifi: '#c98500',
    send: '#d55181',
    ramp: '#008300',
    [PRE_RECORDING_FEES]: '#9085e9',
  },
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

const SECTION_LABEL: Record<SectionKey, string> = {
  users: 'users',
  activity: 'activity, volume and revenue',
  walletChains: 'wallets by chain',
  savingsTvl: 'savings deposits',
  yield: 'yield earned',
  holdings: 'holdings and relayer gas',
};

const ASSET_LABEL: Record<string, string> = { SAVINGS: 'Savings' };

const GAS_UNIT: Record<string, string> = {
  GAS_BASE: 'ETH',
  GAS_ETHEREUM: 'ETH',
  GAS_STELLAR: 'XLM',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ----------------------------------------------------------------------

const fMoney = (value: number) =>
  fCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fMoneyShort = (value: number) =>
  fCurrency(value, { notation: 'compact', maximumFractionDigits: 1 });
const round2 = (value: number) => Math.round(value * 100) / 100;
const dayTime = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** "13 Nov 2026, 05:09 UTC", the same on the server and in every browser. */
function fUtc(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

function fLogDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace('T', ' ');
}

function shortAddress(value: string): string {
  return value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
}

function useIsDark(): boolean {
  const { mode, systemMode } = useColorScheme();
  return (mode === 'system' ? systemMode : mode) === 'dark';
}

function useProductColor() {
  const palette = PRODUCT_COLOR[useIsDark() ? 'dark' : 'light'];
  return (product: string) => palette[product] ?? '#8a8a8a';
}

const productLabel = (product: string) => PRODUCT_LABEL[product] ?? product;
const chainColor = (chain: string) => (isChainId(chain) ? CHAINS[chain].brandColor : '#8a8a8a');
const chainLabel = (chain: string) => (isChainId(chain) ? CHAINS[chain].name : chain);

// ----------------------------------------------------------------------

function Panel({
  title,
  subheader,
  children,
  wide,
}: {
  title: string;
  subheader?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Card
      sx={{
        p: { xs: 2, md: 3 },
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        gridColumn: wide ? { md: '1 / -1' } : undefined,
      }}
    >
      <Box>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {subheader && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {subheader}
          </Typography>
        )}
      </Box>
      {children}
    </Card>
  );
}

function NoData() {
  return (
    <Box
      sx={{
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
      }}
    >
      <Typography variant="body2">No data yet</Typography>
    </Box>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h4" component="p" sx={{ mt: 1, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
    </Card>
  );
}

// ---------------------------------------------------------------------- charts

function TimeChart({
  points,
  name,
  type,
  money,
}: {
  points: Point[];
  name: string;
  type: 'bar' | 'line' | 'area';
  money?: boolean;
}) {
  const theme = useTheme();
  const format = (value: number) => (money ? fMoney(value) : fNumber(value));
  const options = useChart({
    colors: [theme.palette.primary.main],
    xaxis: { type: 'datetime', labels: { datetimeUTC: true } },
    yaxis: {
      labels: { formatter: (value: number) => (money ? fMoneyShort(value) : fNumber(value)) },
    },
    tooltip: { x: { format: 'dd MMM yyyy' }, y: { formatter: format } },
    stroke: { width: type === 'bar' ? 0 : 2, curve: 'straight' },
    fill:
      type === 'area'
        ? { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.04 } }
        : { type: 'solid', opacity: 1 },
    plotOptions: { bar: { columnWidth: '85%' } },
    dataLabels: { enabled: false },
    legend: { show: false },
  });
  if (!points.length) return <NoData />;
  return (
    <Chart
      type={type}
      series={[
        {
          name,
          data: points.map((p): [number, number] => [dayTime(p.day), round2(p.value)]),
        },
      ]}
      options={options}
      sx={{ height: 300 }}
    />
  );
}

function StackedChart({
  data,
  type,
  colorOf,
  labelOf,
  money,
}: {
  data: StackedDaily;
  type: 'bar' | 'area';
  colorOf: (name: string) => string;
  labelOf: (name: string) => string;
  money?: boolean;
}) {
  const format = (value: number) => (money ? fMoney(value) : fNumber(value));
  const options = useChart({
    chart: { stacked: true },
    colors: data.series.map((s) => colorOf(s.name)),
    xaxis: { type: 'datetime', labels: { datetimeUTC: true } },
    yaxis: {
      labels: { formatter: (value: number) => (money ? fMoneyShort(value) : fNumber(value)) },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'dd MMM yyyy' },
      y: { formatter: format },
    },
    stroke: { width: type === 'bar' ? 0 : 1.5, curve: 'straight' },
    fill: { type: 'solid', opacity: type === 'area' ? 0.8 : 1 },
    plotOptions: { bar: { columnWidth: '85%' } },
    dataLabels: { enabled: false },
    legend: { show: true, position: 'top', horizontalAlign: 'left' },
  });
  if (!data.days.length || !data.series.length) return <NoData />;
  return (
    <Chart
      type={type}
      series={data.series.map((s) => ({
        name: labelOf(s.name),
        data: data.days.map((day, i): [number, number] => [dayTime(day), round2(s.data[i] ?? 0)]),
      }))}
      options={options}
      sx={{ height: 320 }}
    />
  );
}

function DonutChart({ slices, colorOf }: { slices: Slice[]; colorOf: (name: string) => string }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const options = useChart({
    labels: slices.map((s) => productLabel(s.label)),
    colors: slices.map((s) => colorOf(s.label)),
    legend: {
      show: true,
      position: 'bottom',
      // Values sit in the legend: a thin slice never hides its number.
      formatter: (name: string, opts: any) =>
        `${name}: ${fMoney(opts?.w?.globals?.series?.[opts.seriesIndex] ?? 0)}`,
    },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (value: number) => fMoney(value) } },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            value: { formatter: (value: string) => fMoney(Number(value)) },
            total: { show: true, label: 'Total', formatter: () => fMoney(total) },
          },
        },
      },
    },
  });
  if (!slices.length) return <NoData />;
  return (
    <Chart
      type="donut"
      series={slices.map((s) => round2(s.value))}
      options={options}
      sx={{ height: 360 }}
    />
  );
}

function RankedBars({
  rows,
  name,
  money,
}: {
  rows: { label: string; value: number }[];
  name: string;
  money?: boolean;
}) {
  const theme = useTheme();
  const format = (value: number) => (money ? fMoney(value) : fNumber(value));
  const options = useChart({
    colors: [theme.palette.primary.main],
    plotOptions: { bar: { horizontal: true, barHeight: '70%', borderRadius: 2 } },
    xaxis: {
      categories: rows.map((r) => r.label),
      labels: {
        formatter: (value: string) => (money ? fMoneyShort(Number(value)) : fNumber(Number(value))),
      },
    },
    tooltip: { y: { formatter: format } },
    dataLabels: { enabled: false },
    legend: { show: false },
  });
  if (!rows.length) return <NoData />;
  return (
    <Chart
      type="bar"
      series={[{ name, data: rows.map((r) => round2(r.value)) }]}
      options={options}
      sx={{ height: Math.max(220, rows.length * 30 + 60) }}
    />
  );
}

// ---------------------------------------------------------------------- tables

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

function ActivityTable({ snapshot }: { snapshot: PublicMetricsSnapshot }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snapshot.activityLog.rows;
    return snapshot.activityLog.rows.filter((row) =>
      [
        row.wallet,
        row.txHash,
        row.action,
        ACTION_LABEL[row.action] ?? '',
        row.assetIn,
        row.assetOut,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [query, snapshot.activityLog.rows]);

  if (!snapshot.activityLog.rows.length) return <NoData />;

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder="Search wallet, transaction, action or asset"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(0);
        }}
        sx={{ maxWidth: 420 }}
      />
      <TableContainer>
        <Table size="small" sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date (UTC)</TableCell>
              <TableCell>Wallet</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Value</TableCell>
              <TableCell align="right">Fee</TableCell>
              <TableCell>Transaction</TableCell>
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

export function MetricsView({ snapshot }: { snapshot: PublicMetricsSnapshot | null }) {
  const productColor = useProductColor();

  if (!snapshot) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
        <Typography variant="h3" component="h1">
          Dashboard
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 1 }}>
          No numbers yet. They appear after the first daily sync.
        </Typography>
      </Container>
    );
  }

  const stale = SECTION_KEYS.filter((key) => snapshot.sections[key]?.error);
  const log = snapshot.activityLog;

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1">
          Dashboard
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Normal in numbers, refreshed once a day. Last update: {fUtc(snapshot.generatedAt)}.
        </Typography>
      </Stack>

      {stale.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          The last update could not refresh{' '}
          {stale
            .map(
              (key) =>
                `${SECTION_LABEL[key]} (shown as of ${fUtc(snapshot.sections[key].updatedAt)})`
            )
            .join(', ')}
          .
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          mb: { xs: 2, md: 3 },
        }}
      >
        <Kpi label="Registered users" value={fNumber(snapshot.users.total)} />
        <Kpi label="Total volume, all time" value={fMoney(snapshot.volume.totalUsd)} />
        <Kpi label="In savings now" value={fMoney(snapshot.savings.tvlUsd)} />
        <Kpi label="Revenue, all time" value={fMoney(snapshot.revenue.totalUsd)} />
        <Kpi label="Yield earned by savers" value={fMoney(snapshot.savings.yieldEarnedUsd)} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, md: 3 },
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <Panel title="Sign-ups per day" subheader="New accounts created each day.">
          <TimeChart points={snapshot.users.signupsByDay} name="Sign-ups" type="bar" />
        </Panel>

        <Panel
          title="Daily active wallets"
          subheader="Wallets that completed at least one action that day, across every product."
        >
          <TimeChart points={snapshot.activeWallets} name="Active wallets" type="line" />
        </Panel>

        <Panel
          title="Daily revenue by product"
          subheader="Fees recorded each day, split by product."
        >
          <StackedChart
            data={snapshot.revenue.dailyByProduct}
            type="bar"
            colorOf={productColor}
            labelOf={productLabel}
            money
          />
        </Panel>

        <Panel
          title="Cumulative revenue"
          subheader="Recorded fees as a running total. It ends below the all-time revenue by the LI.FI fees collected before per-swap recording began."
        >
          <TimeChart points={snapshot.revenue.cumulative} name="Revenue" type="area" money />
        </Panel>

        <Panel
          title="Revenue by product"
          subheader="All-time revenue. “LI.FI, before recording” is the part of the on-chain fee wallets that predates per-swap fee recording."
        >
          <DonutChart slices={snapshot.revenue.byProduct} colorOf={productColor} />
        </Panel>

        <Panel
          title="Volume by product"
          subheader="Share of all-time volume, completed actions only."
        >
          <DonutChart slices={snapshot.volume.productMix} colorOf={productColor} />
        </Panel>

        <Panel title="Top swap routes" subheader="The most-traded pairs since launch, by volume.">
          <RankedBars
            rows={snapshot.volume.topRoutes.map((r) => ({ label: r.route, value: r.volumeUsd }))}
            name="Volume"
            money
          />
        </Panel>

        <Panel
          title="Savings deposits over time"
          subheader="How much USD sits in the Normal Savings vault (DeFindex), day by day."
        >
          <TimeChart points={snapshot.savings.tvlByDay} name="In savings" type="area" money />
        </Panel>

        <Panel
          title="Wallets by chain"
          subheader="Addresses created on each chain, as a running total."
        >
          <StackedChart
            data={snapshot.walletsByChain}
            type="area"
            colorOf={chainColor}
            labelOf={chainLabel}
          />
        </Panel>

        <Panel
          title="Holdings by asset, right now"
          subheader="What all user wallets hold today, per asset, plus savings."
        >
          <RankedBars
            rows={snapshot.holdings.byAsset.map((h) => ({
              label: ASSET_LABEL[h.asset] ?? h.asset,
              value: h.usd,
            }))}
            name="Holdings"
            money
          />
        </Panel>

        <Panel
          wide
          title="Relayer gas"
          subheader="The wallets that pay gas for cross-chain transfers, what is left in each and whether it needs topping up. If one runs dry, a user's money is burned on the source chain and waits."
        >
          <GasTable rows={snapshot.holdings.gasFloat} />
        </Panel>

        <Panel
          wide
          title="Activity"
          subheader={
            log.total > log.rows.length
              ? `Every completed action, newest first. Showing the latest ${fNumber(log.rows.length)} of ${fNumber(log.total)}.`
              : `Every completed action, newest first (${fNumber(log.total)}).`
          }
        >
          <ActivityTable snapshot={snapshot} />
        </Panel>
      </Box>

      <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 3 }}>
        Volume and revenue count completed actions only. Dollar values for BTC, ETH, SOL and XLM use
        the price on the day of each update, so older actions show today&apos;s value; USDC is
        exact.
      </Typography>
    </Container>
  );
}
