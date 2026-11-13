'use client';

import type { Point, Period, PeriodKey } from '@/lib/metrics/periods';
import type { SectionKey, DistinctSeries, PublicMetricsSnapshot } from '@/lib/metrics/snapshot';

import { useMemo } from 'react';
import { fNumber } from '@/utils/format-number';
import { SECTION_KEYS } from '@/lib/metrics/snapshot';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
// normalfinance.io/dashboard: public, kept out of search. One period
// dropdown above everything; every tile and chart below it shows that slice
// (lib/metrics/periods.ts), except the ones titled "right now". The relayer
// gas table and the per-wallet activity log live on /dashboard/team.
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

/** "+$1,234.00" / "-$12.00" for a change. */
function signedMoney(value: number): string {
  return `${value >= 0 ? '+' : '-'}${fMoney(Math.abs(value))}`;
}

function usePeriod(): [Period, (key: PeriodKey) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = periodOf(searchParams.get('period'));
  const setPeriod = (key: PeriodKey) => {
    // In the address, so a link opens on the same view.
    const params = new URLSearchParams(searchParams.toString());
    if (key === DEFAULT_PERIOD) params.delete('period');
    else params.set('period', key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  return [period, setPeriod];
}

export function MetricsView({ snapshot }: { snapshot: PublicMetricsSnapshot | null }) {
  const productColor = useProductColor();
  const [period, setPeriod] = usePeriod();

  const view = useMemo(() => {
    if (!snapshot) return null;
    const today = snapshot.generatedAt.slice(0, 10);
    const start = windowStart(period, today);
    const before = start ? addDays(start, -1) : null;
    const { users, activity, revenue, savings, stellar, walletsByChain } = snapshot;

    const sum = (rows: { value: number }[]) => rows.reduce((total, r) => total + r.value, 0);
    const volumeAll = sum(stackedTotals(activity.volumeByProduct, null));
    const tvlBefore = before ? lastOnOrBefore(savings.tvlByDay, before) : null;
    const yieldBefore = before ? lastOnOrBefore(savings.yieldByDay, before) : null;

    const chains = walletsByChain.series
      .map((s) => {
        const total = s.data[s.data.length - 1] ?? 0;
        const index = before ? walletsByChain.days.lastIndexOf(before) : -1;
        const earlier = before
          ? index >= 0
            ? (s.data[index] ?? 0)
            : walletsByChain.days[0] > before
              ? 0
              : total
          : 0;
        return { chain: s.name, total, added: total - earlier };
      })
      .sort((a, b) => b.total - a.total);
    const stellarWallets = chains.find((c) => c.chain === 'stellar');

    return {
      today,
      start,
      signups: aggregate(users.signupsByDay, period, today, 'sum'),
      signupsInPeriod: sumSince(users.signupsByDay, start),
      active: distinctFor(activity.activeWallets, period, today),
      activeInPeriod: activity.activeWallets.window[period.key],
      volumeAll,
      volumeInPeriod: sum(stackedTotals(activity.volumeByProduct, start)),
      volumeByProduct: aggregateStacked(activity.volumeByProduct, period, today, 'sum'),
      volumeShare: stackedTotals(activity.volumeByProduct, start),
      revenueInPeriod: start ? sum(stackedTotals(revenue.dailyByProduct, start)) : revenue.totalUsd,
      revenueByProduct: aggregateStacked(revenue.dailyByProduct, period, today, 'sum'),
      revenueShare: start ? stackedTotals(revenue.dailyByProduct, start) : revenue.byProduct,
      cumulative: aggregate(revenue.cumulative, period, today, 'last'),
      routes: stackedTotals(activity.volumeByRoute, start).slice(0, 15),
      tvl: aggregate(savings.tvlByDay, period, today, 'last'),
      tvlChange: tvlBefore === null ? null : savings.tvlUsd - tvlBefore,
      yieldChange: yieldBefore === null ? null : savings.yieldEarnedUsd - yieldBefore,
      chains,
      stellar: {
        wallets: stellarWallets?.total ?? 0,
        walletsAdded: stellarWallets?.added ?? 0,
        active: stellar.activeWallets.window[period.key],
        actions: sumSince(stellar.actionsByDay, start),
        volume: sumSince(stellar.volumeByDay, start),
        cctpIn: sumSince(stellar.cctpInByDay, start),
        cctpOut: sumSince(stellar.cctpOutByDay, start),
        mgiIn: sumSince(stellar.moneygramInByDay, start),
        mgiOut: sumSince(stellar.moneygramOutByDay, start),
        volumeByChain: aggregateStacked(activity.volumeByChain, period, today, 'sum'),
        bridged: aggregateStacked(
          (() => {
            const days = Array.from(
              new Set([...stellar.cctpInByDay, ...stellar.cctpOutByDay].map((p) => p.day))
            ).sort();
            const at = (points: Point[]) => {
              const map = new Map(points.map((p) => [p.day, p.value]));
              return days.map((day) => map.get(day) ?? 0);
            };
            return {
              days,
              series: [
                { name: 'in', data: at(stellar.cctpInByDay) },
                { name: 'out', data: at(stellar.cctpOutByDay) },
              ],
            };
          })(),
          period,
          today,
          'sum'
        ),
      },
    };
  }, [snapshot, period]);

  if (!snapshot || !view) {
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

  const all = period.key === 'all';
  // A period can be quiet without data missing: say so plainly.
  const none = all ? undefined : 'None in this period';
  const per = bucketPhrase(period.bucket);
  const span = all ? 'since launch' : period.label.toLowerCase();
  const file = (name: string) => `normal-${name}-${period.key}`;
  const stale = SECTION_KEYS.filter((key) => snapshot.sections[key]?.error);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 4, justifyContent: 'space-between', alignItems: { sm: 'flex-end' } }}
      >
        <Stack spacing={1}>
          <Typography variant="h3" component="h1">
            Dashboard
          </Typography>
          <Typography sx={{ color: 'text.secondary' }}>
            Normal in numbers, refreshed once a day. Last update: {fUtc(snapshot.generatedAt)}.
          </Typography>
        </Stack>
        <TextField
          select
          size="small"
          label="Period"
          value={period.key}
          onChange={(event) => setPeriod(event.target.value as PeriodKey)}
          sx={{ minWidth: 200 }}
        >
          {PERIODS.map((p) => (
            <MenuItem key={p.key} value={p.key}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
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
          label={all ? 'Registered users' : 'New users'}
          value={fNumber(all ? snapshot.users.total : view.signupsInPeriod)}
          foot={all ? 'Since launch' : `${fNumber(snapshot.users.total)} registered in total`}
        />
        <Kpi
          label="Active wallets"
          value={fNumber(view.activeInPeriod)}
          foot={`With at least one completed action, ${span}`}
        />
        <Kpi
          label="Volume"
          value={fMoney(all ? view.volumeAll : view.volumeInPeriod)}
          foot={all ? 'Completed actions since launch' : `${fMoney(view.volumeAll)} since launch`}
        />
        <Kpi
          label="Revenue"
          value={fMoney(view.revenueInPeriod)}
          foot={all ? 'Fees since launch' : `${fMoney(snapshot.revenue.totalUsd)} since launch`}
        />
        <Kpi
          label="In savings now"
          value={fMoney(snapshot.savings.tvlUsd)}
          foot={
            view.tvlChange === null
              ? 'In the Normal Savings vault'
              : `${signedMoney(view.tvlChange)} over the ${span}`
          }
        />
        <Kpi
          label="Yield earned by savers"
          value={fMoney(snapshot.savings.yieldEarnedUsd)}
          foot={
            view.yieldChange === null
              ? 'Since launch'
              : `${signedMoney(view.yieldChange)} over the ${span}`
          }
        />
      </KpiGrid>

      <SectionTitle title="Users" />
      <PanelGrid>
        <Panel title="Sign-ups" subheader={`New accounts, ${per}.`}>
          <BucketBars
            points={view.signups}
            bucket={period.bucket}
            name="Sign-ups"
            filename={file('signups')}
            empty={none}
          />
        </Panel>
        <Panel
          title="Active wallets"
          subheader={`Wallets with at least one completed action, ${per}, across every product.`}
        >
          <BucketBars
            points={view.active}
            bucket={period.bucket}
            name="Active wallets"
            filename={file('active-wallets')}
            empty={none}
          />
        </Panel>
      </PanelGrid>

      <SectionTitle title="Volume and revenue" />
      <PanelGrid>
        <Panel title="Volume by product" subheader={`Completed actions in USD, ${per}.`}>
          <StackedBuckets
            data={view.volumeByProduct}
            bucket={period.bucket}
            colorOf={productColor}
            labelOf={productLabel}
            money
            filename={file('volume-by-product')}
            empty={none}
          />
        </Panel>
        <Panel title="Revenue by product" subheader={`Fees recorded, ${per}.`}>
          <StackedBuckets
            data={view.revenueByProduct}
            bucket={period.bucket}
            colorOf={productColor}
            labelOf={productLabel}
            money
            filename={file('revenue-by-product')}
            empty={none}
          />
        </Panel>
        <Panel title="Share of volume" subheader={`Volume by product, ${span}.`}>
          <Donut
            slices={view.volumeShare}
            colorOf={productColor}
            labelOf={productLabel}
            filename={file('volume-share')}
            empty={none}
          />
        </Panel>
        <Panel
          title="Share of revenue"
          subheader={
            all
              ? 'Revenue by product since launch. “LI.FI, before recording” is the part of the on-chain fee wallets that predates per-swap fee recording.'
              : `Fees recorded by product, ${span}.`
          }
        >
          <Donut
            slices={view.revenueShare}
            colorOf={productColor}
            labelOf={productLabel}
            filename={file('revenue-share')}
            empty={none}
          />
        </Panel>
        <Panel title="Top swap routes" subheader={`The most-traded pairs by volume, ${span}.`}>
          <RankedBars
            rows={view.routes}
            name="Volume"
            money
            filename={file('top-routes')}
            empty={none}
          />
        </Panel>
        <Panel
          title="Cumulative revenue"
          subheader="Recorded fees as a running total since launch. It ends below the all-time revenue by the LI.FI fees collected before per-swap recording began."
        >
          <BucketArea
            points={view.cumulative}
            bucket={period.bucket}
            name="Revenue to date"
            money
            filename={file('cumulative-revenue')}
          />
        </Panel>
      </PanelGrid>

      <SectionTitle title="Savings and wallets" />
      <PanelGrid>
        <Panel
          wide
          title="In savings over time"
          subheader={`USD in the Normal Savings vault (DeFindex), at the end of each ${period.bucket}.`}
        >
          <BucketArea
            points={view.tvl}
            bucket={period.bucket}
            name="In savings"
            money
            filename={file('savings')}
          />
        </Panel>
        <Panel
          title="Wallets by chain"
          subheader={
            all
              ? 'Addresses created on each chain since launch.'
              : `Addresses created on each chain since launch; in brackets, how many are new in the ${span}.`
          }
        >
          <RankedBars
            rows={view.chains.map((c) => ({ label: chainLabel(c.chain), value: c.total }))}
            colors={view.chains.map((c) => chainColor(c.chain))}
            labelOf={(i) => {
              const c = view.chains[i];
              return all || !c
                ? fNumber(c?.total ?? 0)
                : `${fNumber(c.total)} (+${fNumber(c.added)})`;
            }}
            name="Wallets"
            filename={file('wallets-by-chain')}
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
          value={fNumber(view.stellar.wallets)}
          foot={
            all
              ? 'Created by Normal since launch'
              : `+${fNumber(view.stellar.walletsAdded)} in the ${span}`
          }
        />
        <Kpi
          label="Active on Stellar"
          value={fNumber(view.stellar.active)}
          foot={`Wallets with an action that settled on Stellar, ${span}`}
        />
        <Kpi
          label="Actions on Stellar"
          value={fNumber(view.stellar.actions)}
          foot={`Completed, ${span}`}
        />
        <Kpi
          label="Volume on Stellar"
          value={fMoney(view.stellar.volume)}
          foot={`Completed actions that settled on Stellar, ${span}`}
        />
        <Kpi
          label="Bridged into Stellar"
          value={fMoney(view.stellar.cctpIn)}
          foot={`USDC via CCTP, ${span}; ${fMoney(view.stellar.cctpOut)} out`}
        />
        <Kpi
          label="MoneyGram cash in and out"
          value={fMoney(view.stellar.mgiIn + view.stellar.mgiOut)}
          foot={`${fMoney(view.stellar.mgiIn)} in, ${fMoney(view.stellar.mgiOut)} out, ${span}`}
        />
      </KpiGrid>
      <PanelGrid>
        <Panel
          title="Volume by chain"
          subheader={`Completed actions in USD by the chain they started on, ${per}.`}
        >
          <StackedBuckets
            data={view.stellar.volumeByChain}
            bucket={period.bucket}
            colorOf={chainColor}
            labelOf={chainLabel}
            money
            filename={file('volume-by-chain')}
            empty={none}
          />
        </Panel>
        <Panel
          title="Bridged with CCTP"
          subheader={`USDC moved into and out of Stellar with Circle's CCTP, ${per}.`}
        >
          <StackedBuckets
            data={view.stellar.bridged}
            bucket={period.bucket}
            stacked={false}
            colorOf={(name) => (name === 'in' ? STELLAR_IN : STELLAR_OUT)}
            labelOf={(name) => (name === 'in' ? 'Into Stellar' : 'Out of Stellar')}
            money
            filename={file('cctp-bridged')}
            empty={none}
          />
        </Panel>
      </PanelGrid>

      <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 4 }}>
        Volume and revenue count completed actions only. Dollar values for BTC, ETH, SOL and XLM use
        the price on the day of each update, so older actions show today&apos;s value; USDC is
        exact. An action counts as on Stellar when it settles there, including CCTP bridges into
        Stellar. Days are UTC.
      </Typography>
    </Container>
  );
}
