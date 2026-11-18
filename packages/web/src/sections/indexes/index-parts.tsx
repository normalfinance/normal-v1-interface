'use client';

import type { IndexWeight } from '@/lib/index/basket';

import { weightLabel } from '@/lib/index/basket';
import { assetColor, assetDisplay } from '@/lib/portfolio/display';
import { INK, MUTED, PAPER, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { FIGURES, assetName } from '@/components/_common/app-ui';

// ---------------------------------------------------------------------------
// The pieces every index screen draws the same way (the Indexes card, the
// index's own page): its coins as one stack, and its weights as one bar in
// each coin's colour with the words under it. The coins and their colours are
// the index's picture; the rest of the screen stays ink and hairlines.
// ---------------------------------------------------------------------------

/**
 * The coins an index holds, overlapping, each on its own white coin: a paper
 * ring makes the gap between them (no shadow), a hairline sits just inside it.
 */
export function CoinStack({ symbols, size = 36 }: { symbols: string[]; size?: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-hidden="true">
      {symbols.map((symbol, i) => (
        <Box
          key={symbol}
          sx={{
            width: size,
            height: size,
            ml: i ? `-${Math.round(size * 0.28)}px` : 0,
            borderRadius: '50%',
            bgcolor: PAPER,
            border: `2px solid ${PAPER}`,
            outline: `1px solid ${HAIRLINE_COLOR}`,
            outlineOffset: '-3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: symbols.length - i,
          }}
        >
          <Box
            component="img"
            src={assetDisplay(symbol).icon}
            alt=""
            sx={{ width: size - 12, height: size - 12, display: 'block' }}
          />
        </Box>
      ))}
    </Box>
  );
}

/**
 * An index's shares by market size: one bar, each coin its share in its own
 * colour, then the words. While the market sizes load, a quiet placeholder of
 * the same height, so nothing jumps when they arrive.
 */
export function WeightBar({
  weights,
  height = 6,
}: {
  weights: IndexWeight[] | null;
  height?: number;
}) {
  if (!weights) {
    return (
      <Box>
        <Skeleton variant="rectangular" sx={{ height }} />
        <Skeleton variant="text" sx={{ mt: 1, width: 240, fontSize: 13 }} />
      </Box>
    );
  }
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: '2px', height }} aria-hidden="true">
        {weights.map((w) => (
          <Box key={w.symbol} sx={{ flexGrow: w.weightBps, bgcolor: assetColor(w.symbol) }} />
        ))}
      </Box>
      <Box sx={{ mt: 1.25, display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0.5 }}>
        {weights.map((w) => (
          <Typography key={w.symbol} sx={{ fontSize: 13, color: MUTED }}>
            <Box component="span" sx={{ color: INK, fontWeight: 500 }}>
              {assetName(w.symbol)}
            </Box>{' '}
            <Box component="span" sx={FIGURES}>
              {weightLabel(w.weightBps)}
            </Box>
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
