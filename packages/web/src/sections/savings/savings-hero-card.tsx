'use client';

import Typography from '@mui/material/Typography';

import { FIGURES, AppBlock, Headline, formatUsd, SummaryBlock } from '@/components/_common/app-ui';

import { SavingsChart } from './savings-chart';

// ----------------------------------------------------------------------

interface SavingsHeroCardProps {
  currentValue: number;
  totalDeposited: number;
  earnings: number;
  apy: number | null;
  loading: boolean;
  walletAddress?: string;
}

/**
 * The top of the Savings page: the balance and the rate, what it has earned,
 * what you put in and what today's rate pays a month and a year.
 */
export function SavingsHeroCard({
  currentValue,
  totalDeposited,
  earnings,
  apy,
  loading,
}: SavingsHeroCardProps) {
  const yearly = apy !== null ? currentValue * (apy / 100) : null;
  const earnedPct = totalDeposited > 0 ? (earnings / totalDeposited) * 100 : null;

  return (
    <SummaryBlock
      aria-label="Savings balance"
      loading={loading}
      stats={[
        { key: 'in', label: 'You put in', value: formatUsd(totalDeposited) },
        {
          key: 'earned',
          label: 'Earned so far',
          value: `+${formatUsd(earnings)}`,
          note:
            earnedPct !== null && earnings > 0
              ? `${earnedPct.toFixed(2)}% on what you put in`
              : undefined,
        },
        ...(yearly !== null
          ? [
              {
                key: 'month',
                label: "A month at today's rate",
                value: `~${formatUsd(yearly / 12)}`,
              },
              { key: 'year', label: "A year at today's rate", value: `~${formatUsd(yearly)}` },
            ]
          : []),
      ]}
    >
      <Headline
        label="Savings balance"
        value={formatUsd(currentValue)}
        loading={loading}
        aside={
          apy !== null && (
            <Typography sx={{ ...FIGURES, fontSize: 14, fontWeight: 500, color: 'text.primary' }}>
              {`${Number(apy).toFixed(2)}% a year`}
            </Typography>
          )
        }
        note="The rate changes with the market and is never guaranteed."
      />
    </SummaryBlock>
  );
}

/** What the savings have earned over time, as a line in ink. */
export function SavingsEarningsCard({
  walletAddress,
  earnings,
  currentValue,
}: {
  walletAddress?: string;
  earnings: number;
  currentValue: number;
}) {
  return (
    <AppBlock title="Earnings">
      <SavingsChart
        walletAddress={walletAddress}
        currentEarnings={earnings}
        currentBalance={currentValue}
      />
    </AppBlock>
  );
}
