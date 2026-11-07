'use client';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { MUTED } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { AssetAvatar } from '@/components/_common/asset-avatar';
import { HAIRLINE, SegmentedControl } from '@/components/_common/brand';
import {
  BOX_PX,
  Change,
  SeeAll,
  ListRow,
  RowList,
  AppBlock,
  assetName,
  formatUsd,
  formatCoin,
  RowsSkeleton,
} from '@/components/_common/app-ui';

import type { HoldingData } from './_shared';

// ----------------------------------------------------------------------

/**
 * Where the money is: digital dollars, crypto, savings, always in that order
 * (the Assets page's groups).
 */
export function moneySplit(holdings: HoldingData[]) {
  const sum = (match: (symbol: string) => boolean) =>
    holdings.filter((h) => match(h.token.symbol)).reduce((total, h) => total + h.value, 0);
  return [
    { key: 'cash', label: 'Digital dollars', value: sum((s) => s === 'USDC') },
    { key: 'crypto', label: 'Crypto', value: sum((s) => s !== 'USDC' && s !== 'Savings') },
    { key: 'savings', label: 'Savings', value: sum((s) => s === 'Savings') },
  ];
}

function Rows({
  holdings,
  changes,
}: {
  holdings: HoldingData[];
  changes: Record<string, number | null>;
}) {
  return (
    <RowList>
      {holdings.map((holding) => {
        const { token } = holding;
        const savings = token.symbol === 'Savings';
        // On an account with two wallets each row names its wallet:
        // "Digital dollars · Lobstr".
        const owner = token.name.includes(' · ') ? token.name.split(' · ').pop() : null;
        const amount = savings
          ? 'Earning every day'
          : formatCoin(BigNumber(token.balance).toNumber(), token.symbol);
        return (
          <ListRow
            key={token.contract}
            href={savings ? paths.savings : paths.assets.details(token.symbol)}
            icon={<AssetAvatar token={token} size={40} />}
            title={savings ? 'Savings' : assetName(token.symbol)}
            subtitle={[amount, owner].filter(Boolean).join(' · ')}
            value={formatUsd(holding.value)}
            detail={
              savings || token.symbol === 'USDC' ? undefined : (
                <Change pct={changes[token.symbol]} />
              )
            }
          />
        );
      })}
    </RowList>
  );
}

type MoneyBlockProps = {
  holdings: HoldingData[];
  /** An account with two wallets: one list per wallet. */
  sections?: { label: string; data: HoldingData[] }[];
  /** 24-hour price changes by symbol. */
  changes: Record<string, number | null>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

/** Home's "Your money": every asset with its value, Savings among them. */
export function MoneyBlock({
  holdings,
  sections,
  changes,
  loading,
  error,
  onRetry,
}: MoneyBlockProps) {
  const [section, setSection] = useState(sections?.[0]?.label ?? '');
  const shown = sections?.find((s) => s.label === section)?.data ?? holdings;

  return (
    <AppBlock
      flush
      title="Your money"
      action={<SeeAll href={paths.assets.root}>All assets</SeeAll>}
    >
      {loading ? (
        <RowsSkeleton rows={4} />
      ) : (
        <>
          {sections && (
            <Box sx={{ px: BOX_PX, py: 1.5, borderBottom: HAIRLINE }}>
              <SegmentedControl
                value={section}
                onChange={setSection}
                options={sections.map((s) => ({ value: s.label, label: s.label }))}
              />
            </Box>
          )}
          {error && (
            <Typography
              sx={{ px: BOX_PX, py: 1.5, fontSize: 13, color: MUTED, borderBottom: HAIRLINE }}
            >
              Some balances didn&apos;t load.{' '}
              <ButtonBase
                onClick={onRetry}
                sx={{ font: 'inherit', fontWeight: 500, textDecoration: 'underline' }}
              >
                Try again
              </ButtonBase>
            </Typography>
          )}
          {shown.length ? (
            <Rows holdings={shown} changes={changes} />
          ) : (
            <Typography sx={{ py: 5, fontSize: 14, textAlign: 'center', color: MUTED }}>
              Nothing here yet
            </Typography>
          )}
        </>
      )}
    </AppBlock>
  );
}
