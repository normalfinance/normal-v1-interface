'use client';

import { paths } from '@/routes/paths';
import { PAPER } from '@/theme/brand-colors';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import AddRounded from '@mui/icons-material/AddRounded';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';

import { HAIRLINE } from '@/components/_common/brand';
import { Headline, formatUsd, ActionTile, ActionTiles } from '@/components/_common/app-ui';

// ----------------------------------------------------------------------

type BalanceBlockProps = {
  total: number;
  /** The wallet's move in dollars over the last 24 hours; null when unknown. */
  change: number | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

/**
 * The top of Home: the whole balance, how it moved in the last day, and the
 * four ways to move money (the same flows as Move money). Nothing else: the
 * assets follow right under it (Niko 2026-11-09). On phones it sits on the
 * page with no box, so the list fits on the first screen; from tablets up it
 * is the page's summary box, the tiles beside the figure on wide screens.
 */
export function BalanceBlock({ total, change, loading, error, onRetry }: BalanceBlockProps) {
  const { startAction } = useAssetActionsContext();
  const moved = change != null && Math.abs(change) >= 0.005;

  const note = error ? (
    <>
      Some balances didn&apos;t load.{' '}
      <ButtonBase
        onClick={onRetry}
        sx={{
          font: 'inherit',
          fontWeight: 500,
          color: 'text.primary',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        Try again
      </ButtonBase>
    </>
  ) : moved ? (
    `${change > 0 ? '+' : '−'}${formatUsd(Math.abs(change))} in the last 24 hours`
  ) : null;

  return (
    <Box
      component="section"
      aria-label="Total balance"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) auto' },
        alignItems: 'end',
        gap: { xs: 2.5, md: 3 },
        bgcolor: PAPER,
        // On the page with a line under it, at every width (Niko 2026-11-10).
        pb: { xs: 2.5, md: 3 },
        borderBottom: HAIRLINE,
      }}
    >
      <Headline label="Total balance" value={formatUsd(total)} note={note} loading={loading} />
      <ActionTiles>
        <ActionTile icon={<AddRounded />} label="Add money" onClick={() => startAction('buy')} />
        <ActionTile icon={<NorthEastRounded />} label="Send" onClick={() => startAction('send')} />
        <ActionTile
          icon={<SouthWestRounded />}
          label="Receive"
          onClick={() => startAction('receive')}
        />
        <ActionTile icon={<SwapHorizRounded />} label="Swap" href={paths.swap} />
      </ActionTiles>
    </Box>
  );
}
