'use client';

import type { IndexMeta } from '@/lib/index/indexes';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useMarkets } from '@/hooks/use-markets';
import { RouterLink } from '@/routes/components';
import { minSpanFor } from '@/lib/prices/markets';
import { basketChange, basketSeries } from '@/lib/index/indexes';
import { assetColor, assetDisplay } from '@/lib/portfolio/display';
import { weightLabel, wireToUsdNumber, minimumPurchaseWire } from '@/lib/index/basket';
import { INK, MUTED, PAPER, INK_SOFT, HAIRLINE_COLOR, HAIRLINE_STRONG } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import EastRounded from '@mui/icons-material/EastRounded';
import DonutSmallOutlined from '@mui/icons-material/DonutSmallOutlined';

import {
  BOX_PX,
  Change,
  FIGURES,
  Sparkline,
  assetName,
  formatUsd,
} from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// An index as a card to pick (Niko 2026-11-09: many indexes will follow, so
// each one is a block people choose). It stands out by what it holds, not by
// decoration: the coins' own logos, the basket's day as a line, and its
// weights as one bar in each coin's colour (the colour a coin is known by,
// as on its price line). The whole card is the link: its border turns ink and
// its arrow fills on hover or keyboard focus.
// ---------------------------------------------------------------------------

const COIN = 36;

export function IndexCard({ meta }: { meta: IndexMeta }) {
  const { t } = useTranslate();
  const { markets } = useMarkets();
  const series = basketSeries(meta.def, (s) => markets[s]?.sparkline24h);
  const today = basketChange(meta.def, (s) => markets[s]?.change24h);
  const label = { fontSize: 12.5, color: MUTED } as const;

  return (
    <ButtonBase
      component={RouterLink}
      href={paths.indexes.details(meta.slug)}
      aria-label={t('{{name}} index: see what it holds and buy', { name: meta.name })}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 2.5,
        width: '100%',
        height: '100%',
        textAlign: 'left',
        p: BOX_PX,
        bgcolor: PAPER,
        border: `1px solid ${HAIRLINE_STRONG}`,
        transition: 'border-color 150ms',
        '& .nf-index-go': { transition: 'background-color 150ms, color 150ms' },
        '&:hover, &.Mui-focusVisible': {
          borderColor: INK,
          '& .nf-index-go': { bgcolor: INK_SOFT },
        },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
      }}
    >
      {/* The coins it holds, each on its own white coin, and how the basket did today */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {meta.def.legs.map((leg, i) => (
            <Box
              key={leg.symbol}
              sx={{
                width: COIN,
                height: COIN,
                ml: i ? '-10px' : 0,
                borderRadius: '50%',
                bgcolor: PAPER,
                // A paper border makes the gap between overlapping coins, no shadow;
                // the hairline sits just inside it.
                border: `2px solid ${PAPER}`,
                outline: `1px solid ${HAIRLINE_COLOR}`,
                outlineOffset: '-3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: meta.def.legs.length - i,
              }}
            >
              <Box
                component="img"
                src={assetDisplay(leg.symbol).icon}
                alt=""
                sx={{ width: COIN - 12, height: COIN - 12, display: 'block' }}
              />
            </Box>
          ))}
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={label}>{t('Today')}</Typography>
          <Typography component="div" sx={{ ...FIGURES, fontSize: 15, fontWeight: 500 }}>
            {today === null ? '' : <Change pct={today} />}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography
          component="h2"
          sx={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: INK }}
        >
          {meta.name}
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 14, lineHeight: 1.5, color: MUTED }}>
          {t(meta.tagline)}
        </Typography>
      </Box>

      {/* The basket's day, held at its weights */}
      <Sparkline
        points={series}
        color={INK}
        height={56}
        minSpan={minSpanFor('BTC')}
        label={t('{{name}} over the last 24 hours', { name: meta.name })}
      />

      {/* Its weights: one bar, each coin in its own colour, then the words */}
      <Box>
        <Box sx={{ display: 'flex', gap: '2px', height: 6 }} aria-hidden="true">
          {meta.def.legs.map((leg) => (
            <Box
              key={leg.symbol}
              sx={{ flexGrow: leg.weightBps, bgcolor: assetColor(leg.symbol) }}
            />
          ))}
        </Box>
        <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
          {meta.def.legs.map((leg) => (
            <Typography key={leg.symbol} sx={{ fontSize: 13, color: MUTED }}>
              <Box component="span" sx={{ color: INK, fontWeight: 500 }}>
                {assetName(leg.symbol)}
              </Box>{' '}
              <Box component="span" sx={FIGURES}>
                {weightLabel(leg.weightBps)}
              </Box>
            </Typography>
          ))}
        </Box>
      </Box>

      {/* What it takes, and the way in */}
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          borderTop: `1px solid ${HAIRLINE_COLOR}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontSize: 13, color: MUTED }}>
          {t('From {{min}}, one signature', {
            min: formatUsd(wireToUsdNumber(minimumPurchaseWire(meta.def))),
          })}
        </Typography>
        <Box
          className="nf-index-go"
          aria-hidden="true"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            height: 40,
            px: 1.75,
            fontSize: 14,
            fontWeight: 500,
            color: PAPER,
            bgcolor: INK,
            '& svg': { fontSize: 18 },
          }}
        >
          {t('View and buy')}
          <EastRounded />
        </Box>
      </Box>
    </ButtonBase>
  );
}

/** The place the next indexes will take: quiet, not a link. */
export function IndexComingCard() {
  const { t } = useTranslate();
  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 200,
        p: BOX_PX,
        border: `1px dashed ${HAIRLINE_STRONG}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 1,
      }}
    >
      <Box sx={{ color: MUTED, '& svg': { fontSize: 22 } }}>
        <DonutSmallOutlined />
      </Box>
      <Typography sx={{ fontSize: 15, fontWeight: 500, color: INK }}>
        {t('More indexes are coming')}
      </Typography>
      <Typography sx={{ fontSize: 13.5, lineHeight: 1.5, color: MUTED }}>
        {t('Each one a set of coins chosen and weighted for you, bought in one purchase.')}
      </Typography>
    </Box>
  );
}
