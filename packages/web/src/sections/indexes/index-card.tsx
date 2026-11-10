'use client';

import type { ReactNode } from 'react';
import type { IndexMeta } from '@/lib/index/indexes';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { RouterLink } from '@/routes/components';
import { minSpanFor } from '@/lib/prices/markets';
import { useIndexWeights } from '@/hooks/use-index-weights';
import { basketChange, basketSeries } from '@/lib/index/indexes';
import { wireToUsdNumber, minimumPurchaseWire } from '@/lib/index/basket';
import {
  INK,
  HOVER,
  MUTED,
  PAPER,
  INK_SOFT,
  HAIRLINE_COLOR,
  HAIRLINE_STRONG,
} from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import EastRounded from '@mui/icons-material/EastRounded';
import DonutSmallOutlined from '@mui/icons-material/DonutSmallOutlined';

import { BOX_PX, FRAMED, Change, FIGURES, Sparkline, formatUsd } from '@/components/_common/app-ui';

import { CoinStack, WeightBar } from './index-parts';

// ---------------------------------------------------------------------------
// An index as a card to pick (Niko 2026-11-09: many indexes will follow, so
// each one is a block people choose), made "a little more premium" the same
// day while staying minimal. It stands out by what it holds, not decoration:
// the coins and the name; the basket's day as a line with a faint flat wash
// under it; its shares by market size in each coin's colour; then its facts as a factsheet
// strip (today, what it holds, the smallest purchase) and the way in as the
// card's full-width ink foot. The whole card is the link: its border turns ink
// and the foot lightens on hover or keyboard focus.
// ---------------------------------------------------------------------------

const COIN = 40;

/** One cell of the card's factsheet strip: a grey label over a figure. */
function Fact({
  label,
  first = false,
  children,
}: {
  label: string;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        px: BOX_PX,
        py: 1.75,
        borderLeft: first ? 'none' : `1px solid ${HAIRLINE_COLOR}`,
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: MUTED }}>{label}</Typography>
      <Typography
        component="div"
        sx={{
          ...FIGURES,
          mt: 0.5,
          fontSize: 16,
          fontWeight: 500,
          color: INK,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

export function IndexCard({ meta }: { meta: IndexMeta }) {
  const { t } = useTranslate();
  const { weights, markets } = useIndexWeights(meta.def);
  const series = basketSeries(meta.def, (s) => markets[s]);
  const today = basketChange(meta.def, (s) => markets[s]);
  // The smallest purchase follows the smallest coin's share.
  const from = weights ? wireToUsdNumber(minimumPurchaseWire(weights)) : null;

  return (
    <ButtonBase
      component={RouterLink}
      href={paths.indexes.details(meta.slug)}
      aria-label={t('{{name}} index: see what it holds and buy', { name: meta.name })}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
        height: '100%',
        textAlign: 'left',
        bgcolor: PAPER,
        // A card you pick keeps its frame, its padding inside (Niko 2026-11-10).
        ...FRAMED,
        border: `1px solid ${HAIRLINE_STRONG}`,
        transition: 'border-color 150ms',
        '& .nf-index-go': { transition: 'background-color 150ms' },
        '&:hover, &.Mui-focusVisible': {
          borderColor: INK,
          '& .nf-index-go': { bgcolor: INK_SOFT },
        },
        '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ p: BOX_PX, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* The coins it holds beside its name, as on the index's own page; what it
            is under them at the card's full width, so a phone never squeezes it */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <CoinStack symbols={meta.def.coins} size={COIN} />
            <Typography
              component="h2"
              sx={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', color: INK }}
            >
              {meta.name}
            </Typography>
          </Box>
          <Typography sx={{ mt: 1.5, fontSize: 14, lineHeight: 1.5, color: MUTED }}>
            {t(meta.tagline)}
          </Typography>
        </Box>

        {/* The basket's day by market size, with a faint flat wash under it */}
        <Sparkline
          points={series}
          color={INK}
          wash={HOVER}
          height={88}
          minSpan={minSpanFor('BTC')}
          label={t('{{name}} over the last 24 hours', { name: meta.name })}
        />

        {/* Its shares: one bar, each coin in its own colour, then the words */}
        <WeightBar weights={weights} />
      </Box>

      {/* Its facts, then the way in, at the foot whatever the card's height */}
      <Box sx={{ mt: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            borderTop: `1px solid ${HAIRLINE_COLOR}`,
          }}
        >
          <Fact first label={t('Today')}>
            {today === null ? '' : <Change pct={today} />}
          </Fact>
          <Fact label={t('Holds')}>{t('{{count}} coins', { count: meta.def.coins.length })}</Fact>
          <Fact label={t('From')}>
            {from === null ? <Skeleton variant="text" width={56} /> : formatUsd(from)}
          </Fact>
        </Box>
        <Box
          className="nf-index-go"
          aria-hidden="true"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 52,
            px: BOX_PX,
            fontSize: 15,
            fontWeight: 500,
            color: PAPER,
            bgcolor: INK,
            '& svg': { fontSize: 20 },
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
        ...FRAMED,
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
