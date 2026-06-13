'use client';

import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cdn, logger } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { fNumber, fCurrency } from '@/utils/format-number';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useEthPortfolio, useSolPortfolio } from '@/hooks/use-chain-portfolio';

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
  const {
    wallet,
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();

  // Effect hook to fetch all tokens once the component mounts
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      try {
        setGlobalIsLoading(true);
        await getAllTokens();
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
      }
    };
    refreshTokens();
  }, [wallet.address]);

  const { btcToken } = useBtcPortfolio(true);
  const { ethToken } = useEthPortfolio(true);
  const { solToken } = useSolPortfolio(true);

  // Core assets (BTC, ETH, SOL, XLM, USDC) are always listed so they can be
  // picked even at zero balance; other Stellar tokens appear once the user
  // holds them. Native chains aren't in the Stellar token store, so they're
  // synthesized here when the user has no address for them yet.
  const displayTokens = useMemo(() => {
    const nativeSymbols = ['BTC', 'ETH', 'SOL'];
    const stellar = tokens.filter(
      (token) =>
        !nativeSymbols.includes(token.symbol) &&
        (BigNumber(token.balance).gt(0) || token.featured || token.symbol === 'XLM' || token.symbol === 'USDC')
    );

    const synthesize = (symbol: string, name: string, contract: string, icon: string, decimals: number): Token =>
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
        price: tokens.find((token) => token.symbol === symbol)?.price ?? '0',
        percentageChange: 0,
      } as Token);

    const natives = [
      btcToken ?? synthesize('BTC', 'Bitcoin', '__btc__', cdn('tokens/bitcoin.webp'), 8),
      ethToken ?? synthesize('ETH', 'Ethereum', '__eth__', cdn('tokens/ethereum.webp'), 18),
      solToken ?? synthesize('SOL', 'Solana', '__sol__', cdn('tokens/solana.webp'), 9),
    ];

    return [...natives, ...stellar].sort((a, b) => {
      const aValue = BigNumber(a.balance).multipliedBy(a.price);
      const bValue = BigNumber(b.balance).multipliedBy(b.price);
      return bValue.minus(aValue).toNumber();
    });
  }, [tokens, btcToken, ethToken, solToken]);

  // Calculate total value
  const totalValue = displayTokens.reduce((acc, token) => acc.plus(BigNumber(token.balance).multipliedBy(token.price)), BigNumber(0));

  const handleRowClick = (token: Token) => {
    router.push(paths.assets.details(token.symbol));
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
                    const balanceDisplay = balance.toFixed(
                      token.decimals > 4 ? 4 : token.decimals
                    );

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
                          <Typography variant="body2">{fNumber(balanceDisplay)}</Typography>
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
