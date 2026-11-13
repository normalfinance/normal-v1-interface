'use client';

import type { ReactNode } from 'react';
import type { Point, Period, PeriodKey, StackedDaily } from '@/lib/metrics/periods';
import type { SectionKey, DistinctSeries, PublicMetricsSnapshot } from '@/lib/metrics/snapshot';

import { useState } from 'react';
import { fNumber } from '@/utils/format-number';
import { SECTION_KEYS } from '@/lib/metrics/snapshot';
import {
  PERIODS,
  addDays,
  bucketOf,
  periodOf,
  sumSince,
  aggregate,
  windowStart,
  bucketPhrase,
  stackedTotals,
  DEFAULT_PERIOD,
  lastOnOrBefore,
  aggregateStacked,
} from '@/lib/metrics/periods';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { Donut, BucketArea, BucketBars, RankedBars, StackedBuckets } from './charts';
import {
  Kpi,
  fUtc,
  Panel,
  fMoney,
  KpiGrid,
  PanelGrid,
  chainColor,
  chainLabel,
  SectionTitle,
  productLabel,
  useProductColor,
} from './parts';

// ----------------------------------------------------------------------
// normalfinance.io/dashboard: public, kept out of search. Every chart over
// time has its own period dropdown (Niko, 2026-11-13: "make the time per
// graph"); changing it redraws that chart only, with no trip to the server.
// The tiles show all-time numbers with the last 30 days underneath. The
// relayer gas table and the per-wallet activity log live on /dashboard/team.
// ----------------------------------------------------------------------

const SECTION_LABEL: Record<SectionKey, string> = {
  users: 'users',
  activity: 'activity, volume and revenue',
  walletChains: 'wallets by chain',
  savingsTvl: 'savings deposits',
  yield: 'yield earned',
  holdings: 'holdings',
};

const ASSET_LABEL: Record<string, string> = { SAVINGS: 'Savings' };

const STELLAR_IN = '#14B8A6';
const STELLAR_OUT = '#8a8a8a';

/** The window the tiles' second line covers. */
const TILE_PERIOD = periodOf('30d');

const sum = (rows: { value: number }[]) => rows.reduce((total, r) => total + r.value, 0);

/** "+$1,234.00" / "-$12.00" for a change. */
function signedMoney(value: number): string {
  return `${value >= 0 ? '+' : '-'}${fMoney(Math.abs(value))}`;
}

/** Distinct wallets per bar for the period: the series counted for its bucket size. */
function distinctFor(series: DistinctSeries, period: Period, today: string): Point[] {
  const source =
    period.bucket === 'day'
      ? series.daily
      : period.bucket === 'week'
        ? series.weekly
        : series.monthly;
  const start = windowStart(period, today);
  const from = start ? bucketOf(start, period.bucket) : null;
  return source.filter((p) => (from === null || p.day >= from) && p.day <= today);
}

/** Each chain's total addresses, and how many are new since `start`. */
function chainRows(data: StackedDaily, start: string | null) {
  const before = start ? addDays(start, -1) : null;
  return data.series
    .map((s) => {
      const total = s.data[s.data.length - 1] ?? 0;
      let earlier = 0;
      if (before) {
        const at = data.days.lastIndexOf(before);
        if (at >= 0) earlier = s.data[at] ?? 0;
        else if (data.days.length && data.days[data.days.length - 1] < before) earlier = total;
      }
      return { chain: s.name, total, added: total - earlier };
    })
    .sort((a, b) => b.total - a.total);
}

/** CCTP in and out of Stellar as one two-series set. */
function bridgedSeries(inDays: Point[], outDays: Point[]): StackedDaily {
  const days = Array.from(new Set([...inDays, ...outDays].map((p) => p.day))).sort();
  const at = (points: Point[]) => {
    const map = new Map(points.map((p) => [p.day, p.value]));
    return days.map((day) => map.get(day) ?? 0);
  };
  return {
    days,
    series: [
      { name: 'in', data: at(inDays) },
      { name: 'out', data: at(outDays) },
    ],
  };
}

// ---------------------------------------------------------------------- per-chart period

function PeriodSelect({
  value,
  onChange,
  label,
}: {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
  label: string;
}) {
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value as PeriodKey)}
      slotProps={{ htmlInput: { 'aria-label': label } }}
      sx={{ minWidth: 150, flexShrink: 0 }}
    >
      {PERIODS.map((p) => (
        <MenuItem key={p.key} value={p.key}>
          {p.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** A chart panel with its own period dropdown; only this chart follows it. */
function PeriodPanel({
  title,
  subheader,
  initial = DEFAULT_PERIOD,
  wide,
  children,
}: {
  title: string;
  subheader: (period: Period) => string;
  initial?: PeriodKey;
  wide?: boolean;
  children: (period: Period) => ReactNode;
}) {
  const [key, setKey] = useState<PeriodKey>(initial);
  const period = periodOf(key);
  return (
    <Panel
      wide={wide}
      title={title}
      subheader={subheader(period)}
      action={<PeriodSelect value={key} onChange={setKey} label={`Period for ${title}`} />}
    >
      {children(period)}
    </Panel>
  );
}

/** "last 30 days" / "since launch", for subtitles. */
const spanOf = (period: Period) =>
  period.key === 'all' ? 'since launch' : period.label.toLowerCase();

/** What a chart says when its period is quiet (all time: there is no data at all). */
const quietText = (period: Period) => (period.key === 'all' ? undefined : 'None in this period');

const fileOf = (name: string, period: Period) => `normal-${name}-${period.key}`;

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

  const { users, activity, revenue, savings, stellar, walletsByChain } = snapshot;
  const today = snapshot.generatedAt.slice(0, 10);
  const recent = windowStart(TILE_PERIOD, today);
  const beforeRecent = recent ? addDays(recent, -1) : today;
  // Only sections the last update could not refresh at all; a partial note
  // (fresh but incomplete) is for the team page's sync health.
  const stale = SECTION_KEYS.filter(
    (key) =>
      snapshot.sections[key]?.error && snapshot.sections[key]?.updatedAt !== snapshot.generatedAt
  );

  const volumeAll = sum(stackedTotals(activity.volumeByProduct, null));
  const tvlBefore = lastOnOrBefore(savings.tvlByDay, beforeRecent);
  const yieldBefore = lastOnOrBefore(savings.yieldByDay, beforeRecent);
  const stellarChain = chainRows(walletsByChain, recent).find((c) => c.chain === 'stellar');
  const bridged = bridgedSeries(stellar.cctpInByDay, stellar.cctpOutByDay);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1">
          Dashboard
        </Typography>
        <Typography sx={{ color: 'text.secondary' }}>
          Normal in numbers, refreshed once a day. Last update: {fUtc(snapshot.generatedAt)}. Each
          chart has its own period.
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

      <KpiGrid>
        <Kpi
          label="Registered users"
          value={fNumber(users.total)}
          foot={`+${fNumber(sumSince(users.signupsByDay, recent))} in the last 30 days`}
        />
        <Kpi
          label="Active wallets, last 30 days"
          value={fNumber(activity.activeWallets.window['30d'])}
          foot={`${fNumber(activity.activeWallets.window.all)} active since launch`}
        />
        <Kpi
          label="Volume"
          value={fMoney(volumeAll)}
          foot={`${signedMoney(sum(stackedTotals(activity.volumeByProduct, recent)))} in the last 30 days`}
        />
        <Kpi
          label="Revenue"
          value={fMoney(revenue.totalUsd)}
          foot={`${signedMoney(sum(stackedTotals(revenue.dailyByProduct, recent)))} recorded in the last 30 days`}
        />
        <Kpi
          label="In savings now"
          value={fMoney(savings.tvlUsd)}
          foot={
            tvlBefore === null
              ? 'In the Normal Savings vault'
              : `${signedMoney(savings.tvlUsd - tvlBefore)} over the last 30 days`
          }
        />
        <Kpi
          label="Yield earned by savers"
          value={fMoney(savings.yieldEarnedUsd)}
          foot={
            yieldBefore === null
              ? 'Since launch'
              : `${signedMoney(savings.yieldEarnedUsd - yieldBefore)} over the last 30 days`
          }
        />
      </KpiGrid>

      <SectionTitle title="Users" />
      <PanelGrid>
        <PeriodPanel
          title="Sign-ups"
          subheader={(p) => `New accounts, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`}
        >
          {(p) => (
            <BucketBars
              points={aggregate(users.signupsByDay, p, today, 'sum')}
              bucket={p.bucket}
              name="Sign-ups"
              filename={fileOf('signups', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Active wallets"
          subheader={(p) =>
            `Wallets with at least one completed action, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`
          }
        >
          {(p) => (
            <BucketBars
              points={distinctFor(activity.activeWallets, p, today)}
              bucket={p.bucket}
              name="Active wallets"
              filename={fileOf('active-wallets', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
      </PanelGrid>

      <SectionTitle title="Volume and revenue" />
      <PanelGrid>
        <PeriodPanel
          title="Volume by product"
          subheader={(p) => `Completed actions in USD, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`}
        >
          {(p) => (
            <StackedBuckets
              data={aggregateStacked(activity.volumeByProduct, p, today, 'sum')}
              bucket={p.bucket}
              colorOf={productColor}
              labelOf={productLabel}
              money
              filename={fileOf('volume-by-product', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Revenue by product"
          subheader={(p) => `Fees recorded, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`}
        >
          {(p) => (
            <StackedBuckets
              data={aggregateStacked(revenue.dailyByProduct, p, today, 'sum')}
              bucket={p.bucket}
              colorOf={productColor}
              labelOf={productLabel}
              money
              filename={fileOf('revenue-by-product', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Share of volume"
          initial="all"
          subheader={(p) => `Volume by product, ${spanOf(p)}.`}
        >
          {(p) => (
            <Donut
              slices={stackedTotals(activity.volumeByProduct, windowStart(p, today))}
              colorOf={productColor}
              labelOf={productLabel}
              filename={fileOf('volume-share', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Share of revenue"
          initial="all"
          subheader={(p) =>
            p.key === 'all'
              ? 'Revenue by product since launch. “LI.FI, before recording” is the part of the on-chain fee wallets that predates per-swap fee recording.'
              : `Fees recorded by product, ${spanOf(p)}.`
          }
        >
          {(p) => (
            <Donut
              slices={
                p.key === 'all'
                  ? revenue.byProduct
                  : stackedTotals(revenue.dailyByProduct, windowStart(p, today))
              }
              colorOf={productColor}
              labelOf={productLabel}
              filename={fileOf('revenue-share', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Top swap routes"
          initial="all"
          subheader={(p) => `The most-traded pairs by volume, ${spanOf(p)}.`}
        >
          {(p) => (
            <RankedBars
              rows={stackedTotals(activity.volumeByRoute, windowStart(p, today)).slice(0, 15)}
              name="Volume"
              money
              filename={fileOf('top-routes', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Cumulative revenue"
          initial="all"
          subheader={(p) =>
            `Recorded fees as a running total since launch, shown ${bucketPhrase(p.bucket)} for the ${spanOf(p)}. It ends below the all-time revenue by the LI.FI fees collected before per-swap recording began.`
          }
        >
          {(p) => (
            <BucketArea
              points={aggregate(revenue.cumulative, p, today, 'last')}
              bucket={p.bucket}
              name="Revenue to date"
              money
              filename={fileOf('cumulative-revenue', p)}
            />
          )}
        </PeriodPanel>
      </PanelGrid>

      <SectionTitle title="Savings and wallets" />
      <PanelGrid>
        <PeriodPanel
          wide
          title="In savings over time"
          initial="all"
          subheader={(p) =>
            `USD in the Normal Savings vault (DeFindex), at the end of each ${p.bucket}, ${spanOf(p)}.`
          }
        >
          {(p) => (
            <BucketArea
              points={aggregate(savings.tvlByDay, p, today, 'last')}
              bucket={p.bucket}
              name="In savings"
              money
              filename={fileOf('savings', p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Wallets by chain"
          initial="all"
          subheader={(p) =>
            `Wallets on each chain since launch${p.key === 'all' ? '' : `; in brackets, how many are new in the ${spanOf(p)}`}. Stellar counts every Stellar wallet: passkey wallets plus the earlier Normal wallets and connected wallets from before June 2026.`
          }
        >
          {(p) => {
            const rows = chainRows(walletsByChain, windowStart(p, today));
            return (
              <RankedBars
                rows={rows.map((c) => ({ label: chainLabel(c.chain), value: c.total }))}
                colors={rows.map((c) => chainColor(c.chain))}
                labelOf={(i) => {
                  const c = rows[i];
                  if (!c) return '';
                  return p.key === 'all'
                    ? fNumber(c.total)
                    : `${fNumber(c.total)} (+${fNumber(c.added)})`;
                }}
                name="Wallets"
                filename={fileOf('wallets-by-chain', p)}
              />
            );
          }}
        </PeriodPanel>
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
            filename="normal-holdings-now"
          />
        </Panel>
      </PanelGrid>

      <SectionTitle
        title="On Stellar"
        intro="Normal is built on Stellar. Savings, Soroswap swaps, MoneyGram cash in and out, and every CCTP bridge into Stellar settle there."
      />
      <KpiGrid>
        <Kpi
          label="Stellar wallets"
          value={fNumber(stellarChain?.total ?? 0)}
          foot={
            snapshot.stellarWallets
              ? `${fNumber(snapshot.stellarWallets.passkey)} passkey, ${fNumber(snapshot.stellarWallets.earlier)} earlier or connected; +${fNumber(stellarChain?.added ?? 0)} in the last 30 days`
              : `+${fNumber(stellarChain?.added ?? 0)} in the last 30 days`
          }
        />
        <Kpi
          label="Active on Stellar, last 30 days"
          value={fNumber(stellar.activeWallets.window['30d'])}
          foot={`${fNumber(stellar.activeWallets.window.all)} active on Stellar since launch`}
        />
        <Kpi
          label="Actions on Stellar"
          value={fNumber(sumSince(stellar.actionsByDay, null))}
          foot={`+${fNumber(sumSince(stellar.actionsByDay, recent))} in the last 30 days`}
        />
        <Kpi
          label="Volume on Stellar"
          value={fMoney(sumSince(stellar.volumeByDay, null))}
          foot={`${signedMoney(sumSince(stellar.volumeByDay, recent))} in the last 30 days`}
        />
        <Kpi
          label="Bridged into Stellar"
          value={fMoney(sumSince(stellar.cctpInByDay, null))}
          foot={`USDC via CCTP since launch; ${fMoney(sumSince(stellar.cctpOutByDay, null))} out`}
        />
        <Kpi
          label="MoneyGram cash in and out"
          value={fMoney(
            sumSince(stellar.moneygramInByDay, null) + sumSince(stellar.moneygramOutByDay, null)
          )}
          foot={`${fMoney(sumSince(stellar.moneygramInByDay, null))} in, ${fMoney(sumSince(stellar.moneygramOutByDay, null))} out, since launch`}
        />
      </KpiGrid>
      <PanelGrid>
        <PeriodPanel
          title="Volume by chain"
          subheader={(p) =>
            `Completed actions in USD by the chain they started on, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`
          }
        >
          {(p) => (
            <StackedBuckets
              data={aggregateStacked(activity.volumeByChain, p, today, 'sum')}
              bucket={p.bucket}
              colorOf={chainColor}
              labelOf={chainLabel}
              money
              filename={fileOf('volume-by-chain', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Bridged with CCTP"
          subheader={(p) =>
            `USDC moved into and out of Stellar with Circle's CCTP, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`
          }
        >
          {(p) => (
            <StackedBuckets
              data={aggregateStacked(bridged, p, today, 'sum')}
              bucket={p.bucket}
              stacked={false}
              colorOf={(name) => (name === 'in' ? STELLAR_IN : STELLAR_OUT)}
              labelOf={(name) => (name === 'in' ? 'Into Stellar' : 'Out of Stellar')}
              money
              filename={fileOf('cctp-bridged', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
      </PanelGrid>

      <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 4 }}>
        Volume and revenue count completed actions only. Dollar values for BTC, ETH, SOL and XLM use
        the price on the day of each update, so older actions show today&apos;s value; USDC is
        exact. An action counts as on Stellar when it settles there, including CCTP bridges into
        Stellar. Stellar wallets include those created before passkey (Turnkey) wallets launched in
        June 2026 and wallets users connected, each counted once. Days are UTC.
      </Typography>
    </Container>
  );
}
