'use client';

import type { ReactNode } from 'react';
import type { Activity } from '@/types/activity';
import type { ChainId } from '@/lib/chains/registry';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { indexById } from '@/lib/index/indexes';
import { usePersistStore } from '@normalfinance/state';
import { INK, HOVER, MUTED } from '@/theme/brand-colors';
import { CHAINS, chainForSymbol } from '@/lib/chains/registry';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useUserActivity } from '@/hooks/stellar/use-user-activity';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import LayersOutlined from '@mui/icons-material/LayersOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import DonutSmallOutlined from '@mui/icons-material/DonutSmallOutlined';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';

import { HAIRLINE, SegmentedControl } from '@/components/_common/brand';
import MoneyGramDetailModal from '@/components/_common/moneygram-detail-modal';
import { SwapDetailModal, cctpTransferIdOf } from '@/components/_common/swap-detail-modal';
import {
  BOX_PX,
  SeeAll,
  ListRow,
  RowIcon,
  RowList,
  AppBlock,
  appLocale,
  assetName,
  assetNoun,
  formatUsd,
  formatCoin,
  StatusBadge,
  RowsSkeleton,
} from '@/components/_common/app-ui';

import { PAGE_SIZE } from './_shared';

import type { ActivityTab } from './_shared';

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function getExplorerUrl(a: Activity): string | null {
  // Pending sends carry their chain inside the id
  // (`pending-send:<chain>:<hash>`) — the hash alone doesn't say where it
  // lives, and an ETH hash opened in stellar.expert renders an endless
  // spinner. Explorer bases come from the chain registry, the single source
  // of truth, so a new chain cannot reintroduce this bug here.
  if (a.id.startsWith('pending-send:')) {
    const rest = a.id.slice('pending-send:'.length);
    const sep = rest.indexOf(':');
    const chain = rest.slice(0, sep) as ChainId;
    const hash = rest.slice(sep + 1);
    return CHAINS[chain] && hash ? CHAINS[chain].explorerTx(hash) : null;
  }
  if ((a.type === 'Sent' || a.type === 'Receive') && a.id.startsWith('btc:') && a.txHash) {
    return CHAINS.bitcoin.explorerTx(a.txHash);
  }
  if ((a.type === 'Sent' || a.type === 'Receive') && a.id.startsWith('eth:') && a.txHash) {
    return CHAINS.ethereum.explorerTx(a.txHash);
  }
  if ((a.type === 'Sent' || a.type === 'Receive') && a.id.startsWith('sol:') && a.txHash) {
    return CHAINS.solana.explorerTx(a.txHash);
  }
  // Cross-chain (LI.FI) swap — link to LI.FI's own explorer, which shows the
  // whole journey (source + bridge + destination + status) in one view,
  // rather than a single-leg chain explorer.
  if (a.type === 'Swap' && a.txHash && a.tokenIn.address?.startsWith('lifi:')) {
    return `https://scan.li.fi/tx/${a.txHash}`;
  }
  // CCTP composite swap spans Stellar + Circle + a chain leg — no single tx
  // explorer captures the whole journey, so we omit the link.
  if (a.type === 'Swap' && a.tokenIn.address?.startsWith('cctp:')) {
    return null;
  }
  switch (a.type) {
    case 'Savings Deposit':
    case 'Savings Withdraw':
    case 'Swap':
      return a.txHash ? CHAINS.stellar.explorerTx(a.txHash) : null;
    case 'Sent':
    case 'Receive':
      if (a.txHash) return CHAINS.stellar.explorerTx(a.txHash);
      if (a.id.startsWith('horizon:'))
        return `https://stellar.expert/explorer/public/op/${a.id.slice(8)}`;
      return null;
    default:
      return null;
  }
}

// Whether an activity involves the given asset symbol (used by the
// per-asset view on /assets/[symbol]). Savings flows are USDC by definition.
function matchesAsset(a: Activity, symbol: string): boolean {
  switch (a.type) {
    case 'Swap':
      return a.tokenIn.symbol === symbol || a.tokenOut.symbol === symbol;
    case 'Savings Deposit':
    case 'Savings Withdraw':
      return symbol === 'USDC';
    case 'Sent':
    case 'Receive':
      return a.token.symbol === symbol;
    case 'Buy':
    case 'Sell':
    case 'Mint':
    case 'Redeem':
    case 'Add Liquidity':
    case 'Remove Liquidity':
      return a.symbol === symbol;
    default:
      return false;
  }
}

/** An address short enough for a line: GASJ…XVYV. */
const shortAddress = (address: string) =>
  address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;

/** A coin amount, or dollars when the coin is dollars. */
const amountOf = (amount: number, symbol: string) =>
  symbol === 'USDC' ? formatUsd(amount) : formatCoin(amount, symbol);

type Described = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  value: string;
  /** Under the value: what was paid in a swap, or the time. */
  detail?: string;
  status?: { tone: 'pending' | 'failed'; label: string };
};

/**
 * Each row in words, for people who don't know crypto: what happened, with
 * whom, and how much. Money in is +, money out is −; a move into or out of
 * Savings carries no sign, and a swap shows what came in (+) over what it
 * cost (−). The icon says the kind, in grey: colour is kept for pending and
 * failed.
 */
function describe(a: Activity): Described {
  switch (a.type) {
    case 'Receive':
      return {
        icon: <SouthWestRounded />,
        title: `Received ${assetNoun(a.token.symbol)}`,
        subtitle: `From ${shortAddress(a.address)}`,
        value: `+${amountOf(a.token.amount, a.token.symbol)}`,
        status: a.confirmed === false ? { tone: 'pending', label: 'Pending' } : undefined,
      };
    case 'Sent': {
      if (a.offramp) {
        return {
          icon: <AccountBalanceOutlined />,
          title: 'Cashed out',
          subtitle: a.offrampProvider ? `To your bank, via ${a.offrampProvider}` : 'To your bank',
          value: `−${amountOf(a.token.amount, a.token.symbol)}`,
          status:
            a.offrampStatus === 'pending'
              ? { tone: 'pending', label: 'Pending' }
              : a.offrampStatus === 'failed'
                ? { tone: 'failed', label: 'Failed' }
                : undefined,
        };
      }
      return {
        icon: <NorthEastRounded />,
        title: `Sent ${assetNoun(a.token.symbol)}`,
        subtitle: `To ${shortAddress(a.address)}`,
        value: `−${amountOf(a.token.amount, a.token.symbol)}`,
        status: a.confirmed === false ? { tone: 'pending', label: 'Pending' } : undefined,
      };
    }
    case 'Swap': {
      // A crypto index purchase: digital dollars out, several coins in.
      if (a.tokenOut.symbol === 'INDEX') {
        const index = indexById(a.tokenOut.address.replace(/^index:/, ''));
        return {
          icon: <DonutSmallOutlined />,
          title: index ? `Bought the ${index.name} index` : 'Bought an index',
          subtitle: index
            ? index.def.coins.map((symbol) => assetName(symbol)).join(', ')
            : undefined,
          value: `−${amountOf(a.tokenIn.amount, a.tokenIn.symbol)}`,
          status: a.failed
            ? { tone: 'failed', label: 'Failed' }
            : a.needsYou
              ? { tone: 'pending', label: 'Action needed' }
              : a.pending
                ? { tone: 'pending', label: 'Pending' }
                : undefined,
        };
      }
      // A pending swap whose delivered amount is still unknown must not show a
      // confident zero (live test 2026-08-19: an in-flight BTC to USDC row).
      const outKnown = !(a.pending && !(a.tokenOut.amount > 0));
      return {
        icon: <SwapHorizRounded />,
        title: `Swapped to ${assetNoun(a.tokenOut.symbol)}`,
        value: outKnown ? `+${amountOf(a.tokenOut.amount, a.tokenOut.symbol)}` : '…',
        detail: `−${amountOf(a.tokenIn.amount, a.tokenIn.symbol)}`,
        status: a.failed
          ? { tone: 'failed', label: 'Failed' }
          : a.refunded
            ? { tone: 'pending', label: 'Refunded' }
            : a.pending
              ? { tone: 'pending', label: 'Pending' }
              : undefined,
      };
    }
    case 'Savings Deposit':
      return {
        icon: <SavingsOutlined />,
        title: 'Moved to Savings',
        subtitle: 'From your wallet',
        value: formatUsd(parseFloat(a.amount)),
      };
    case 'Savings Withdraw':
      return {
        icon: <SavingsOutlined />,
        title: 'Moved out of Savings',
        subtitle: 'To your wallet',
        value: formatUsd(parseFloat(a.amount)),
      };
    case 'Buy':
      return {
        icon: <AddRounded />,
        title: 'Added money',
        subtitle: a.provider ? `Via ${a.provider}` : undefined,
        value: `+${amountOf(a.amount, a.symbol)}`,
        status: a.failed
          ? { tone: 'failed', label: 'Failed' }
          : a.pending
            ? { tone: 'pending', label: 'Pending' }
            : undefined,
      };
    case 'Sell':
      return {
        icon: <AccountBalanceOutlined />,
        title: 'Cashed out',
        subtitle: a.provider ? `Via ${a.provider}` : undefined,
        value: `−${amountOf(a.amount, a.symbol)}`,
        status: a.failed
          ? { tone: 'failed', label: 'Failed' }
          : a.pending
            ? { tone: 'pending', label: 'Pending' }
            : undefined,
      };
    case 'Mint':
    case 'Redeem':
    case 'Add Liquidity':
    case 'Remove Liquidity':
      return {
        icon: <LayersOutlined />,
        title: a.type,
        value: formatCoin(a.amount, a.symbol),
      };
    default:
      return { icon: <LayersOutlined />, title: 'Activity', value: '' };
  }
}

const dayKey = (ts: number) => new Date(ts).toDateString();

/** Today, Yesterday, or the date: Wed, Nov 5 (with the year when it isn't this one). */
function dayLabel(ts: number): string {
  const date = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(appLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
  });
}

const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString(appLocale(), { hour: 'numeric', minute: '2-digit' });

/** Newest first, one group per day. */
function groupByDay(items: Activity[]) {
  const groups: { key: string; label: string; items: Activity[] }[] = [];
  items.forEach((item) => {
    const ts = Number(item.timestamp) || 0;
    const key = dayKey(ts);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(ts), items: [item] });
  });
  return groups;
}

// -------------------------------------------------------------------
// Pager
// -------------------------------------------------------------------

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const arrow = (disabled: boolean) => ({
    width: 36,
    height: 36,
    color: disabled ? MUTED : INK,
    opacity: disabled ? 0.4 : 1,
    '&:hover': disabled ? {} : { bgcolor: HOVER },
  });

  return (
    // In an open list the last row already draws the line above the pager,
    // so `nf-label` drops this one (it doubled up) and lines it up with the rows.
    <Box
      className="nf-label"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1,
        px: BOX_PX,
        py: 1.25,
        borderTop: HAIRLINE,
      }}
    >
      <Typography sx={{ mr: 1, fontSize: 13, color: MUTED }}>
        Page {page} of {totalPages}
      </Typography>
      <ButtonBase
        aria-label="Newer"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        sx={arrow(page === 1)}
      >
        <ChevronLeftRounded />
      </ButtonBase>
      <ButtonBase
        aria-label="Older"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        sx={arrow(page === totalPages)}
      >
        <ChevronRightRounded />
      </ButtonBase>
    </Box>
  );
}

// -------------------------------------------------------------------
// ActivityCard
// -------------------------------------------------------------------

interface ActivityCardProps {
  walletAddress: string | null | undefined;
  bitcoinAddress?: string | null;
  ethereumAddress?: string | null;
  solanaAddress?: string | null;
  /** Show only activity involving this asset (e.g. "BTC" on /assets/BTC). */
  assetSymbol?: string;
  /** Initial filter tab (defaults to "all"). */
  defaultTab?: ActivityTab;
  /**
   * The most recent rows only, without filters or pages, with "See all" to
   * the Activity page: Home's recent activity.
   */
  limit?: number;
  /** The block's title (defaults to "Activity"); null when the page already says it. */
  title?: string | null;
}

/**
 * The account's activity as a feed: one row per payment, swap or savings move,
 * in words, grouped by day, newest first. A row opens its details (a swap or
 * MoneyGram dialog) or the transaction on its chain's explorer.
 */
export function ActivityCard({
  walletAddress,
  bitcoinAddress,
  ethereumAddress,
  solanaAddress,
  assetSymbol,
  defaultTab = 'all',
  limit,
  title,
}: ActivityCardProps) {
  const { t } = useTranslate();
  const [tab, setTab] = useState<ActivityTab>(defaultTab);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  // MoneyGram rows (id `mgi:<id>`) open our detail modal instead of an explorer.
  const [mgiDetailId, setMgiDetailId] = useState<string | null>(null);

  // #32 chunk 5: on hybrid accounts the feed covers BOTH wallets — the slot
  // feed alone hid every companion-side action (savings deposits, cctp legs).
  // Two instances of the same deduped hook; merged newest-first below.
  const { companionStellar } = useWalletBalances(true);
  const persistWallet = usePersistStore().wallet;
  const isHybrid =
    !!companionStellar &&
    persistWallet.walletType != null &&
    persistWallet.walletType !== 'normal-wallet' &&
    companionStellar.address !== walletAddress;
  const slotFeed = useUserActivity(walletAddress, {
    bitcoinAddress,
    ethereumAddress,
    solanaAddress,
  });
  const companionFeed = useUserActivity(isHybrid ? companionStellar.address : null, {});
  const isLoading = slotFeed.isLoading || (isHybrid && companionFeed.isLoading);
  const mutate = useCallback(() => {
    slotFeed.mutate();
    if (isHybrid) companionFeed.mutate();
  }, [slotFeed.mutate, isHybrid, companionFeed.mutate]); // eslint-disable-line react-hooks/exhaustive-deps
  const recentActivity = useMemo(() => {
    if (!isHybrid) return slotFeed.recentActivity;
    // Dedupe by id: a hybrid cctp swap involves BOTH wallets, so both feeds
    // return the SAME row (observed live 2026-08-19: one swap listed twice).
    // NaN-safe sort: one row with a missing/string timestamp made the whole
    // comparator undefined-order, leaving a fresh row below an hour-old one.
    const ts = (x: Activity) => Number(x.timestamp) || 0;
    const seen = new Set<string>();
    // A cctp row appears in BOTH feeds, so the feed can't say whose money it
    // was — it used to inherit the slot wallet's name and claimed "Lobstr"
    // for swaps the Normal wallet paid for (live incident 2026-08-22). When
    // the row states its funding source, that wins over the feed.
    const bySource = (a: Activity, fallback: string) => {
      // An explicit funding declaration always wins (live incident
      // 2026-08-22): a swap the Lobstr wallet paid for stays "Lobstr" even
      // when it delivered a native asset.
      const funded = (a as Activity & { fundedFrom?: string }).fundedFrom;
      if (funded) {
        return funded === 'external'
          ? connectedWalletLabel(persistWallet.walletType)
          : 'Normal wallet';
      }
      // Native-chain rows (BTC/ETH/SOL — registry-derived, never hardcoded)
      // can ONLY be the Turnkey Normal wallet: external wallets are
      // Stellar-only, so inheriting the slot feed's label painted "Lobstr"
      // on transactions Lobstr cannot even sign (Niko 2026-08-26).
      // Sent/Receive rows carry the asset as token.symbol; Mint/Buy-style
      // rows carry a bare symbol — read whichever the union member has.
      const rowSymbol =
        (a as { symbol?: string }).symbol ??
        (a as { token?: { symbol?: string } }).token?.symbol ??
        '';
      const chain = chainForSymbol(rowSymbol);
      if (chain && chain !== 'stellar') return 'Normal wallet';
      return fallback;
    };
    const tagBySource = (list: Activity[], fallback: string) =>
      list.map(
        (a) => ({ ...a, walletTag: bySource(a, fallback) }) as Activity & { walletTag?: string }
      );
    return [
      ...tagBySource(slotFeed.recentActivity, connectedWalletLabel(persistWallet.walletType)),
      ...tagBySource(companionFeed.recentActivity, 'Normal wallet'),
    ]
      .filter((x) => {
        if (seen.has(x.id)) return false;
        seen.add(x.id);
        return true;
      })
      .sort((x, y) => ts(y) - ts(x));
  }, [isHybrid, slotFeed.recentActivity, companionFeed.recentActivity, persistWallet.walletType]);

  // Re-fetch wallet activity after a deposit or withdrawal completes.
  useEffect(() => {
    const handler = () => setTimeout(mutate, 1500);
    window.addEventListener('nf:savings-position-updated', handler);
    // Swaps/sends announce here — the feed refreshed only on savings events,
    // so a just-started swap's row (#27, created before broadcast) stayed
    // invisible until Done (Niko live test 2026-08-19).
    window.addEventListener('nf:activity-updated', handler);
    return () => {
      window.removeEventListener('nf:savings-position-updated', handler);
      window.removeEventListener('nf:activity-updated', handler);
    };
  }, [mutate]);

  const filtered = useMemo(() => {
    const base = assetSymbol
      ? recentActivity.filter((a) => matchesAsset(a, assetSymbol))
      : recentActivity;
    switch (tab) {
      case 'swaps':
        return base.filter((a) => a.type === 'Swap');
      case 'savings':
        return base.filter((a) => a.type === 'Savings Deposit' || a.type === 'Savings Withdraw');
      case 'transfers':
        return base.filter(
          (a) => a.type === 'Sent' || a.type === 'Receive' || a.type === 'Buy' || a.type === 'Sell'
        );
      default:
        return base;
    }
  }, [recentActivity, tab, assetSymbol]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTabChange = (newTab: ActivityTab) => {
    setTab(newTab);
    setPage(1);
  };

  const TABS: { value: ActivityTab; label: string }[] = [
    { value: 'all', label: t('All') },
    { value: 'swaps', label: t('Swaps') },
    { value: 'savings', label: t('Savings') },
    { value: 'transfers', label: t('Transfers') },
  ];

  const shown = limit ? filtered.slice(0, limit) : items;

  const clickFor = (activity: Activity) => {
    const explorerUrl = getExplorerUrl(activity);
    const cctpId = cctpTransferIdOf(activity);
    const mgiId = activity.id.startsWith('mgi:') ? activity.id.slice(4) : null;
    if (cctpId) return () => setDetailId(cctpId);
    if (mgiId) return () => setMgiDetailId(mgiId);
    if (explorerUrl) return () => window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    return undefined;
  };

  return (
    <AppBlock
      flush
      open
      title={title === null ? undefined : (title ?? t('Activity'))}
      action={
        limit ? (
          <SeeAll href={paths.activity} />
        ) : (
          <SegmentedControl value={tab} onChange={handleTabChange} options={TABS} />
        )
      }
    >
      {isLoading ? (
        <RowsSkeleton rows={limit ?? 5} />
      ) : shown.length === 0 ? (
        <Typography sx={{ py: 6, fontSize: 14, textAlign: 'center', color: MUTED }}>
          {t('No activity yet')}
        </Typography>
      ) : (
        <RowList>
          {groupByDay(shown).map((group) => (
            <Box key={group.key}>
              <Typography
                className="nf-label"
                sx={{
                  px: BOX_PX,
                  pt: 1.75,
                  pb: 0.25,
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: MUTED,
                }}
              >
                {group.label}
              </Typography>
              <RowList>
                {group.items.map((activity) => {
                  const row = describe(activity);
                  const walletTag = (activity as Activity & { walletTag?: string }).walletTag;
                  const subtitle = [row.subtitle, walletTag].filter(Boolean).join(' · ');
                  return (
                    <ListRow
                      key={activity.id}
                      onClick={clickFor(activity)}
                      icon={<RowIcon>{row.icon}</RowIcon>}
                      title={row.title}
                      badge={
                        row.status && (
                          <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge>
                        )
                      }
                      subtitle={subtitle || undefined}
                      value={row.value}
                      detail={row.detail ?? timeOf(Number(activity.timestamp) || 0)}
                    />
                  );
                })}
              </RowList>
            </Box>
          ))}
        </RowList>
      )}

      {!limit && totalPages > 1 && <Pager page={page} totalPages={totalPages} onPage={setPage} />}

      <SwapDetailModal transferId={detailId} onClose={() => setDetailId(null)} />

      <MoneyGramDetailModal
        open={!!mgiDetailId}
        txId={mgiDetailId}
        onClose={() => setMgiDetailId(null)}
      />
    </AppBlock>
  );
}
