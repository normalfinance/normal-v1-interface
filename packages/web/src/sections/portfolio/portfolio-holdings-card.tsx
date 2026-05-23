'use client';

import { useTranslate } from '@/locales';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

import { MONO, CARD_SX, DONUT_COLORS } from './_shared';
import type { HoldingData } from './_shared';

const HOLDINGS_COLS = 'minmax(0,1.8fr) 1fr 1fr 1fr 1fr';

const COL_HEADER_SX = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(10,10,15,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
};

interface HoldingsCardProps {
  holdingsData: HoldingData[];
  totalBalance: number;
}

export function HoldingsCard({ holdingsData, totalBalance }: HoldingsCardProps) {
  const { t } = useTranslate();

  return (
    <Box sx={{ ...CARD_SX, minWidth: 0 }}>
      <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', mb: '20px' }}>
        {t('Holdings')}
      </Box>

      {holdingsData.length === 0 ? (
        <Box sx={{ color: 'rgba(10,10,15,0.4)', fontSize: '14px', py: '24px' }}>
          {t('No holdings yet')}
        </Box>
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
          {holdingsData.map((h, i) => {
            const pct =
              totalBalance > 0
                ? BigNumber(h.value).dividedBy(totalBalance).multipliedBy(100).toFixed(1)
                : '0.0';
            const balanceDisplay = BigNumber(h.token.balance).toFixed(
              h.token.decimals > 4 ? 4 : h.token.decimals
            );
            const color = DONUT_COLORS[i % DONUT_COLORS.length];

            return (
              <Box
                key={h.token.contract}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: HOLDINGS_COLS,
                  alignItems: 'center',
                  gap: '12px',
                  px: '8px',
                  py: '13px',
                  borderBottom: '1px solid rgba(10,10,15,0.05)',
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
                    <Box
                      sx={{ fontSize: '14px', fontWeight: 400, color: '#0A0A0F', lineHeight: 1.3 }}
                    >
                      {h.token.symbol}
                    </Box>
                    <Box
                      sx={{
                        fontSize: '12px',
                        color: 'rgba(10,10,15,0.4)',
                        lineHeight: 1.3,
                      }}
                    >
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
                    sx={{ ...MONO, fontSize: '13px', fontWeight: 400, color: 'rgba(10,10,15,0.6)' }}
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
