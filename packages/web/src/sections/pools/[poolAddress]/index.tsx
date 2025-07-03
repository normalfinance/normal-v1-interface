'use client';

import type { Token } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { constants } from '@normalfinance/utils';
import { fPercent } from '@/utils/format-number';
import { DashboardContent } from '@/layouts/dashboard';
import { getCryptoIconUrl } from '@/utils/get-crypto-icon';
import { NormalPoolContract } from '@normalfinance/contracts';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { formatCurrency } from '@normalfinance/utils/build/stellar';
import { useContractTransaction } from '@/hooks/use-contract-transaction';

import { Box, Grid, Alert, Stack, Typography, CircularProgress } from '@mui/material';

import PoolStatsTemp from '@/components/_pool-page-components/pool-stats-temp';
import PoolLiquidityTemp from '@/components/_pool-page-components/pool-liquidity-temp';

interface _Token extends Token {
  readonly decimals: number;
}

export default function PoolView({ poolAddress }: { poolAddress: string }) {
  const { t } = useTranslate();
  // Load App Store
  const store = useAppStore();
  const storePersist = usePersistStore();

  const { executeContractTransaction } = useContractTransaction();

  // Let's have some variable to see if the pool even exists
  const [poolNotFound, setPoolNotFound] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [tokenAmounts, setTokenAmounts] = useState<number[]>([0]);

  // Token Balances
  const [tokenA, setTokenA] = useState<_Token | undefined>(undefined);
  const [tokenB, setTokenB] = useState<_Token | undefined>(undefined);
  const [lpToken, setLpToken] = useState<_Token | undefined>(undefined);

  // Rewards
  // const [rewards, setRewards] = useState<Token[]>([]);

  // Pool Liquidity
  const [poolFee, setPoolFee] = useState<number>(0);
  const [poolLiquidity, setPoolLiquidity] = useState<number>(0);
  const [poolLiquidityTokenA, setPoolLiquidityTokenA] = useState<number>(0);
  const [poolLiquidityTokenB, setPoolLiquidityTokenB] = useState<number>(0);
  const [assetLpShare, setAssetLpShare] = useState<number>(0);
  const [userShare, setUserShare] = useState<number>(0);
  // const [lpTokenPrice, setLpTokenPrice] = useState<number>(0);

  const PoolContract = new NormalPoolContract.Client({
    contractId: poolAddress,
    networkPassphrase: constants.NETWORK_PASSPHRASE,
    rpcUrl: constants.RPC_URL,
  });
  const appStore = useAppStore();

  // Provide Liquidity
  const provideLiquidity = async (tokenAmount: number, minShares: number) => {
    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: poolAddress,
      transactionFunction: async (client, restore) =>
        client.deposit(
          {
            user: storePersist.wallet.address!,
            desired_amount: BigInt((tokenAmount * 10 ** (tokenB?.decimals || 7)).toFixed(0)),
            min_shares: BigInt(minShares),
          },
          { simulate: !restore }
        ),
    });
    // Refresh pool data
    await getPool();
    setTokenAmounts([0, tokenAmount]);
    setTimeout(() => {
      getPool();
    }, 7000);
  };

  // Remove Liquidity
  const removeLiquidity = async (shareTokenAmount: number, fix?: boolean) => {
    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: poolAddress,
      transactionFunction: async (client, restore) =>
        client.withdraw(
          {
            user: storePersist.wallet.address!,
            share_amount: BigInt((shareTokenAmount * 10 ** (lpToken?.decimals || 7)).toFixed(0)),
            min_amount: BigInt(0),
          },
          { simulate: !restore }
        ),
    });
    setTokenAmounts([shareTokenAmount]);
    // Wait 7 Seconds for the next block and fetch new balances
    setTimeout(() => {
      getPool();
    }, 7000);
  };

  // Function to fetch pool info from chain
  const getPool = async () => {
    try {
      // Fetch pool info from chain
      const { result } = await PoolContract.get_info();

      if (result) {
        setPoolFee(result.total_fee_bps);
      }

      // When results ok... poolTokens.result && poolReserves.result
      if (result) {
        // Fetch token infos from chain and save in global appstore
        const [_tokenA, _tokenB, _lpToken] = await Promise.all([
          store.fetchTokenInfo(result.pool_response.asset_a.address),
          store.fetchTokenInfo(result.pool_response.asset_b.address),
          store.fetchTokenInfo(result.pool_response.asset_lp_share.address, true),
        ]);

        const priceA =
          Number(result.pool_response.asset_b.amount) / Number(result.pool_response.asset_a.amount);
        const tvl =
          (priceA * Number(result.pool_response.asset_a.amount)) / 10 ** Number(_tokenA?.decimals) +
          Number(result.pool_response.asset_b.amount) / 10 ** Number(_tokenB?.decimals);

        setPoolLiquidity(tvl);
        // Set token states
        setTokenA({
          name: _tokenA?.symbol as string,
          icon: getCryptoIconUrl(_tokenA?.symbol as string),
          usdValue: Number(priceA),
          amount: Number(_tokenA?.balance) / 10 ** Number(_tokenA?.decimals),
          category: 'none',
          decimals: Number(_tokenA?.decimals),
        });
        setTokenB({
          name: _tokenB?.symbol as string,
          icon: getCryptoIconUrl(_tokenB?.symbol as string),
          usdValue: 1,
          amount: Number(_tokenB?.balance) / 10 ** Number(_tokenB?.decimals),
          category: 'none',
          decimals: Number(_tokenB?.decimals),
        });
        setLpToken({
          name: _lpToken?.symbol as string,
          icon: '/assets/icons/crypto-icons/poolIcon.png',
          usdValue: 0,
          amount: Number(_lpToken?.balance) / 10 ** Number(_lpToken?.decimals),
          category: 'none',
          decimals: Number(_lpToken?.decimals),
        });
        setAssetLpShare(
          Number(result.pool_response.asset_lp_share.amount) / 10 ** Number(_lpToken?.decimals)
        );
        setPoolLiquidityTokenA(
          Number(
            (Number(result.pool_response.asset_a.amount) / 10 ** Number(_tokenA?.decimals)).toFixed(
              2
            )
          )
        );
        setPoolLiquidityTokenB(
          Number(
            (Number(result.pool_response.asset_b.amount) / 10 ** Number(_tokenB?.decimals)).toFixed(
              2
            )
          )
        );

        // LP token stuff..
        // Get user share
        if (storePersist.wallet.address) {
          if (result) {
            // Get the total amount of LP tokens in the pool

            const lpShareAmount = Number(result.pool_response.asset_lp_share.amount);
            const lpShareAmountDec = Number(lpShareAmount) / 10 ** (_lpToken?.decimals || 7);

            // Get the amount of LP tokens the user has as balance or staked
            const totalUserLPTokens =
              Number(_lpToken!.balance || 0) / 10 ** (_lpToken?.decimals || 7);

            // Price per Unit
            const pricePerUnit = tvl / lpShareAmountDec;

            // User share
            setUserShare(totalUserLPTokens * pricePerUnit);
          }
        }
      }
    } catch (e) {
      // If pool not found, set poolNotFound to true
      console.log(e);
      setPoolNotFound(true);
      appStore.setLoading(false);
    } finally {
      appStore.setLoading(false);
    }
  };

  useEffect(() => {
    getPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storePersist.wallet.address]);

  if (!poolAddress || poolNotFound) {
    return <Alert severity="info">{`The pool you're looking for doesn't exist.`}</Alert>;
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          {t('Pool')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {poolAddress}
        </Typography>
      </Stack>
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Box sx={{ mt: { xs: 12, md: 0 }, maxWidth: '1440px' }}>
          {loading && <CircularProgress />}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {tokenA?.icon ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box
                  sx={{ height: '2.5rem', width: '2.5rem' }}
                  component="img"
                  src={tokenA?.icon}
                />
                <Box
                  sx={{ ml: -1, height: '2.5rem', width: '2.5rem' }}
                  component="img"
                  src={tokenB?.icon}
                />
              </Box>
            ) : (
              <CircularProgress />
            )}

            {tokenA?.name ? (
              <Typography sx={{ fontSize: '2rem', fontWeight: 700, ml: 1 }}>
                {tokenA?.name}
                {t('-')}
                {tokenB?.name}
              </Typography>
            ) : (
              <CircularProgress />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                <PoolStatsTemp
                  stats={[
                    {
                      title: 'TVL',
                      value: formatCurrency('USD', poolLiquidity.toString(), navigator.language),
                    },
                    {
                      title: 'My Share',
                      value: storePersist.wallet.address
                        ? formatCurrency('USD', userShare.toString(), navigator.language)
                        : '-',
                    },
                    {
                      title: 'LP tokens',
                      value: lpToken?.amount.toString() || '0',
                    },
                    {
                      title: 'Swap fee',
                      value: fPercent(poolFee),
                    },
                  ]}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              {tokenA && tokenB && lpToken ? (
                <PoolLiquidityTemp
                  tokenA={tokenA}
                  tokenB={tokenB}
                  liquidityA={Number(poolLiquidityTokenA)}
                  liquidityB={Number(poolLiquidityTokenB)}
                  liquidityToken={lpToken}
                  onAddLiquidity={(tokenAmount) => {
                    provideLiquidity(tokenAmount, 0);
                  }}
                  onRemoveLiquidity={(liquidityTokenAmount, fix) => {
                    removeLiquidity(liquidityTokenAmount, fix);
                  }}
                />
              ) : (
                <CircularProgress />
              )}
            </Grid>
          </Grid>
        </Box>
      </Grid>
    </DashboardContent>
  );
}
