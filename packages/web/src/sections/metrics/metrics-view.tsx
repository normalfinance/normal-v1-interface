'use client';

import type { ReactNode } from 'react';
import type { Point, Period, PeriodKey, StackedDaily } from '@/lib/metrics/periods';
import type { SectionKey, DistinctSeries, PublicMetricsSnapshot } from '@/lib/metrics/snapshot';

import { useState } from 'react';
import { TYPE } from '@/theme/type-scale';
import { fNumber } from '@/utils/format-number';
import { assetColor } from '@/lib/portfolio/display';
import { SECTION_KEYS } from '@/lib/metrics/snapshot';
import { SAVINGS_COLOR } from '@/lib/portfolio/allocation';
import { INK, MUTED, BRAND_COLORS } from '@/theme/brand-colors';
import { BRIDGE_COLOR, productColor } from '@/lib/metrics/colors';
import {
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

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Reveal } from '@/components/_common/reveal';
import { HatchRail } from '@/components/_common/hatch';
import { PageHero } from '@/components/_common/page-hero';
import { HAIRLINE, PageSection, SectionHeader } from '@/components/_common/brand';

import { Donut, BucketArea, BucketBars, RankedBars, StackedBuckets } from './charts';
import {
  SPAN,
  Cell,
  fUtc,
  Panel,
  Figure,
  fMoney,
  CellGrid,
  chainColor,
  chainLabel,
  PeriodSwitch,
  productLabel,
  CHAPTER_COLUMNS,
} from './parts';

// ----------------------------------------------------------------------
// normalfinance.io/dashboard: public, kept out of search. A page of the
// marketing site (DESIGN.md): it opens like the roadmap, the promise on the
// left and where Normal stands on the sky wash beside it, then one chapter per
// subject on the hairline grid, each its figures and its charts as cells that
// share their lines. Every chart over time has its own period (Niko,
// 2026-11-13: "make the time per graph"); changing it redraws that chart only,
// with no trip to the server. The relayer gas table and the per-wallet
// activity log live on /dashboard/team.
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

/** A holding's colour: Savings its mint, a coin the colour it is known by. */
const holdingColor = (asset: string) => (asset === 'SAVINGS' ? SAVINGS_COLOR : assetColor(asset));

/** The window the figures' second line covers. */
const RECENT = periodOf('30d');

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

/** A chart in its cell with its own period; only this chart follows it. */
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
      action={<PeriodSwitch value={key} onChange={setKey} />}
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

// ---------------------------------------------------------------------- the page's parts

/** One subject of the page: its heading, then its figures and charts on one grid. */
function Chapter({
  id,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Reveal>
      <PageSection
        id={id}
        divider
        hatchFoot
        aria-labelledby={`${id}-title`}
        sx={{ scrollMarginTop: 72 }}
      >
        <SectionHeader id={`${id}-title`} eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <CellGrid columns={CHAPTER_COLUMNS}>{children}</CellGrid>
      </PageSection>
    </Reveal>
  );
}

type GlanceRow = { href: string; label: string; value: string };

/**
 * The hero's right-hand cell, on the sky wash like the roadmap's: a figure
 * for each chapter, each a link down to it, then when the numbers were taken.
 */
function AtAGlance({
  rows,
  updatedAt,
  stale,
}: {
  rows: GlanceRow[];
  updatedAt: string;
  stale?: string;
}) {
  const sky = BRAND_COLORS.sky;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 4,
        flex: 1,
        p: { xs: 3, md: 5 },
        color: sky.deep,
        bgcolor: sky.tint,
      }}
    >
      <Box>
        <Typography component="h2" sx={{ ...TYPE.eyebrow, color: 'inherit' }}>
          At a glance
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, mt: 2 }}>
          {rows.map((row) => (
            <Box component="li" key={row.href} sx={{ borderBottom: HAIRLINE }}>
              <Box
                component="a"
                href={row.href}
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: 2,
                  py: 1.5,
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover .glance-label': { textDecoration: 'underline' },
                }}
              >
                <Typography className="glance-label" sx={{ ...TYPE.body, color: 'inherit' }}>
                  {row.label}
                </Typography>
                <Typography
                  sx={{
                    ...TYPE.h4,
                    color: 'inherit',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.value}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      <Box>
        <Typography sx={{ ...TYPE.eyebrow, color: 'inherit' }}>Last update</Typography>
        <Typography sx={{ ...TYPE.body, color: 'inherit', mt: 1.5 }}>{fUtc(updatedAt)}</Typography>
        <Typography sx={{ ...TYPE.small, color: 'inherit', mt: 0.5 }}>
          The numbers refresh once a day. Every chart has its own period.
        </Typography>
        {stale && (
          <Typography sx={{ ...TYPE.small, color: 'inherit', mt: 1.5 }}>{stale}</Typography>
        )}
      </Box>
    </Box>
  );
}

/** The notes on how the numbers are counted, as the last chapter's cells. */
const HOW_WE_COUNT = [
  {
    title: 'Completed only',
    body: 'Volume and revenue count actions that finished. Pending and failed ones are left out.',
  },
  {
    title: "Today's prices",
    body: "Dollar values for BTC, ETH, SOL and XLM use the price on the day of each update, so older actions show today's value. USDC is exact.",
  },
  {
    title: 'Settled on Stellar',
    body: 'An action counts as on Stellar when it settles there, CCTP bridges into Stellar included.',
  },
  {
    title: 'Each wallet once',
    body: 'Stellar wallets include those made before passkey wallets launched in June 2026 and wallets people connected, each counted once. Days are UTC.',
  },
];

// ---------------------------------------------------------------------- page

export function MetricsView({ snapshot }: { snapshot: PublicMetricsSnapshot | null }) {
  if (!snapshot) {
    return (
      <PageHero
        id="dashboard-title"
        eyebrow="Dashboard · updated daily"
        title="Normal in numbers."
        lede="No numbers yet. They appear after the first daily update."
      />
    );
  }

  const { users, activity, revenue, savings, stellar, walletsByChain } = snapshot;
  const today = snapshot.generatedAt.slice(0, 10);
  const recent = windowStart(RECENT, today);
  const beforeRecent = recent ? addDays(recent, -1) : today;
  // Only sections the last update could not refresh at all; a partial note
  // (fresh but incomplete) is for the team page's sync health.
  const stale = SECTION_KEYS.filter(
    (key) =>
      snapshot.sections[key]?.error && snapshot.sections[key]?.updatedAt !== snapshot.generatedAt
  );
  const staleText = stale.length
    ? `The last update could not refresh ${stale
        .map(
          (key) => `${SECTION_LABEL[key]} (shown as of ${fUtc(snapshot.sections[key].updatedAt)})`
        )
        .join(', ')}.`
    : undefined;

  const volumeAll = sum(stackedTotals(activity.volumeByProduct, null));
  const tvlBefore = lastOnOrBefore(savings.tvlByDay, beforeRecent);
  const yieldBefore = lastOnOrBefore(savings.yieldByDay, beforeRecent);
  const stellarChain = chainRows(walletsByChain, recent).find((c) => c.chain === 'stellar');
  const bridged = bridgedSeries(stellar.cctpInByDay, stellar.cctpOutByDay);

  return (
    <>
      {/* Without JavaScript nothing waits to be revealed. */}
      <noscript>
        <style>{'[data-reveal]{opacity:1!important}'}</style>
      </noscript>

      <PageHero
        id="dashboard-title"
        eyebrow="Dashboard · updated daily"
        title="Normal in numbers."
        lede="Who uses Normal, the money that moves through it, what it earns and what savers earn. Counted from our own records and the networks themselves."
        aside={
          <AtAGlance
            updatedAt={snapshot.generatedAt}
            stale={staleText}
            rows={[
              { href: '#users', label: 'Accounts', value: fNumber(users.total) },
              { href: '#money', label: 'Moved through Normal', value: fMoney(volumeAll) },
              { href: '#savings', label: 'In savings now', value: fMoney(savings.tvlUsd) },
              {
                href: '#stellar',
                label: 'Stellar wallets',
                value: fNumber(stellarChain?.total ?? 0),
              },
            ]}
          />
        }
      />
      <HatchRail />

      <Chapter
        id="users"
        eyebrow="Users"
        title="People on Normal."
        subtitle="Accounts opened, and the wallets that completed at least one action."
      >
        <Figure
          span={SPAN.half}
          label="Accounts"
          value={fNumber(users.total)}
          foot={`+${fNumber(sumSince(users.signupsByDay, recent))} in the last 30 days`}
        />
        <Figure
          span={SPAN.half}
          label="Active wallets, last 30 days"
          value={fNumber(activity.activeWallets.window['30d'])}
          foot={`${fNumber(activity.activeWallets.window.all)} active since launch`}
        />
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
      </Chapter>

      <Chapter
        id="money"
        eyebrow="Volume and revenue"
        title="Money moving through Normal."
        subtitle="Completed actions in dollars, by product, and the fees they paid."
      >
        <Figure
          span={SPAN.half}
          label="Moved through Normal"
          value={fMoney(volumeAll)}
          foot={`${signedMoney(sum(stackedTotals(activity.volumeByProduct, recent)))} in the last 30 days`}
        />
        <Figure
          span={SPAN.half}
          label="Revenue"
          value={fMoney(revenue.totalUsd)}
          foot={`${signedMoney(sum(stackedTotals(revenue.dailyByProduct, recent)))} recorded in the last 30 days`}
        />
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
              ? 'Revenue by product since launch. “LI.FI, before recording” is the part of the fee wallets that predates per-swap fee recording.'
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
          title="Revenue to date"
          initial="all"
          subheader={(p) =>
            `Recorded fees as a running total, ${bucketPhrase(p.bucket)}, ${spanOf(p)}. It ends below the all-time revenue by the LI.FI fees collected before per-swap recording began.`
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
      </Chapter>

      <Chapter
        id="savings"
        eyebrow="Savings and wallets"
        title="Savings, wallets and holdings."
        subtitle="What sits in the Normal Savings vault, the wallets people hold on each network, and what those wallets hold today."
      >
        <Figure
          span={SPAN.half}
          label="In savings now"
          value={fMoney(savings.tvlUsd)}
          foot={
            tvlBefore === null
              ? 'In the Normal Savings vault'
              : `${signedMoney(savings.tvlUsd - tvlBefore)} over the last 30 days`
          }
        />
        <Figure
          span={SPAN.half}
          label="Yield earned by savers"
          value={fMoney(savings.yieldEarnedUsd)}
          foot={
            yieldBefore === null
              ? 'Since launch'
              : `${signedMoney(savings.yieldEarnedUsd - yieldBefore)} over the last 30 days`
          }
        />
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
              color={SAVINGS_COLOR}
              filename={fileOf('savings', p)}
            />
          )}
        </PeriodPanel>
        <PeriodPanel
          title="Wallets by network"
          initial="all"
          subheader={(p) =>
            `Wallets on each network since launch${p.key === 'all' ? '' : `; in brackets, how many are new in the ${spanOf(p)}`}. Stellar counts every Stellar wallet: passkey wallets, and the earlier Normal and connected wallets from before June 2026.`
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
          title="Holdings, right now"
          subheader="What all user wallets hold today, per asset, plus savings."
        >
          <RankedBars
            rows={snapshot.holdings.byAsset.map((h) => ({
              label: ASSET_LABEL[h.asset] ?? h.asset,
              value: h.usd,
            }))}
            colors={snapshot.holdings.byAsset.map((h) => holdingColor(h.asset))}
            name="Holdings"
            money
            filename="normal-holdings-now"
          />
        </Panel>
      </Chapter>

      <Chapter
        id="stellar"
        eyebrow="On Stellar"
        title="Built on Stellar."
        subtitle="Savings, Soroswap swaps, MoneyGram cash in and out, and every CCTP bridge into Stellar settle there."
      >
        <Figure
          span={SPAN.quarter}
          label="Stellar wallets"
          value={fNumber(stellarChain?.total ?? 0)}
          foot={
            snapshot.stellarWallets
              ? `${fNumber(snapshot.stellarWallets.passkey)} passkey, ${fNumber(snapshot.stellarWallets.earlier)} earlier or connected; +${fNumber(stellarChain?.added ?? 0)} in the last 30 days`
              : `+${fNumber(stellarChain?.added ?? 0)} in the last 30 days`
          }
        />
        <Figure
          span={SPAN.quarter}
          label="Active on Stellar, last 30 days"
          value={fNumber(stellar.activeWallets.window['30d'])}
          foot={`${fNumber(stellar.activeWallets.window.all)} active on Stellar since launch`}
        />
        <Figure
          span={SPAN.quarter}
          label="Actions on Stellar"
          value={fNumber(sumSince(stellar.actionsByDay, null))}
          foot={`+${fNumber(sumSince(stellar.actionsByDay, recent))} in the last 30 days`}
        />
        <Figure
          span={SPAN.quarter}
          label="Volume on Stellar"
          value={fMoney(sumSince(stellar.volumeByDay, null))}
          foot={`${signedMoney(sumSince(stellar.volumeByDay, recent))} in the last 30 days`}
        />
        <Figure
          span={SPAN.half}
          label="Bridged into Stellar"
          value={fMoney(sumSince(stellar.cctpInByDay, null))}
          foot={`USDC with CCTP since launch; ${fMoney(sumSince(stellar.cctpOutByDay, null))} out`}
        />
        <Figure
          span={SPAN.half}
          label="MoneyGram cash in and out"
          value={fMoney(
            sumSince(stellar.moneygramInByDay, null) + sumSince(stellar.moneygramOutByDay, null)
          )}
          foot={`${fMoney(sumSince(stellar.moneygramInByDay, null))} in, ${fMoney(sumSince(stellar.moneygramOutByDay, null))} out, since launch`}
        />
        <PeriodPanel
          title="Volume by network"
          subheader={(p) =>
            `Completed actions in USD by the network they started on, ${bucketPhrase(p.bucket)}, ${spanOf(p)}.`
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
              colorOf={(name) => (name === 'in' ? BRIDGE_COLOR.in : BRIDGE_COLOR.out)}
              labelOf={(name) => (name === 'in' ? 'Into Stellar' : 'Out of Stellar')}
              money
              filename={fileOf('cctp-bridged', p)}
              empty={quietText(p)}
            />
          )}
        </PeriodPanel>
      </Chapter>

      <Reveal>
        <PageSection divider hatchFoot aria-labelledby="counting-title">
          <SectionHeader id="counting-title" eyebrow="Fine print" title="How we count." />
          <CellGrid columns={{ xs: 1, sm: 2, md: 4 }}>
            {HOW_WE_COUNT.map((note) => (
              <Cell key={note.title}>
                <Typography component="h3" sx={{ ...TYPE.h4, color: INK }}>
                  {note.title}
                </Typography>
                <Typography sx={{ ...TYPE.small, mt: 1, color: MUTED }}>{note.body}</Typography>
              </Cell>
            ))}
          </CellGrid>
        </PageSection>
      </Reveal>
    </>
  );
}
