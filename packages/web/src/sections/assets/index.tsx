'use client';

import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cdn, logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useUsdPrice } from '@/hooks/use-price-history';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { fCurrency, fTokenAmount } from '@/utils/format-number';
import { useWalletBalances } from '@/hooks/use-wallet-balances';
import { useSavingsPosition } from '@/hooks/use-savings-position';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';
import { connectedWalletLabel, portfolioAssetToToken } from '@/lib/portfolio/display';

import {
  Box,
  Card,
  Stack,
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  CardContent,
  TableContainer,
} from '@mui/material';

import { AssetAvatar } from '@/components/_common/asset-avatar';

export default function AssetsView() {
  const { t } = useTranslate();
  const router = useRouter();

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

  // Calculate total value
  const totalValue = displayTokens.reduce(
    (acc, token) => acc.plus(BigNumber(token.balance).multipliedBy(token.price)),
    BigNumber(0)
  );

  const handleRowClick = (token: Token) => {
    // Savings is a product, not a chain asset — its row opens /savings.
    router.push(
      token.contract === '__savings__' ? paths.savings : paths.assets.details(token.symbol)
    );
  };

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100dvh',
        bgcolor: theme.palette.grey[100],
        ...theme.applyStyles('dark', { bgcolor: theme.palette.background.default }),
      })}
    >
      <DashboardContent maxWidth="xl">
        <Stack spacing={1} mb={3}>
          <Typography variant="h4" color="text.primary">
            {t('Assets')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('Your wallet tokens')}
          </Typography>
        </Stack>

        {/* Total Value Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              {t('Total Value')}
            </Typography>
            <Typography variant="h4">{fCurrency(totalValue.toNumber())}</Typography>
          </CardContent>
        </Card>

        {/* Tokens Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('Asset')}</TableCell>
                  <TableCell align="right">{t('Balance')}</TableCell>
                  <TableCell align="right">{t('Price')}</TableCell>
                  <TableCell align="right">{t('Value')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {globalIsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">{t('Loading...')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : displayTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">{t('No assets found')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayTokens.map((token) => {
                    const balance = BigNumber(token.balance);
                    const value = balance.multipliedBy(token.price);
                    const balanceDisplay = fTokenAmount(token.balance);

                    return (
                      <TableRow
                        key={token.contract}
                        hover
                        onClick={() => handleRowClick(token)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <AssetAvatar token={token} size={32} />
                            <Stack>
                              <Typography variant="subtitle2">{token.symbol}</Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {token.name}
                              </Typography>
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{balanceDisplay}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{fCurrency(token.price)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2">{fCurrency(value.toNumber())}</Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </DashboardContent>
    </Box>
  );
}
