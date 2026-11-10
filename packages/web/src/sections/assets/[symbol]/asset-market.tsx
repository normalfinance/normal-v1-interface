'use client';

import type { AssetMarket } from '@/lib/prices/markets';

import { useTranslate } from '@/locales';
import { INK, MUTED, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HAIRLINE } from '@/components/_common/brand';
import {
  BOX_PX,
  FIGURES,
  AppBlock,
  appLocale,
  StatStrip,
  formatPrice,
  formatCompact,
  formatCompactUsd,
} from '@/components/_common/app-ui';

// ----------------------------------------------------------------------

/** A thin line with a mark on it: where a value sits between two ends. */
function Track({ at, filled = false }: { at: number; filled?: boolean }) {
  const place = `${Math.min(100, Math.max(0, at * 100)).toFixed(2)}%`;
  return (
    <Box
      aria-hidden="true"
      sx={{ position: 'relative', height: 12, display: 'flex', alignItems: 'center' }}
    >
      <Box sx={{ width: '100%', height: 2, bgcolor: HAIRLINE_STRONG }} />
      {filled ? (
        <Box sx={{ position: 'absolute', left: 0, width: place, height: 2, bgcolor: INK }} />
      ) : (
        <Box
          sx={{ position: 'absolute', left: place, width: 2, height: 12, ml: '-1px', bgcolor: INK }}
        />
      )}
    </Box>
  );
}

/**
 * The coin in the wider market: how big it is, how much of it changed hands
 * today, how much of it exists, its record price, and today's low to high
 * with where it is now. A digital dollar skips the record: its price only
 * ever sits by $1.00.
 */
export function AssetMarketCard({
  symbol,
  market,
  loading,
}: {
  symbol: string;
  market: AssetMarket | undefined;
  loading: boolean;
}) {
  const { t } = useTranslate();
  if (!market && !loading) return null;

  const stable = symbol === 'USDC';
  const m = market;

  const supplyShare =
    m?.circulatingSupply && m.maxSupply ? m.circulatingSupply / m.maxSupply : null;

  const items = [
    {
      key: 'cap',
      label: t('Market cap'),
      value: m?.marketCap ? formatCompactUsd(m.marketCap) : '',
      note: m?.rank ? t('Ranked #{{rank}} of all coins', { rank: m.rank }) : undefined,
    },
    {
      key: 'volume',
      label: t('Traded today'),
      value: m?.volume24h ? formatCompactUsd(m.volume24h) : '',
      note: t('Across exchanges, last 24 hours'),
    },
    {
      key: 'supply',
      label: t('In circulation'),
      value: m?.circulatingSupply ? `${formatCompact(m.circulatingSupply)} ${symbol}` : '',
      note:
        m?.maxSupply && supplyShare !== null ? (
          <>
            {t('of {{max}} that will ever exist', { max: formatCompact(m.maxSupply) })}
            <Box sx={{ mt: 1 }}>
              <Track at={supplyShare} filled />
            </Box>
          </>
        ) : (
          t('No fixed limit')
        ),
    },
    ...(!stable
      ? [
          {
            key: 'ath',
            label: t('All-time high'),
            value: m?.ath ? formatPrice(m.ath) : '',
            note:
              m?.athChangePct != null && m.athDate
                ? m.athChangePct > -0.5
                  ? t('At its high now')
                  : `${t('{{pct}}% below it', { pct: Math.abs(m.athChangePct).toFixed(1) })}, ${new Date(
                      m.athDate
                    ).toLocaleDateString(appLocale(), {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                : undefined,
          },
        ]
      : []),
  ];

  // Today's low to high, both ends printed alike.
  const low = m?.low24h ?? null;
  const high = m?.high24h ?? null;
  const digits = m && m.price < 10 ? 4 : 2;
  const showRange = m && low !== null && high !== null && high > low;

  return (
    <AppBlock
      flush
      title={t('Market')}
      action={
        <Typography sx={{ fontSize: 12.5, color: MUTED }}>{t('Data from CoinGecko')}</Typography>
      }
    >
      <StatStrip items={items} loading={!m} />

      {showRange && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'auto minmax(0, 1fr) auto',
              md: '160px auto minmax(0, 1fr) auto',
            },
            alignItems: 'center',
            columnGap: 2,
            rowGap: 1,
            px: BOX_PX,
            py: 2,
            borderTop: HAIRLINE,
          }}
        >
          <Typography
            sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, fontSize: 13.5, color: MUTED }}
          >
            {t("Today's range")}
          </Typography>
          <Typography sx={{ ...FIGURES, fontSize: 14, fontWeight: 500, color: INK }}>
            {formatPrice(low, digits)}
          </Typography>
          <Track at={(m.price - low) / (high - low)} />
          <Typography sx={{ ...FIGURES, fontSize: 14, fontWeight: 500, color: INK }}>
            {formatPrice(high, digits)}
          </Typography>
        </Box>
      )}
    </AppBlock>
  );
}
