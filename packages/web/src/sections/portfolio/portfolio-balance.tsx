'use client';

import type { Stat } from '@/components/_common/app-ui';

import { paths } from '@/routes/paths';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import ButtonBase from '@mui/material/ButtonBase';
import AddRounded from '@mui/icons-material/AddRounded';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';

import {
  Headline,
  formatUsd,
  ActionRow,
  ActionButton,
  SummaryBlock,
} from '@/components/_common/app-ui';

// ----------------------------------------------------------------------

type BalanceBlockProps = {
  total: number;
  /** The wallet's move in dollars over the last 24 hours; null when unknown. */
  change: number | null;
  /** Where the money is: digital dollars, crypto, savings. */
  split: { key: string; label: string; value: number }[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

/**
 * The top of Home: the whole balance, how it moved in the last day, the four
 * ways to move money (the same flows as Move money), and under a hairline,
 * where the money is.
 */
export function BalanceBlock({ total, change, split, loading, error, onRetry }: BalanceBlockProps) {
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

  const stats: Stat[] = split.map((part) => ({
    key: part.key,
    label: part.label,
    value: formatUsd(part.value),
    note: total > 0 ? `${Math.round((part.value / total) * 100)}% of the total` : undefined,
  }));

  return (
    <SummaryBlock
      aria-label="Total balance"
      stats={stats}
      loading={loading}
      actions={
        <ActionRow count={4}>
          <ActionButton
            primary
            icon={<AddRounded />}
            label="Add money"
            onClick={() => startAction('buy')}
          />
          <ActionButton
            icon={<NorthEastRounded />}
            label="Send"
            onClick={() => startAction('send')}
          />
          <ActionButton
            icon={<SouthWestRounded />}
            label="Receive"
            onClick={() => startAction('receive')}
          />
          <ActionButton icon={<SwapHorizRounded />} label="Swap" href={paths.swap} />
        </ActionRow>
      }
    >
      <Headline label="Total balance" value={formatUsd(total)} note={note} loading={loading} />
    </SummaryBlock>
  );
}
