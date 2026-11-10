'use client';

import type { AssetMarket } from '@/lib/prices/markets';
import type { Holding } from '@/components/_common/holdings-table';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { MUTED } from '@/theme/brand-colors';
import { useMarkets } from '@/hooks/use-markets';
import { minSpanFor } from '@/lib/prices/markets';
import { assetColor } from '@/lib/portfolio/display';

import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { AssetAvatar } from '@/components/_common/asset-avatar';
import { HoldingsTable } from '@/components/_common/holdings-table';
import { HAIRLINE, SegmentedControl } from '@/components/_common/brand';
import {
  BOX_PX,
  SeeAll,
  AppBlock,
  assetName,
  formatCoin,
  RowsSkeleton,
} from '@/components/_common/app-ui';

import type { HoldingData } from './_shared';

// ----------------------------------------------------------------------

/** One of Home's rows: the asset, its last 24 hours, what it is worth. */
function toHolding(
  holding: HoldingData,
  changes: Record<string, number | null>,
  markets: Record<string, AssetMarket | undefined>
): Holding {
  const { token } = holding;
  const savings = token.symbol === 'Savings';
  const market = markets[token.symbol];
  // On an account with two wallets each row names its wallet:
  // "0.13 ETH · Lobstr".
  const owner = token.name.includes(' · ') ? token.name.split(' · ').pop() : null;
  const amount = savings
    ? 'Earning every day'
    : formatCoin(BigNumber(token.balance).toNumber(), token.symbol);
  return {
    key: token.contract,
    href: savings ? paths.savings : paths.assets.details(token.symbol),
    icon: <AssetAvatar token={token} size={40} />,
    name: savings ? 'Savings' : assetName(token.symbol),
    // Savings is a product, not a coin: its second line names it, as on Assets.
    ticker: [savings ? 'Normal Savings' : token.symbol, owner].filter(Boolean).join(' · '),
    amount: [amount, owner].filter(Boolean).join(' · '),
    value: holding.value,
    price: savings ? null : Number(token.price) || null,
    change24h: changes[token.symbol] ?? market?.change24h ?? null,
    stable: token.symbol === 'USDC',
    sparkline: market?.sparkline24h ?? [],
    minSpan: minSpanFor(token.symbol),
    color: assetColor(token.symbol),
    marketCap: market?.marketCap ?? null,
    rank: market?.rank ?? null,
  };
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

/**
 * Home's "Your money": every asset with its last 24 hours and its value,
 * Savings among them.
 */
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
  const { markets } = useMarkets();

  return (
    <Box>
      <AppBlock
        flush
        open
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
              <HoldingsTable
                variant="home"
                rows={shown.map((holding) => toHolding(holding, changes, markets))}
              />
            ) : (
              <Typography sx={{ py: 5, fontSize: 14, textAlign: 'center', color: MUTED }}>
                Nothing here yet
              </Typography>
            )}
          </>
        )}
      </AppBlock>
      {/* CoinGecko's free data asks to be credited where it is shown, and
          Home's prices and daily changes come from it too (aggregate.ts).
          Under the list, so the title row stays short on a phone. */}
      <Typography sx={{ mt: 1, fontSize: 12.5, color: MUTED, textAlign: 'right' }}>
        Prices from CoinGecko
      </Typography>
    </Box>
  );
}
