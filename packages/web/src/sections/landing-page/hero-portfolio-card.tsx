'use client';

import type { Token } from '@normalfinance/types';
import type { TurnkeyChain } from '@/lib/turnkey/add-account';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useMemo, useState } from 'react';
import { cdn } from '@normalfinance/utils';
import { useRouter } from 'next/navigation';
import { ModalType } from '@normalfinance/types';
import { useVaultApy } from '@/hooks/use-vault-apy';
import { usePortfolio } from '@/hooks/use-portfolio';
import { assetDisplay } from '@/lib/portfolio/display';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAppStore, usePersistStore } from '@normalfinance/state';

import { Box, Stack, Skeleton, Typography } from '@mui/material';

import PickToken from '@/components/_common/pick-token';
import { Iconify } from '@/components/template/iconify';
import OnRampDialog from '@/components/_common/onramp-dialog';
import ReceiveModal from '@/components/_common/receive-modal';
import OffRampDialog from '@/components/_common/offramp-dialog';
import { ChainSetupDialog } from '@/components/_common/chain-setup-dialog';
import { ChainReceiveModal } from '@/components/_common/chain-receive-modal';
import { BitcoinReceiveModal } from '@/components/_common/bitcoin-receive-modal';

// ----------------------------------------------------------------------
// Home-hero portfolio card. Logged-in → the user's real holdings (wallet
// crypto + savings) via usePortfolio; logged-out → an attractive demo. Three
// tabs (All holdings / Crypto / DeFi). The top % badge is the overall
// portfolio's value-weighted 24h change. Replaces the old SavingsCard in the
// hero only — /savings keeps its own SavingsCard.
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
  { id: 'btc', name: 'BTC', iconUrl: assetDisplay('BTC').icon, sub: '0.0162 BTC', usd: 1040.04, changePct: 1.8, apyPct: null, group: 'crypto', href: paths.assets.details('BTC') },
  { id: 'eth', name: 'ETH', iconUrl: assetDisplay('ETH').icon, sub: '0.412 ETH', usd: 1285.44, changePct: 2.6, apyPct: null, group: 'crypto', href: paths.assets.details('ETH') },
  { id: 'xlm', name: 'XLM', iconUrl: assetDisplay('XLM').icon, sub: '1872.4 XLM', usd: 280.86, changePct: -0.4, apyPct: null, group: 'crypto', href: paths.assets.details('XLM') },
  { id: 'savings', name: 'USDC Savings', iconUrl: SAVINGS_ICON, sub: 'DeFi · auto-compounding', usd: 700.02, changePct: null, apyPct: 8.09, group: 'defi', href: paths.savings },
];
const DEMO_OVERALL_CHANGE = 2.4;

type Blockchain = 'stellar' | 'bitcoin' | 'ethereum' | 'solana';
interface AssetMeta {
  symbol: string;
  blockchain: Blockchain;
  name: string;
  icon: string;
  decimals: number;
  contract: string;
}

// Assets offered in the Buy / Receive pickers (Sell filters to held only).
const SUPPORTED: AssetMeta[] = [
  { symbol: 'USDC', blockchain: 'stellar', name: 'USD Coin', icon: assetDisplay('USDC').icon, decimals: 7, contract: '__usdc__' },
  { symbol: 'XLM', blockchain: 'stellar', name: 'Stellar Lumens', icon: assetDisplay('XLM').icon, decimals: 7, contract: '__xlm__' },
  { symbol: 'BTC', blockchain: 'bitcoin', name: 'Bitcoin', icon: assetDisplay('BTC').icon, decimals: 8, contract: '__btc__' },
  { symbol: 'ETH', blockchain: 'ethereum', name: 'Ethereum', icon: assetDisplay('ETH').icon, decimals: 18, contract: '__eth__' },
  { symbol: 'SOL', blockchain: 'solana', name: 'Solana', icon: assetDisplay('SOL').icon, decimals: 9, contract: '__sol__' },
];

type ActionKey = 'buy' | 'sell' | 'send' | 'receive';
const ACTIONS: { key: ActionKey; label: string; icon: string }[] = [
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
  const persist = usePersistStore();
  const { setModalView } = useAppStore();
  const { addresses, refetch: refetchAddresses } = useTurnkeyWallet(isAuthed);
  const [tab, setTab] = useState<TabId>('all');
  const [picker, setPicker] = useState<'buy' | 'sell' | 'receive' | null>(null);
  const [flow, setFlow] = useState<{ action: 'buy' | 'sell' | 'receive'; symbol: string } | null>(null);
  const [setup, setSetup] = useState<{ chain: TurnkeyChain; action: 'buy' | 'sell' | 'receive'; symbol: string } | null>(null);

  const rows = useMemo<Row[]>(() => {
    if (!isAuthed) return [...DEMO_ROWS].sort((a, b) => b.usd - a.usd);
    const out: Row[] = [];
    portfolio.walletPositions
      .filter((p) => p.balance != null && Number(p.balance) > 0)
      .forEach((p) => {
        out.push({
          id: p.id,
          name: p.symbol,
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
  }, [isAuthed, portfolio.walletPositions, portfolio.savingsUsd, apy]);

  const cryptoUsd = useMemo(() => rows.filter((r) => r.group === 'crypto').reduce((a, r) => a + r.usd, 0), [rows]);
  const defiUsd = useMemo(() => rows.filter((r) => r.group === 'defi').reduce((a, r) => a + r.usd, 0), [rows]);
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
  const loading =
    isAuthed && (portfolio.isLoading || (portfolio.savings.positionLoading && rows.length === 0));

  const addressFor = (bc: Blockchain): string | null => {
    if (bc === 'stellar') return persist.wallet.address || null;
    if (bc === 'bitcoin') return addresses?.bitcoinAddress ?? null;
    if (bc === 'ethereum') return addresses?.ethereumAddress ?? null;
    return addresses?.solanaAddress ?? null;
  };

  // Token objects for the picker: real store tokens for Stellar (USDC/XLM),
  // synthesized from portfolio data for the native chains.
  const pickerTokens: Token[] = SUPPORTED.map((m) => {
    const stored = m.blockchain === 'stellar'
      ? persist.tokenState.tokens.find((tk) => tk.symbol === m.symbol)
      : undefined;
    if (stored) return stored;
    const a = portfolio.getAsset(m.symbol);
    return {
      symbol: m.symbol,
      contract: m.contract,
      name: m.name,
      issuer: '',
      org: '',
      domain: '',
      icon: m.icon,
      decimals: m.decimals,
      featured: false,
      balance: a?.balance ?? '0',
      price: a?.price ?? '0',
      percentageChange: a?.change24h ?? 0,
    } as Token;
  });
  const sellTokens = pickerTokens.filter((tk) => BigNumber(tk.balance).gt(0));

  // Open the chosen asset's flow — provisioning the native chain first if its
  // address doesn't exist yet (lazy, like the asset detail page).
  const startFlow = (action: 'buy' | 'sell' | 'receive', symbol: string) => {
    const m = SUPPORTED.find((x) => x.symbol === symbol);
    if (!m) return;
    if (m.blockchain === 'stellar') {
      if (!persist.wallet.address) {
        window.dispatchEvent(new CustomEvent('nf:open-wallet-setup'));
        return;
      }
    } else if (!addressFor(m.blockchain)) {
      setSetup({ chain: m.blockchain as TurnkeyChain, action, symbol });
      return;
    }
    setFlow({ action, symbol });
  };

  const handleActionClick = (key: ActionKey) => () => {
    if (!isAuthed) {
      window.dispatchEvent(new CustomEvent('nf:open-login'));
      return;
    }
    if (key === 'send') {
      setModalView(ModalType.SEND_CRYPTO, true);
      return;
    }
    setPicker(key);
  };

  const handleSetupSuccess = async () => {
    await refetchAddresses();
    const s = setup;
    setSetup(null);
    if (s) setFlow({ action: s.action, symbol: s.symbol });
  };

  const flowMeta = flow ? SUPPORTED.find((m) => m.symbol === flow.symbol) ?? null : null;
  const flowBlockchain: Blockchain = flowMeta?.blockchain ?? 'stellar';
  const flowAddress = flowMeta ? addressFor(flowMeta.blockchain) : null;
  const flowBalanceNum = flow ? Number(portfolio.getAsset(flow.symbol)?.balance ?? 0) : 0;
  const isReceive = flow?.action === 'receive';

  const changeColor = overallChange >= 0 ? UP : DOWN;

  return (
    <>
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
          <Typography sx={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9A9AA3', mb: 1.25 }}>
            Your Normal Portfolio
          </Typography>
          {loading ? (
            <Skeleton variant="text" width={160} height={40} />
          ) : (
            <Typography sx={{ fontSize: 'clamp(28px, 5vw, 34px)', fontWeight: 400, color: INK, lineHeight: 1.1, ...MONO, letterSpacing: '-0.02em' }}>
              {fmtUsd(totalUsd)}
            </Typography>
          )}
        </Box>
        <Stack alignItems="flex-end" spacing={0.25}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              px: '8px',
              py: '4px',
              borderRadius: '999px',
              bgcolor: overallChange >= 0 ? 'rgba(26,179,125,0.12)' : 'rgba(229,72,77,0.12)',
            }}
          >
            <Iconify icon={overallChange >= 0 ? 'ic:round-arrow-outward' : 'ic:round-south-east'} width={13} sx={{ color: changeColor }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 400, color: changeColor, lineHeight: 1, ...MONO }}>
              {fmtPct(overallChange)}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 11, color: '#9A9AA3' }}>today</Typography>
        </Stack>
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTab(tb.id); }}
              sx={{
                flex: 1,
                px: '12px',
                py: '9px',
                borderRadius: '12px',
                cursor: 'pointer',
                userSelect: 'none',
                bgcolor: on ? '#fff' : 'rgba(10,10,15,0.035)',
                border: `1px solid ${on ? 'rgba(10,10,15,0.1)' : 'transparent'}`,
                transition: 'background 150ms, border-color 150ms',
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: on ? INK : '#6B6B76', lineHeight: 1.2 }}>
                {tb.label}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: on ? '#6B6B76' : '#9A9AA3', mt: '2px', ...MONO }}>
                {loading ? '—' : fmtUsd0(subtotals[tb.id])}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* holdings */}
      <Stack sx={{ mt: 1 }} divider={<Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />}>
        {loading ? (
          [0, 1, 2].map((i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ py: '12px' }}>
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(r.href); }}
              sx={{
                py: '12px',
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
                sx={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, bgcolor: 'rgba(10,10,15,0.04)' }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: INK, lineHeight: 1.2 }}>
                  {r.name}
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#9A9AA3', mt: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(r.group === 'crypto' ? MONO : {}) }}>
                  {r.sub}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                <Typography sx={{ fontSize: 14.5, fontWeight: 400, color: INK, lineHeight: 1.2, ...MONO }}>
                  {fmtUsd(r.usd)}
                </Typography>
                {r.apyPct != null ? (
                  <Typography sx={{ fontSize: 12, fontWeight: 400, color: UP, mt: '1px', ...MONO }}>
                    {r.apyPct.toFixed(2)}% APY
                  </Typography>
                ) : r.changePct != null ? (
                  <Typography sx={{ fontSize: 12, fontWeight: 400, color: r.changePct >= 0 ? UP : DOWN, mt: '1px', ...MONO }}>
                    {fmtPct(r.changePct)}
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          ))
        )}
      </Stack>

      {/* actions */}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        {ACTIONS.map((a) => (
          <Box
            key={a.key}
            role="button"
            tabIndex={0}
            onClick={handleActionClick(a.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleActionClick(a.key)(); }}
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
              '&:hover': { bgcolor: 'rgba(10,10,15,0.03)', color: '#0A0A0F', borderColor: 'rgba(10,10,15,0.14)' },
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
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'inherit' }}>{a.label}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>

      {/* Asset picker → routes Buy / Sell / Receive into the chosen asset's flow */}
      <PickToken
        open={picker !== null}
        onClose={() => setPicker(null)}
        buttonSource={picker ?? undefined}
        tokens={picker === 'sell' ? sellTokens : pickerTokens}
        onTokenSelect={(token) => {
          const action = picker;
          setPicker(null);
          if (action) startFlow(action, token.symbol);
        }}
      />

      <OnRampDialog
        open={flow?.action === 'buy'}
        amount="100"
        onClose={() => setFlow(null)}
        walletAddress={flowAddress ?? undefined}
        asset={{ symbol: flow?.symbol ?? 'USDC', blockchain: flowBlockchain }}
        providers={flow?.symbol === 'USDC' ? ['stripe', 'coinbase', 'moneygram'] : ['stripe', 'coinbase']}
      />

      <OffRampDialog
        open={flow?.action === 'sell'}
        amount="100"
        onClose={() => setFlow(null)}
        walletAddress={flowAddress ?? undefined}
        asset={{ symbol: flow?.symbol ?? 'USDC', blockchain: flowBlockchain }}
        providers={flow?.symbol === 'USDC' ? ['coinbase', 'moneygram'] : ['coinbase']}
        assetBalance={flowBalanceNum}
      />

      <ReceiveModal
        open={isReceive && flowBlockchain === 'stellar'}
        context="receive"
        onClose={() => setFlow(null)}
      />

      <BitcoinReceiveModal
        open={isReceive && flowBlockchain === 'bitcoin'}
        address={addressFor('bitcoin')}
        onClose={() => setFlow(null)}
      />

      <ChainReceiveModal
        open={isReceive && (flowBlockchain === 'ethereum' || flowBlockchain === 'solana')}
        onClose={() => setFlow(null)}
        address={flowAddress}
        chainLabel={flowMeta?.name ?? ''}
        symbol={flow?.symbol ?? ''}
        warning={`Only send ${flow?.symbol ?? ''} on the ${flowMeta?.name ?? ''} network to this address!`}
      />

      {user && setup && (
        <ChainSetupDialog
          open
          onClose={() => setSetup(null)}
          chain={setup.chain}
          userId={user.id}
          userEmail={user.email}
          onSuccess={handleSetupSuccess}
        />
      )}
    </>
  );
}

HeroPortfolioCard.displayName = 'HeroPortfolioCard';
