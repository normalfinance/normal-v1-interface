'use client';

import type { AssetActionKey } from '@/hooks/use-asset-actions';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useRouter } from 'next/navigation';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fCurrency, fTokenAmount } from '@/utils/format-number';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Skeleton from '@mui/material/Skeleton';

import { Iconify } from '@/components/template/iconify';
import { NetworkBadge, getAssetNetwork } from '@/components/_common/network-badge';

import { MONO, CARD_SX, getHoldingColor } from './_shared';

import type { HoldingData } from './_shared';

// ----------------------------------------------------------------------
const HOLDINGS_COLS = 'minmax(0,1.8fr) 1fr 1fr 1fr 1fr';

const COL_HEADER_SX = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(10,10,15,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
};

// Same Buy / Sell / Send / Receive flows as the home hero card, via the shared
// useAssetActions hook (asset picker → on/off-ramp / receive, lazy chain setup).
const ACTIONS: { key: AssetActionKey; label: string; icon: string }[] = [
  { key: 'buy', label: 'Buy', icon: 'ic:round-add' },
  { key: 'sell', label: 'Sell', icon: 'ic:round-remove' },
  { key: 'send', label: 'Send', icon: 'ic:round-arrow-upward' },
  { key: 'receive', label: 'Receive', icon: 'ic:round-arrow-downward' },
];

// ----------------------------------------------------------------------
interface HoldingsCardProps {
  holdingsData: HoldingData[];
  /** #75: hybrid accounts get one TAB per wallet (Niko's preference —
   *  same pattern as the drawer). Absent = single flat table. */
  sections?: { label: string; data: HoldingData[] }[];
  totalBalance: number;
  /** Show skeleton rows while balances load with nothing cached yet. */
  loading?: boolean;
}

function HoldingsSkeleton() {
  return (
    <Stack spacing="13px" sx={{ px: '8px', pt: '6px' }}>
      {[0, 1, 2].map((i) => (
        <Stack key={i} direction="row" alignItems="center" spacing="11px">
          <Skeleton variant="circular" width={34} height={34} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="35%" height={16} />
            <Skeleton variant="text" width="22%" height={12} />
          </Box>
          <Skeleton variant="text" width={64} height={16} />
        </Stack>
      ))}
    </Stack>
  );
}

export function HoldingsCard({ holdingsData, sections, totalBalance, loading }: HoldingsCardProps) {
  const { t } = useTranslate();
  const router = useRouter();
  const { startAction } = useAssetActionsContext();
  const [walletTab, setWalletTab] = useState(0);
  // The active tab's rows; flat list when there are no sections.
  const tabbed = !!sections && sections.length > 0;
  const rows = tabbed
    ? (sections[Math.min(walletTab, sections.length - 1)]?.data ?? [])
    : holdingsData;

  return (
    <Box sx={{ ...CARD_SX, minWidth: 0 }}>
      {/* Header */}
      <Box sx={{ mb: '20px' }}>
        <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', mb: '14px' }}>
          {t('Holdings')}
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {ACTIONS.map((btn) => (
            <Box
              key={btn.key}
              component="button"
              onClick={() => startAction(btn.key)}
              sx={{
                appearance: 'none',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: '12px',
                padding: '10px 6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '7px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#6B6B76',
                background: 'transparent',
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
                  width: 28,
                  height: 28,
                  borderRadius: '8px',
                  bgcolor: '#F4F4F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0A0A0F',
                  transition: 'all .15s ease',
                }}
              >
                <Iconify icon={btn.icon} width={18} sx={{ color: 'inherit' }} />
              </Box>
              {btn.label}
            </Box>
          ))}
        </Box>
      </Box>

      {/* #75: wallet tabs — same pills as the drawer sections. */}
      {tabbed && (
        <Box sx={{ display: 'flex', gap: '6px', mb: '12px', flexWrap: 'wrap' }}>
          {sections!.map((s, idx) => {
            const selected = Math.min(walletTab, sections!.length - 1) === idx;
            return (
              <Box
                key={s.label}
                component="button"
                onClick={() => setWalletTab(idx)}
                sx={{
                  appearance: 'none',
                  border: selected
                    ? '1px solid rgba(10,10,15,0.9)'
                    : '1px solid rgba(10,10,15,0.1)',
                  borderRadius: '999px',
                  px: '12px',
                  py: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  bgcolor: selected ? '#0A0A0F' : 'transparent',
                  color: selected ? '#fff' : '#6B6B76',
                  transition: 'all .15s ease',
                  '&:hover': selected ? {} : { borderColor: 'rgba(10,10,15,0.25)' },
                }}
              >
                {t(s.label)}
              </Box>
            );
          })}
        </Box>
      )}

      {rows.length === 0 ? (
        loading ? (
          <HoldingsSkeleton />
        ) : (
          <Box sx={{ color: 'rgba(10,10,15,0.4)', fontSize: '14px', py: '24px' }}>
            {t('No holdings yet')}
          </Box>
        )
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 520 }}>
            {/* Column headers */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: HOLDINGS_COLS,
                px: '8px',
                pb: '10px',
                mb: '2px',
                borderBottom: '1px solid rgba(10,10,15,0.06)',
                gap: '12px',
              }}
            >
              <Box sx={COL_HEADER_SX}>{t('Asset')}</Box>
              <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Balance')}</Box>
              <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Price')}</Box>
              <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Value')}</Box>
              <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Allocation')}</Box>
            </Box>

            {/* Rows */}
            {rows.map((h, i) => {
              const pct =
                totalBalance > 0
                  ? BigNumber(h.value).dividedBy(totalBalance).multipliedBy(100).toFixed(1)
                  : '0.0';
              const balanceDisplay = fTokenAmount(h.token.balance);
              const color = getHoldingColor(h.token, i);

              const isSavings = h.token.contract === '__savings__';
              const handleRowClick = isSavings
                ? () => router.push(paths.savings)
                : () => router.push(paths.assets.details(h.token.symbol));

              return (
                <Box
                  key={h.token.contract}
                  onClick={handleRowClick}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: HOLDINGS_COLS,
                    alignItems: 'center',
                    gap: '12px',
                    px: '8px',
                    py: '13px',
                    borderBottom: '1px solid rgba(10,10,15,0.05)',
                    cursor: 'pointer',
                    '&:last-child': { borderBottom: 'none' },
                    '&:hover': { bgcolor: 'rgba(10,10,15,0.02)', borderRadius: '10px' },
                  }}
                >
                  {/* Asset */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                    <Avatar
                      src={h.token.icon || getCryptoIconUrl(h.token.symbol)}
                      alt={h.token.symbol}
                      sx={{ width: 34, height: 34, flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Box
                          sx={{
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#0A0A0F',
                            lineHeight: 1.3,
                          }}
                        >
                          {h.token.symbol}
                        </Box>
                        {!isSavings && <NetworkBadge network={getAssetNetwork(h.token)} />}
                      </Box>
                      <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.3 }}>
                        {h.token.name}
                      </Box>
                    </Box>
                  </Box>

                  {/* Balance */}
                  <Box
                    sx={{
                      ...MONO,
                      fontSize: '13px',
                      fontWeight: 400,
                      color: '#0A0A0F',
                      textAlign: 'right',
                    }}
                  >
                    {balanceDisplay}
                  </Box>

                  {/* Price */}
                  <Box
                    sx={{
                      ...MONO,
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(10,10,15,0.6)',
                      textAlign: 'right',
                    }}
                  >
                    {fCurrency(h.token.price)}
                  </Box>

                  {/* Value */}
                  <Box
                    sx={{
                      ...MONO,
                      fontSize: '13px',
                      fontWeight: 400,
                      color: '#0A0A0F',
                      textAlign: 'right',
                    }}
                  >
                    {fCurrency(h.value)}
                  </Box>

                  {/* Allocation % + bar */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '5px',
                    }}
                  >
                    <Box
                      sx={{
                        ...MONO,
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'rgba(10,10,15,0.6)',
                      }}
                    >
                      {pct}%
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: '72px',
                        height: '3px',
                        bgcolor: 'rgba(10,10,15,0.07)',
                        borderRadius: '99px',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${pct}%`,
                          height: '100%',
                          bgcolor: color,
                          borderRadius: '99px',
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}
