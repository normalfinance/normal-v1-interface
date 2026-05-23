'use client';

import type { Activity } from '@/types/activity';

import { useState, useEffect, useMemo } from 'react';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useUserActivity } from '@/hooks/stellar/use-user-activity';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import { MONO, CARD_SX, TAG_STYLES, PAGE_SIZE } from './_shared';
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

function truncateTx(hash: string): string {
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
}

function getStellarExpertUrl(a: Activity): string | null {
  switch (a.type) {
    case 'Savings Deposit':
    case 'Savings Withdraw':
      return a.txHash ? `https://stellar.expert/explorer/public/tx/${a.txHash}` : null;
    case 'Sent':
    case 'Receive':
      if (a.id.startsWith('horizon:')) {
        return `https://stellar.expert/explorer/public/op/${a.id.slice(8)}`;
      }
      return null;
    default:
      return null;
  }
}

type TagKey = keyof typeof TAG_STYLES;

function activityTagKey(a: Activity): TagKey {
  switch (a.type) {
    case 'Savings Deposit': return 'deposit';
    case 'Savings Withdraw': return 'withdraw';
    case 'Swap': return 'swap';
    case 'Sent': return 'send';
    case 'Receive': return 'receive';
    case 'Buy': return 'buy';
    case 'Sell': return 'sell';
    case 'Mint': return 'mint';
    case 'Redeem': return 'redeem';
    case 'Add Liquidity': return 'add_liq';
    case 'Remove Liquidity': return 'remove_liq';
    default: return 'withdraw';
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
    case 'Swap':
      return {
        asset: `${a.tokenIn.symbol} → ${a.tokenOut.symbol}`,
        amount: a.tokenIn.amount.toFixed(7),
        value: fCurrency(a.tokenOut.amount),
        txHash: null,
      };
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
        value: isUsdc ? fCurrency(a.token.amount) : `${a.token.amount.toFixed(7)} ${a.token.symbol}`,
        txHash: null,
      };
    }
    case 'Buy':
    case 'Sell':
      return { asset: a.symbol, amount: a.amount.toFixed(7), value: fCurrency(a.amount), txHash: null };
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
}

export function ActivityCard({ walletAddress }: ActivityCardProps) {
  const { t } = useTranslate();
  const [tab, setTab] = useState<ActivityTab>('all');
  const [page, setPage] = useState(1);

  const { recentActivity, isLoading, mutate } = useUserActivity(walletAddress);

  // Re-fetch wallet activity after a deposit or withdrawal completes.
  useEffect(() => {
    const handler = () => setTimeout(mutate, 1500);
    window.addEventListener('nf:savings-position-updated', handler);
    return () => window.removeEventListener('nf:savings-position-updated', handler);
  }, [mutate]);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'swaps':
        return recentActivity.filter((a) => a.type === 'Swap');
      case 'savings':
        return recentActivity.filter(
          (a) => a.type === 'Savings Deposit' || a.type === 'Savings Withdraw'
        );
      case 'transfers':
        return recentActivity.filter(
          (a) => a.type === 'Sent' || a.type === 'Receive' || a.type === 'Buy' || a.type === 'Sell'
        );
      default:
        return recentActivity;
    }
  }, [recentActivity, tab]);

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
            {[t('Type'), t('Asset'), t('Amount'), t('Value'), t('Date'), t('TX')].map((h) => (
              <Box key={h} sx={COL_HEADER_SX}>
                {h}
              </Box>
            ))}
          </Box>

          {/* Rows */}
          <Box sx={{ p: '6px 6px' }}>
            {items.map((activity) => {
              const tagKey = activityTagKey(activity);
              const row = activityToRow(activity);
              const expertUrl = getStellarExpertUrl(activity);
              return (
                <Box
                  key={activity.id}
                  onClick={expertUrl ? () => window.open(expertUrl, '_blank', 'noopener,noreferrer') : undefined}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: ACTIVITY_COLS,
                    alignItems: 'center',
                    gap: '16px',
                    px: '8px',
                    py: '12px',
                    borderRadius: '10px',
                    cursor: expertUrl ? 'pointer' : 'default',
                    '&:hover': { bgcolor: 'rgba(10,10,15,0.025)' },
                  }}
                >
                  <TypeTag tagKey={tagKey} />

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

                  {row.txHash ? (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: '#1AB37D',
                          flexShrink: 0,
                          boxShadow: '0 0 0 3px rgba(26,179,125,0.15)',
                        }}
                      />
                      <Box
                        sx={{
                          ...MONO,
                          fontSize: '12px',
                          fontWeight: 400,
                          color: 'rgba(10,10,15,0.5)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {truncateTx(row.txHash)}
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.25)' }}>—</Box>
                  )}
                </Box>
              );
            })}
          </Box>
          </Box>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: '20px',
            py: '14px',
            borderTop: '1px solid rgba(10,10,15,0.05)',
          }}
        >
          <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
            Page {page} of {totalPages}
          </Box>

          <Box sx={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <Box
              component="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: '12px',
                py: '6px',
                borderRadius: '8px',
                border: '1px solid rgba(10,10,15,0.1)',
                bgcolor: 'transparent',
                fontSize: '13px',
                fontWeight: 500,
                color: page === 1 ? 'rgba(10,10,15,0.25)' : '#0A0A0F',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                transition: 'background 150ms, border-color 150ms',
                '&:hover:not(:disabled)': {
                  bgcolor: 'rgba(10,10,15,0.04)',
                  borderColor: 'rgba(10,10,15,0.18)',
                },
              }}
            >
              ← Prev
            </Box>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <Box
                    key={`ellipsis-${idx}`}
                    sx={{ px: '6px', fontSize: '13px', color: 'rgba(10,10,15,0.3)' }}
                  >
                    …
                  </Box>
                ) : (
                  <Box
                    key={p}
                    component="button"
                    onClick={() => setPage(p as number)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      border:
                        page === p ? '1px solid rgba(10,10,15,0.15)' : '1px solid transparent',
                      bgcolor: page === p ? '#0A0A0F' : 'transparent',
                      color: page === p ? '#fff' : 'rgba(10,10,15,0.6)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background 150ms',
                      '&:hover': { bgcolor: page === p ? '#0A0A0F' : 'rgba(10,10,15,0.04)' },
                    }}
                  >
                    {p}
                  </Box>
                )
              )}

            <Box
              component="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: '12px',
                py: '6px',
                borderRadius: '8px',
                border: '1px solid rgba(10,10,15,0.1)',
                bgcolor: 'transparent',
                fontSize: '13px',
                fontWeight: 500,
                color: page === totalPages ? 'rgba(10,10,15,0.25)' : '#0A0A0F',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                transition: 'background 150ms, border-color 150ms',
                '&:hover:not(:disabled)': {
                  bgcolor: 'rgba(10,10,15,0.04)',
                  borderColor: 'rgba(10,10,15,0.18)',
                },
              }}
            >
              Next →
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
