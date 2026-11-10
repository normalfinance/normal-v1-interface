'use client';

import type { Token } from '@normalfinance/types';
import type { Holding } from '@/components/_common/holdings-table';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useMemo, useEffect } from 'react';
import { useMarkets } from '@/hooks/use-markets';
import { minSpanFor } from '@/lib/prices/markets';
import { cdn, logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useUsdPrice } from '@/hooks/use-price-history';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { assetColor, connectedWalletLabel, portfolioAssetToToken } from '@/lib/portfolio/display';

import Typography from '@mui/material/Typography';

import { AppPageHeader } from '@/components/_common/brand';
import { AssetAvatar } from '@/components/_common/asset-avatar';
import { HoldingsTable } from '@/components/_common/holdings-table';
import {
  AppBlock,
  Headline,
  assetName,
  formatUsd,
  formatCoin,
  ASSET_NAMES,
  RowsSkeleton,
  SummaryBlock,
} from '@/components/_common/app-ui';

export default function AssetsView() {
  const { t } = useTranslate();
  const { markets } = useMarkets();

  const { globalIsLoading, setGlobalIsLoading } = useAppStore();
  const { wallet } = usePersistStore();
  // #75: account-wide view — Stellar rows from the AGGREGATE (slot), plus
  // the companion Normal wallet's rows and the Savings row. This page read
  // the legacy slot store and showed $2.21 for a $52 account (observed live
  // 2026-08-18: Lobstr's 2 XLM while everything else sat in the companion).
  const { assets: aggAssets, companionStellar } = useWalletBalances(true);
  const savings = useSavingsPosition(true);
  const savingsUsd = savings.value + savings.companionValue;

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address, setGlobalIsLoading]);

  const { btcToken } = useBtcPortfolio(true);
  const { ethToken } = useEthPortfolio(true);
  const { solToken } = useSolPortfolio(true);

  // Live prices for natives the user has no address for yet (their
  // synthesized rows would otherwise show $0.00)
  const btcUsd = useUsdPrice('BTC', !btcToken);
  const ethUsd = useUsdPrice('ETH', !ethToken);
  const solUsd = useUsdPrice('SOL', !solToken);

  // Core assets (BTC, ETH, SOL, XLM, USDC) are always listed so they can be
  // picked even at zero balance; other Stellar tokens appear once the user
  // holds them. Native chains aren't in the Stellar token store, so they're
  // synthesized here when the user has no address for them yet.
  const displayTokens = useMemo(() => {
    const hybrid =
      wallet.walletType != null && wallet.walletType !== 'normal-wallet' && !!companionStellar;
    // ONE row per Stellar asset (Niko, 2026-08-25). The split rows predate
    // F1: they existed so the user could SEE which wallet held what, because
    // nothing ever asked. Now every action asks — buy/sell via WalletChoice,
    // send via its own picker — so the page-level split is redundant noise
    // and the per-wallet amounts move into the subtitle, hero-card style
    // (doc 80 D2: companion first, real wallet names, never "External").
    // Single-wallet accounts render exactly as before.
    const slotLabel = connectedWalletLabel(wallet.walletType);
    const fmtBal = (n: number) =>
      n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 4 : 2 });
    const stellar = aggAssets
      .filter((a) => a.chain === 'stellar')
      .map((a) => {
        const tk = portfolioAssetToToken(a);
        if (!hybrid) return tk;
        // The aggregate's Stellar rows are SLOT-only; the companion arrives
        // separately (portfolio route) — combining is an addition, not a split.
        const slotBal = Number(a.balance ?? 0);
        const compBal = Number(
          companionStellar?.assets.find((c) => c.symbol.toUpperCase() === a.symbol.toUpperCase())
            ?.balance ?? 0
        );
        const parts = [
          ...(compBal > 0 ? [{ label: 'Normal wallet', bal: compBal }] : []),
          ...(slotBal > 0 ? [{ label: slotLabel, bal: slotBal }] : []),
        ];
        const name =
          parts.length > 1
            ? `${tk.name} · ${parts.map((pt) => `${pt.label} ${fmtBal(pt.bal)}`).join(' · ')}`
            : parts.length === 1
              ? `${tk.name} · ${parts[0].label}`
              : tk.name;
        return {
          ...tk,
          balance: BigNumber(slotBal).plus(compBal).toString(),
          name,
        } as Token;
      });
    // Kept as a shape so the row assembly below stays untouched; the
    // companion's balances now live inside the combined rows above.
    const companion: Token[] = [];
    const savingsRow: Token[] =
      savingsUsd > 0
        ? [
            {
              symbol: 'Savings',
              contract: '__savings__',
              name: 'Normal Savings',
              issuer: '',
              org: '',
              domain: '',
              icon: cdn('logo/logo-single.png'),
              decimals: 4,
              featured: false,
              balance: String(savingsUsd),
              price: '1',
              percentageChange: 0,
            } as Token,
          ]
        : [];

    const synthesize = (
      symbol: string,
      name: string,
      contract: string,
      icon: string,
      decimals: number,
      usdPrice: number
    ): Token =>
      ({
        symbol,
        contract,
        name,
        issuer: '',
        org: '',
        domain: '',
        icon,
        decimals,
        featured: false,
        balance: '0',
        price: String(usdPrice),
        percentageChange: 0,
      }) as Token;

    const natives = [
      btcToken ?? synthesize('BTC', 'Bitcoin', '__btc__', cdn('tokens/bitcoin.webp'), 8, btcUsd),
      ethToken ?? synthesize('ETH', 'Ethereum', '__eth__', cdn('tokens/ethereum.webp'), 18, ethUsd),
      solToken ?? synthesize('SOL', 'Solana', '__sol__', cdn('tokens/solana.webp'), 9, solUsd),
    ];

    return [...natives, ...stellar, ...companion, ...savingsRow].sort((a, b) => {
      const aValue = BigNumber(a.balance).multipliedBy(a.price);
      const bValue = BigNumber(b.balance).multipliedBy(b.price);
      return bValue.minus(aValue).toNumber();
    });
  }, [
    aggAssets,
    companionStellar,
    savingsUsd,
    wallet.walletType,
    btcToken,
    ethToken,
    solToken,
    btcUsd,
    ethUsd,
    solUsd,
  ]);

  const valueOf = (token: Token) => BigNumber(token.balance).multipliedBy(token.price).toNumber();
  const totalValue = displayTokens.reduce((sum, token) => sum + valueOf(token), 0);

  // 24-hour price changes from the portfolio rows (the token rows carry none).
  const changeOf = (symbol: string) =>
    aggAssets.find((asset) => asset.symbol === symbol)?.change24h ?? null;

  // The page in three groups, the way people think of their money: dollars,
  // crypto, savings.
  const isSavings = (token: Token) => token.contract === '__savings__';
  const groups = [
    {
      key: 'cash',
      title: t('Digital dollars'),
      note: t('Each one is worth about one US dollar.'),
      tokens: displayTokens.filter((token) => token.symbol === 'USDC'),
    },
    {
      key: 'crypto',
      title: t('Crypto'),
      note: t('Prices move every day.'),
      tokens: displayTokens.filter((token) => token.symbol !== 'USDC' && !isSavings(token)),
    },
    {
      key: 'savings',
      title: t('Savings'),
      note: t('Earning every day.'),
      tokens: displayTokens.filter(isSavings),
    },
  ]
    .filter((group) => group.tokens.length > 0)
    .map((group) => ({
      ...group,
      total: group.tokens.reduce((sum, token) => sum + valueOf(token), 0),
    }));

  const apy = savings.vaultInfo?.apy ?? null;

  /** One row of the table. Savings is a product, not a coin: its row opens /savings. */
  const holdingOf = (token: Token): Holding => {
    const savingsRow = isSavings(token);
    const market = markets[token.symbol];
    // On two-wallet accounts the name carries each wallet's share.
    const wallets = token.name.includes(' · ')
      ? token.name.split(' · ').slice(1).join(' · ')
      : null;
    const name = savingsRow
      ? t('Savings')
      : ASSET_NAMES[token.symbol]
        ? assetName(token.symbol)
        : token.symbol;
    const amount = savingsRow
      ? apy !== null
        ? t('Earning {{apy}}% a year', { apy: Number(apy).toFixed(2) })
        : t('Earning every day')
      : formatCoin(BigNumber(token.balance).toNumber(), token.symbol);
    return {
      key: token.contract,
      href: savingsRow ? paths.savings : paths.assets.details(token.symbol),
      icon: <AssetAvatar token={token} size={40} />,
      name,
      ticker: [savingsRow ? t('Normal Savings') : token.symbol, wallets]
        .filter(Boolean)
        .join(' · '),
      amount: [amount, wallets].filter(Boolean).join(' · '),
      value: valueOf(token),
      price: savingsRow ? null : Number(token.price) || market?.price || null,
      change24h: changeOf(token.symbol) ?? market?.change24h ?? null,
      stable: token.symbol === 'USDC',
      sparkline: market?.sparkline24h ?? [],
      minSpan: minSpanFor(token.symbol),
      color: assetColor(token.symbol),
      marketCap: market?.marketCap ?? null,
      rank: market?.rank ?? null,
    };
  };

  return (
    <DashboardContent>
      <AppPageHeader title={t('Assets')} subtitle={t('Everything you hold, in one place.')} />

      <SummaryBlock
        aria-label={t('Total')}
        stats={groups.map((group) => ({
          key: group.key,
          label: group.title,
          value: formatUsd(group.total),
          note:
            totalValue > 0
              ? t('{{pct}}% of the total', { pct: Math.round((group.total / totalValue) * 100) })
              : undefined,
        }))}
      >
        <Headline label={t('Total')} value={formatUsd(totalValue)} />
      </SummaryBlock>

      <AppBlock
        flush
        open
        title={t('Holdings')}
        action={
          // CoinGecko's free data asks to be credited where it is shown.
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
            {t('Market data from CoinGecko')}
          </Typography>
        }
        sx={{ mt: { xs: 4, md: 5 } }}
      >
        {globalIsLoading ? (
          <RowsSkeleton rows={5} />
        ) : (
          <HoldingsTable
            groups={groups.map((group) => ({
              key: group.key,
              title: group.title,
              note: group.note,
              total: group.total,
              rows: group.tokens.map(holdingOf),
            }))}
          />
        )}
      </AppBlock>
    </DashboardContent>
  );
}
