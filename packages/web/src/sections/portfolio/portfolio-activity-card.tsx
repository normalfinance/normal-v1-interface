'use client';

import type { Activity } from '@/types/activity';
import type { ChainId } from '@/lib/chains/registry';

import { useTranslate } from '@/locales';
import { CHAINS } from '@/lib/chains/registry';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import { connectedWalletLabel } from '@/lib/portfolio/display';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useUserActivity } from '@/hooks/stellar/use-user-activity';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import MoneyGramDetailModal from '@/components/_common/moneygram-detail-modal';
import { SwapDetailModal, cctpTransferIdOf } from '@/components/_common/swap-detail-modal';

import { MONO, CARD_SX, PAGE_SIZE, TAG_STYLES } from './_shared';

import type { ActivityTab } from './_shared';

const ACTIVITY_COLS = '130px minmax(0,1.4fr) 1fr 1fr 1fr minmax(0,1.2fr)';

const COL_HEADER_SX = {
  fontSize: '10.5px',
  fontWeight: 500,
  color: 'rgba(10,10,15,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.16em',
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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

type TagKey = keyof typeof TAG_STYLES;

function activityTagKey(a: Activity): TagKey {
  switch (a.type) {
    case 'Savings Deposit':
      return 'deposit';
    case 'Savings Withdraw':
      return 'withdraw';
    case 'Swap':
      return 'swap';
    case 'Sent':
      return a.offramp ? 'sell' : 'send';
    case 'Receive':
      return 'receive';
    case 'Buy':
      return 'buy';
    case 'Sell':
      return 'sell';
    case 'Mint':
      return 'mint';
    case 'Redeem':
      return 'redeem';
    case 'Add Liquidity':
      return 'add_liq';
    case 'Remove Liquidity':
      return 'remove_liq';
    default:
      return 'withdraw';
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

interface RowData {
  asset: string;
  amount: string;
  value: string;
  txHash: string | null;
}

function activityToRow(a: Activity): RowData {
  switch (a.type) {
    case 'Swap': {
      // Only USDC legs are ~$1; other tokens' amounts aren't dollars, so show
      // the received amount in its own token rather than mis-labeling it USD.
      const value =
        a.tokenOut.symbol === 'USDC'
          ? fCurrency(a.tokenOut.amount)
          : a.tokenIn.symbol === 'USDC'
            ? fCurrency(a.tokenIn.amount)
            : `${a.tokenOut.amount.toFixed(7)} ${a.tokenOut.symbol}`;
      // A PENDING swap whose delivered amount is still unknown must not show
      // a confident $0 (Niko live test 2026-08-19: in-flight BTC→USDC row).
      if (a.pending && a.tokenOut.symbol === 'USDC' && !(a.tokenOut.amount > 0)) {
        return {
          asset: `${a.tokenIn.symbol} → ${a.tokenOut.symbol}`,
          amount: a.tokenIn.amount.toFixed(7),
          value: '—',
          txHash: a.txHash,
        };
      }
      return {
        asset: `${a.tokenIn.symbol} → ${a.tokenOut.symbol}`,
        amount: a.tokenIn.amount.toFixed(7),
        value,
        txHash: a.txHash,
      };
    }
    case 'Savings Deposit':
    case 'Savings Withdraw': {
      const n = parseFloat(a.amount);
      return { asset: 'USDC', amount: n.toFixed(7), value: fCurrency(n), txHash: a.txHash };
    }
    case 'Sent':
    case 'Receive': {
      const isUsdc = a.token.symbol === 'USDC';
      return {
        asset: a.token.symbol,
        amount: a.token.amount.toFixed(7),
        value: isUsdc
          ? fCurrency(a.token.amount)
          : `${a.token.amount.toFixed(7)} ${a.token.symbol}`,
        txHash: a.txHash,
      };
    }
    case 'Buy':
    case 'Sell':
      return {
        asset: a.symbol,
        amount: a.amount.toFixed(7),
        value: fCurrency(a.amount),
        txHash: null,
      };
    case 'Mint':
    case 'Redeem':
    case 'Add Liquidity':
    case 'Remove Liquidity':
      return { asset: a.symbol, amount: a.amount.toFixed(7), value: '—', txHash: null };
    default:
      return { asset: '—', amount: '—', value: '—', txHash: null };
  }
}

// -------------------------------------------------------------------
// PaginationBar
// -------------------------------------------------------------------
function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onPage: (p: number) => void;
}) {
  const range: number[] = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(totalPages, page + delta);
  for (let i = left; i <= right; i++) range.push(i);

  const btnBase = {
    height: 32,
    minWidth: 32,
    px: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    fontSize: '13px',
    ...MONO,
    fontWeight: 400,
    cursor: 'pointer',
    border: '1px solid transparent',
    bgcolor: 'transparent',
    transition: 'all 0.15s',
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        px: '20px',
        py: '14px',
        borderTop: '1px solid rgba(10,10,15,0.06)',
      }}
    >
      <Box
        component="button"
        onClick={onPrev}
        disabled={page === 1}
        sx={{
          ...btnBase,
          color: page === 1 ? 'rgba(10,10,15,0.25)' : 'rgba(10,10,15,0.6)',
          cursor: page === 1 ? 'default' : 'pointer',
          '&:hover': page === 1 ? {} : { bgcolor: '#F4F4F7' },
        }}
      >
        ←
      </Box>

      {left > 1 && (
        <>
          <Box
            component="button"
            onClick={() => onPage(1)}
            sx={{ ...btnBase, color: 'rgba(10,10,15,0.6)', '&:hover': { bgcolor: '#F4F4F7' } }}
          >
            1
          </Box>
          {left > 2 && (
            <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.3)', px: '4px' }}>…</Box>
          )}
        </>
      )}

      {range.map((p) => (
        <Box
          key={p}
          component="button"
          onClick={() => onPage(p)}
          sx={{
            ...btnBase,
            color: p === page ? '#FFFFFF' : 'rgba(10,10,15,0.6)',
            bgcolor: p === page ? '#0A0A0F' : 'transparent',
            borderColor: p === page ? '#0A0A0F' : 'transparent',
            '&:hover': p === page ? {} : { bgcolor: '#F4F4F7' },
          }}
        >
          {p}
        </Box>
      ))}

      {right < totalPages && (
        <>
          {right < totalPages - 1 && (
            <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.3)', px: '4px' }}>…</Box>
          )}
          <Box
            component="button"
            onClick={() => onPage(totalPages)}
            sx={{ ...btnBase, color: 'rgba(10,10,15,0.6)', '&:hover': { bgcolor: '#F4F4F7' } }}
          >
            {totalPages}
          </Box>
        </>
      )}

      <Box
        component="button"
        onClick={onNext}
        disabled={page === totalPages}
        sx={{
          ...btnBase,
          color: page === totalPages ? 'rgba(10,10,15,0.25)' : 'rgba(10,10,15,0.6)',
          cursor: page === totalPages ? 'default' : 'pointer',
          '&:hover': page === totalPages ? {} : { bgcolor: '#F4F4F7' },
        }}
      >
        →
      </Box>
    </Box>
  );
}

// -------------------------------------------------------------------
// TypeTag
// -------------------------------------------------------------------
function TypeTag({ tagKey }: { tagKey: TagKey }) {
  const s = TAG_STYLES[tagKey];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: '10px',
        py: '4px',
        borderRadius: '999px',
        bgcolor: s.bg,
        color: s.color,
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        justifySelf: 'start',
        alignSelf: 'center',
      }}
    >
      {s.label}
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
}

export function ActivityCard({
  walletAddress,
  bitcoinAddress,
  ethereumAddress,
  solanaAddress,
  assetSymbol,
  defaultTab = 'all',
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
      const funded = (a as Activity & { fundedFrom?: string }).fundedFrom;
      if (!funded) return fallback;
      return funded === 'external'
        ? connectedWalletLabel(persistWallet.walletType)
        : 'Normal wallet';
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

  return (
    <Box sx={{ ...CARD_SX, p: 0, minWidth: 0 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          p: '20px 20px 16px',
        }}
      >
        <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F' }}>{t('Activity')}</Box>

        <Box
          sx={{
            display: 'inline-flex',
            bgcolor: 'rgba(10,10,15,0.04)',
            borderRadius: '999px',
            p: '4px',
            gap: '2px',
          }}
        >
          {TABS.map((tabItem) => (
            <Box
              key={tabItem.value}
              component="button"
              onClick={() => handleTabChange(tabItem.value)}
              sx={{
                px: '14px',
                py: '6px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 150ms, color 150ms',
                bgcolor: tab === tabItem.value ? '#fff' : 'transparent',
                color: tab === tabItem.value ? '#0A0A0F' : 'rgba(10,10,15,0.45)',
                boxShadow: tab === tabItem.value ? '0 1px 2px rgba(10,10,15,0.08)' : 'none',
              }}
            >
              {tabItem.label}
            </Box>
          ))}
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ p: '0 12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rectangular" height={48} sx={{ borderRadius: '10px' }} />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <Box
          sx={{ color: 'rgba(10,10,15,0.4)', fontSize: '14px', py: '48px', textAlign: 'center' }}
        >
          {t('No activity yet')}
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 680 }}>
            {/* Column headers */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: ACTIVITY_COLS,
                gap: '16px',
                px: '14px',
                py: '10px',
                borderTop: '1px solid rgba(10,10,15,0.04)',
                borderBottom: '1px solid rgba(10,10,15,0.04)',
              }}
            >
              {[t('Type'), t('Asset'), t('Amount'), t('Value'), t('Date'), t('Tx')].map((h, i) => (
                <Box key={h} sx={{ ...COL_HEADER_SX, textAlign: i === 5 ? 'right' : 'left' }}>
                  {h}
                </Box>
              ))}
            </Box>

            {/* Rows */}
            <Box sx={{ p: '6px 6px' }}>
              {items.map((activity) => {
                const tagKey = activityTagKey(activity);
                const row = activityToRow(activity);
                const expertUrl = getExplorerUrl(activity);
                const cctpId = cctpTransferIdOf(activity);
                const mgiId = activity.id.startsWith('mgi:') ? activity.id.slice(4) : null;
                const handleRowClick = cctpId
                  ? () => setDetailId(cctpId)
                  : mgiId
                    ? () => setMgiDetailId(mgiId)
                    : expertUrl
                      ? () => window.open(expertUrl, '_blank', 'noopener,noreferrer')
                      : undefined;
                return (
                  <Box
                    key={activity.id}
                    onClick={handleRowClick}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: ACTIVITY_COLS,
                      alignItems: 'center',
                      gap: '16px',
                      px: '8px',
                      py: '12px',
                      borderRadius: '10px',
                      cursor: handleRowClick ? 'pointer' : 'default',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.025)' },
                    }}
                  >
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}
                    >
                      <TypeTag tagKey={tagKey} />
                      {(activity as Activity & { walletTag?: string }).walletTag && (
                        <Box
                          component="span"
                          sx={{ fontSize: '10.5px', color: 'rgba(10,10,15,0.4)' }}
                        >
                          {(activity as Activity & { walletTag?: string }).walletTag}
                        </Box>
                      )}
                      {(((activity.type === 'Sent' || activity.type === 'Receive') &&
                        activity.confirmed === false) ||
                        (activity.type === 'Swap' && activity.pending) ||
                        ((activity.type === 'Buy' || activity.type === 'Sell') &&
                          activity.pending) ||
                        (activity.type === 'Sent' &&
                          activity.offramp &&
                          activity.offrampStatus === 'pending')) && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: '8px',
                            py: '3px',
                            borderRadius: '999px',
                            bgcolor: 'rgba(245,158,11,0.1)',
                            color: '#B45309',
                            fontSize: '10px',
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Pending
                        </Box>
                      )}
                      {((activity.type === 'Swap' && activity.failed) ||
                        ((activity.type === 'Buy' || activity.type === 'Sell') &&
                          activity.failed) ||
                        (activity.type === 'Sent' &&
                          activity.offramp &&
                          activity.offrampStatus === 'failed')) && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: '8px',
                            py: '3px',
                            borderRadius: '999px',
                            bgcolor: 'rgba(220,38,38,0.1)',
                            color: '#B91C1C',
                            fontSize: '10px',
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Failed
                        </Box>
                      )}
                      {activity.type === 'Swap' && activity.refunded && (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-block',
                            px: '8px',
                            py: '3px',
                            borderRadius: '999px',
                            bgcolor: 'rgba(245,158,11,0.1)',
                            color: '#B45309',
                            fontSize: '10px',
                            fontWeight: 500,
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Refunded
                        </Box>
                      )}
                    </Box>

                    <Box
                      sx={{
                        fontSize: '13.5px',
                        fontWeight: 400,
                        color: '#0A0A0F',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.asset}
                    </Box>

                    <Box sx={{ ...MONO, fontSize: '13.5px', fontWeight: 400, color: '#0A0A0F' }}>
                      {row.amount}
                    </Box>

                    <Box sx={{ ...MONO, fontSize: '13.5px', fontWeight: 400, color: '#0A0A0F' }}>
                      {row.value}
                    </Box>

                    <Box sx={{ fontSize: '12px', fontWeight: 400, color: 'rgba(10,10,15,0.5)' }}>
                      {formatRelative(activity.timestamp)}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      {cctpId ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 400,
                            color: 'rgba(10,10,15,0.35)',
                            ...MONO,
                          }}
                        >
                          {t('Details')}
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M4.5 2.5L8 6L4.5 9.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Box>
                      ) : expertUrl ? (
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 400,
                            color: 'rgba(10,10,15,0.35)',
                            ...MONO,
                          }}
                        >
                          View
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Box>
                      ) : mgiId ? (
                        <Box
                          sx={{
                            fontSize: '12px',
                            fontWeight: 400,
                            color: 'rgba(10,10,15,0.35)',
                            ...MONO,
                          }}
                        >
                          Details
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            fontSize: '12px',
                            fontWeight: 400,
                            color: 'rgba(10,10,15,0.2)',
                            ...MONO,
                          }}
                        >
                          —
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {totalPages > 1 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onPage={setPage}
        />
      )}

      <SwapDetailModal transferId={detailId} onClose={() => setDetailId(null)} />

      <MoneyGramDetailModal
        open={!!mgiDetailId}
        txId={mgiDetailId}
        onClose={() => setMgiDetailId(null)}
      />
    </Box>
  );
}
