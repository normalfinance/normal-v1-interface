'use client';

import type { AssetActionKey } from '@/hooks/use-asset-actions';

import { paths } from '@/routes/paths';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';
import { useVaultApy } from '@/hooks/use-vault-apy';
import { useMemo, useState, useEffect } from 'react';
import { usePortfolio } from '@/hooks/use-portfolio';
import { assetDisplay } from '@/lib/portfolio/display';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import { Box, Stack, Skeleton, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------
// Home-hero portfolio card. Logged-in → the user's real holdings (wallet
// crypto + savings) via usePortfolio; logged-out → an attractive demo. Three
// tabs (All holdings / Crypto / DeFi). The top % badge is the overall
// portfolio's value-weighted 24h change. Buy/Sell/Send/Receive run through the
// shared useAssetActions flows (same as the drawer). Replaces the old
// SavingsCard in the hero only — /savings keeps its own SavingsCard.
// ----------------------------------------------------------------------

const INK = '#0A0A0F';
const UP = '#1AB37D';
const DOWN = '#E5484D';

// Numbers use the exact same font as the account drawer.
const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  fontFeatureSettings: '"ss01","ss02","zero"',
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: '-0.01em',
} as const;

const fmtUsd = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtUsd0 = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtCoin = (bal: number, sym: string) =>
  `${bal.toLocaleString('en-US', { maximumFractionDigits: bal < 1 ? 4 : 2 })} ${sym}`;

type Group = 'crypto' | 'defi';
interface Row {
  id: string;
  name: string;
  iconUrl: string;
  sub: string;
  usd: number;
  changePct: number | null; // crypto: 24h change
  apyPct: number | null; // defi: APY
  group: Group;
  href: string; // crypto → asset page; savings → /savings
}

const TABS = [
  { id: 'all', label: 'All holdings' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'defi', label: 'DeFi' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const SAVINGS_ICON = cdn('logo/logo-single.png');

// Logged-out demo — mirrors the marketing mock.
const DEMO_ROWS: Row[] = [
  {
    id: 'btc',
    name: 'BTC',
    iconUrl: assetDisplay('BTC').icon,
    sub: '0.0162 BTC',
    usd: 1040.04,
    changePct: 1.8,
    apyPct: null,
    group: 'crypto',
    href: paths.assets.details('BTC'),
  },
  {
    id: 'eth',
    name: 'ETH',
    iconUrl: assetDisplay('ETH').icon,
    sub: '0.412 ETH',
    usd: 1285.44,
    changePct: 2.6,
    apyPct: null,
    group: 'crypto',
    href: paths.assets.details('ETH'),
  },
  {
    id: 'xlm',
    name: 'XLM',
    iconUrl: assetDisplay('XLM').icon,
    sub: '1872.4 XLM',
    usd: 280.86,
    changePct: -0.4,
    apyPct: null,
    group: 'crypto',
    href: paths.assets.details('XLM'),
  },
  {
    id: 'savings',
    name: 'USDC Savings',
    iconUrl: SAVINGS_ICON,
    sub: 'DeFi · auto-compounding',
    usd: 700.02,
    changePct: null,
    apyPct: 8.09,
    group: 'defi',
    href: paths.savings,
  },
];
const DEMO_OVERALL_CHANGE = 2.4;

const ACTIONS: { key: AssetActionKey; label: string; icon: string }[] = [
  { key: 'buy', label: 'Buy', icon: 'ic:round-add' },
  { key: 'sell', label: 'Sell', icon: 'ic:round-remove' },
  { key: 'send', label: 'Send', icon: 'ic:round-arrow-upward' },
  { key: 'receive', label: 'Receive', icon: 'ic:round-arrow-downward' },
];

export function HeroPortfolioCard() {
  const { user } = useSupabaseAuth();
  const isAuthed = !!user;
  const portfolio = usePortfolio(isAuthed);
  const apy = useVaultApy();
  const router = useRouter();
  const { startAction } = useAssetActionsContext();
  const [tab, setTab] = useState<TabId>('all');

  const rows = useMemo<Row[]>(() => {
    if (!isAuthed) return [...DEMO_ROWS].sort((a, b) => b.usd - a.usd);
    const out: Row[] = [];
    // #32: on hybrid accounts every row is labeled by its owning wallet
    // (chain assets + companion Stellar = Normal; slot Stellar = the
    // external wallet). Single-wallet accounts stay label-free.
    const hybrid = !!portfolio.wallet.companionStellar;
    portfolio.walletPositions
      .filter((p) => p.balance != null && Number(p.balance) > 0)
      .forEach((p) => {
        const owner = !hybrid
          ? null
          : p.id.startsWith('companion:') || p.chain !== 'stellar'
            ? 'Normal'
            : 'External';
        out.push({
          id: p.id,
          name: owner ? `${p.symbol} · ${owner}` : p.symbol,
          iconUrl: p.iconUrl,
          sub: fmtCoin(Number(p.balance), p.symbol),
          usd: p.usdValue ? Number(p.usdValue) : 0,
          changePct: p.change24h ?? null,
          apyPct: null,
          group: 'crypto',
          href: paths.assets.details(p.symbol),
        });
      });
    if (portfolio.savingsUsd > 0) {
      out.push({
        id: 'savings',
        name: 'USDC Savings',
        iconUrl: SAVINGS_ICON,
        sub: 'DeFi · auto-compounding',
        usd: portfolio.savingsUsd,
        changePct: null,
        apyPct: apy ?? null,
        group: 'defi',
        href: paths.savings,
      });
    }
    // Biggest holdings first (by USD value) — same ordering as the drawer.
    return out.sort((a, b) => b.usd - a.usd);
  }, [
    isAuthed,
    portfolio.walletPositions,
    portfolio.wallet.companionStellar,
    portfolio.savingsUsd,
    apy,
  ]);

  const cryptoUsd = useMemo(
    () => rows.filter((r) => r.group === 'crypto').reduce((a, r) => a + r.usd, 0),
    [rows]
  );
  const defiUsd = useMemo(
    () => rows.filter((r) => r.group === 'defi').reduce((a, r) => a + r.usd, 0),
    [rows]
  );
  const totalUsd = cryptoUsd + defiUsd;

  // Overall portfolio 24h change = value-weighted across holdings (savings ≈ 0).
  const overallChange = useMemo(() => {
    if (!isAuthed) return DEMO_OVERALL_CHANGE;
    if (totalUsd <= 0) return 0;
    const weighted = rows.reduce((a, r) => a + (r.changePct != null ? r.usd * r.changePct : 0), 0);
    return weighted / totalUsd;
  }, [isAuthed, rows, totalUsd]);

  const subtotals: Record<TabId, number> = { all: totalUsd, crypto: cryptoUsd, defi: defiUsd };
  const visibleRows = rows.filter((r) => tab === 'all' || r.group === tab);

  // Same loader technique as the portfolio Holdings card: skeleton on first load
  // (no cache), and kept while savings is still resolving with nothing to show
  // yet — so all assets paint together, never one-by-one or an empty flash.
  // Savings is one of the rows, so waiting only "while there are no rows yet"
  // let the coins paint and dropped savings in a couple of seconds later.
  // Wait for both, but only on the first paint — once real data has rendered a
  // background refetch must never flash the skeleton back.
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  useEffect(() => {
    if (!portfolio.isLoading && !portfolio.savings.positionLoading) setFirstPaintDone(true);
  }, [portfolio.isLoading, portfolio.savings.positionLoading]);

  const loading =
    isAuthed && !firstPaintDone && (portfolio.isLoading || portfolio.savings.positionLoading);

  const changeColor = overallChange >= 0 ? UP : DOWN;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
        textAlign: 'left',
        bgcolor: '#fff',
        border: '1px solid rgba(10,10,15,0.08)',
        borderRadius: '24px',
        p: { xs: '18px', sm: '22px' },
        boxShadow: '0 1px 2px rgba(10,10,15,0.04), 0 30px 60px -20px rgba(10,10,15,0.18)',
      }}
    >
      {/* header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#9A9AA3',
              mb: 2,
            }}
          >
            Your Normal Portfolio
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={160} height={40} />
          ) : (
            <Typography
              sx={{
                fontSize: 'clamp(28px, 5vw, 34px)',
                fontWeight: 400,
                color: INK,
                lineHeight: 1.1,
                ...MONO,
                letterSpacing: '-0.02em',
              }}
            >
              {fmtUsd(totalUsd)}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: '8px',
            py: '4px',
            borderRadius: '999px',
            bgcolor: overallChange >= 0 ? 'rgba(26,179,125,0.12)' : 'rgba(229,72,77,0.12)',
          }}
        >
          <Typography
            sx={{ fontSize: 12.5, fontWeight: 400, color: changeColor, lineHeight: 1, ...MONO }}
          >
            {fmtPct(overallChange)}
          </Typography>
        </Box>
      </Stack>

      {/* tabs */}
      <Stack direction="row" spacing={1} sx={{ mt: 3, mb: 0.5 }}>
        {TABS.map((tb) => {
          const on = tab === tb.id;
          return (
            <Box
              key={tb.id}
              role="button"
              tabIndex={0}
              onClick={() => setTab(tb.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setTab(tb.id);
              }}
              sx={{
                flex: 1,
                px: '12px',
                py: '10px',
                borderRadius: '12px',
                cursor: 'pointer',
                userSelect: 'none',
                bgcolor: on ? '#fff' : 'rgba(10,10,15,0.035)',
                border: `1px solid ${on ? 'rgba(10,10,15,0.1)' : 'transparent'}`,
                transition: 'all .15s ease',
                // Hover animation for the inactive tabs — mirrors the Buy/Sell/
                // Send/Receive buttons below (bg lifts, border shows, text darkens).
                ...(!on && {
                  '&:hover': { bgcolor: 'rgba(10,10,15,0.06)', borderColor: 'rgba(10,10,15,0.12)' },
                  '&:hover .tab-label': { color: INK },
                }),
              }}
            >
              <Typography
                className="tab-label"
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: on ? INK : '#6B6B76',
                  lineHeight: 1.25,
                  transition: 'color .15s ease',
                }}
              >
                {tb.label}
              </Typography>
              <Typography
                sx={{ fontSize: 13, color: on ? '#6B6B76' : '#9A9AA3', mt: '3px', ...MONO }}
              >
                {loading ? '—' : fmtUsd0(subtotals[tb.id])}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* holdings — capped height so the list scrolls once there are more than
            ~5 assets (we keep adding more). The container carries the same -8px
            gutter as the rows so the hover bleed stays aligned and the scrollbar
            sits in the margin, clear of the USD amounts. */}
      <Stack
        sx={{
          mt: 2,
          // Asymmetric gutter: left stays at -8px (row hover bleed aligned),
          // right is wider so the scrollbar sits further into the margin and
          // clears the USD amounts. Amounts stay put — only the scrollbar moves.
          ml: '-8px',
          pl: '8px',
          mr: '-14px',
          pr: '14px',
          maxHeight: 350,
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(10,10,15,0.14)', borderRadius: '3px' },
          '&::-webkit-scrollbar-thumb:hover': { background: 'rgba(10,10,15,0.26)' },
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(10,10,15,0.14) transparent',
        }}
        divider={<Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />}
      >
        {loading ? (
          [0, 1, 2].map((i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ py: '15px' }}>
              <Skeleton variant="circular" width={36} height={36} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="25%" />
              </Box>
              <Skeleton variant="text" width={60} />
            </Stack>
          ))
        ) : visibleRows.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: '#9A9AA3', py: 3, textAlign: 'center' }}>
            {tab === 'defi' ? 'No DeFi positions yet.' : 'No holdings yet.'}
          </Typography>
        ) : (
          visibleRows.map((r) => (
            <Stack
              key={r.id}
              direction="row"
              alignItems="center"
              spacing={1.5}
              role="button"
              tabIndex={0}
              onClick={() => router.push(r.href)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') router.push(r.href);
              }}
              sx={{
                py: '15px',
                px: '8px',
                mx: '-8px',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'background 150ms',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.035)' },
              }}
            >
              <Box
                component="img"
                src={r.iconUrl}
                alt={r.name}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                  bgcolor: 'rgba(10,10,15,0.04)',
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: INK, lineHeight: 1.2 }}>
                  {r.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: '#9A9AA3',
                    mt: '1px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    ...(r.group === 'crypto' ? MONO : {}),
                  }}
                >
                  {r.sub}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography
                  sx={{ fontSize: 14.5, fontWeight: 400, color: INK, lineHeight: 1.2, ...MONO }}
                >
                  {fmtUsd(r.usd)}
                </Typography>
                {r.apyPct != null ? (
                  <Typography sx={{ fontSize: 12, fontWeight: 400, color: UP, mt: '1px', ...MONO }}>
                    {r.apyPct.toFixed(2)}% APY
                  </Typography>
                ) : r.changePct != null ? (
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 400,
                      color: r.changePct >= 0 ? UP : DOWN,
                      mt: '1px',
                      ...MONO,
                    }}
                  >
                    {fmtPct(r.changePct)}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          ))
        )}
      </Stack>

      {/* actions */}
      <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
        {ACTIONS.map((a) => (
          <Box
            key={a.key}
            role="button"
            tabIndex={0}
            onClick={() => startAction(a.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') startAction(a.key);
            }}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              py: '12px',
              borderRadius: '14px',
              cursor: 'pointer',
              color: '#6B6B76',
              border: '1px solid rgba(10,10,15,0.08)',
              transition: 'all .15s ease',
              '&:hover': {
                bgcolor: 'rgba(10,10,15,0.03)',
                color: '#0A0A0F',
                borderColor: 'rgba(10,10,15,0.14)',
              },
              '&:hover .action-icon-box': { bgcolor: '#0A0A0F', color: '#fff' },
            }}
          >
            <Box
              className="action-icon-box"
              sx={{
                width: 30,
                height: 30,
                borderRadius: '9px',
                bgcolor: '#F4F4F7',
                color: '#0A0A0F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all .15s ease',
              }}
            >
              <Iconify icon={a.icon} width={18} sx={{ color: 'inherit' }} />
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'inherit' }}>
              {a.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

HeroPortfolioCard.displayName = 'HeroPortfolioCard';
