'use client';

import type { Token } from '@normalfinance/types';

import { use, useState, useEffect } from 'react';
import { constants } from '@normalfinance/utils';
import { DashboardContent } from '@/layouts/dashboard';
import { useAppStore, usePersistStore } from '@/state/store';
import { NormalPoolContract } from '@normalfinance/stellar-contracts';
import { useContractTransaction } from '@/hooks/use-contract-transaction';

import Grid2 from '@mui/material/Grid2';
import { Alert, Stack, Typography } from '@mui/material';

interface _Token extends Token {
  readonly decimals: number;
}

interface PoolPageProps {
  readonly params: Promise<{
    readonly poolAddress: string;
  }>;
}

export default function PoolView(props: PoolPageProps) {
  const params = use(props.params);
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

  // Set APR
  const [maxApr, setMaxApr] = useState<number>(0);

  // Rewards
  const [rewards, setRewards] = useState<Token[]>([]);

  // Pool Liquidity
  const [poolLiquidity, setPoolLiquidity] = useState<number>(0);
  const [poolLiquidityTokenA, setPoolLiquidityTokenA] = useState<number>(0);
  const [poolLiquidityTokenB, setPoolLiquidityTokenB] = useState<number>(0);
  const [assetLpShare, setAssetLpShare] = useState<number>(0);
  const [userShare, setUserShare] = useState<number>(0);
  const [lpTokenPrice, setLpTokenPrice] = useState<number>(0);

  const PoolContract = new NormalPoolContract.Client({
    contractId: params.poolAddress,
    networkPassphrase: constants.SOROBAN_NETWORK_PASSPHRASE,
    rpcUrl: constants.SOROBAN_RPC_URL,
  });
  const appStore = useAppStore();

  // Provide Liquidity
  const provideLiquidity = async (tokenBAmount: number, minShares: number) => {
    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: params.poolAddress,
      transactionFunction: async (client, restore) =>
        client.deposit(
          {
            user: storePersist.wallet.address!,
            desired_amount: BigInt((tokenBAmount * 10 ** (tokenB?.decimals || 7)).toFixed(0)),
            min_shares: BigInt(minShares),
          },
          { simulate: !restore }
        ),
    });
    // Refresh pool data
    await getPool();
    setTokenAmounts([_, tokenBAmount]);
    setTimeout(() => {
      getPool();
    }, 7000);
  };

  // Remove Liquidity
  const removeLiquidity = async (shareTokenAmount: number, fix?: boolean) => {
    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: params.poolAddress,
      transactionFunction: async (client, restore) =>
        client.withdraw(
          {
            user: storePersist.wallet.address!,
            share_amount: BigInt((shareTokenAmount * 10 ** (lpToken?.decimals || 7)).toFixed(0)),
            min_amount: BigInt(1),
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
      const poolInfo = await PoolContract.get_info();
      const poolTokens = await PoolContract.get_tokens();
      const poolReserves = await PoolContract.get_reserves();
      const poolTotalShares = await PoolContract.get_total_shares();

      console.log(poolInfo.result);

      // When results ok...
      if (poolInfo?.result) {
        // Fetch token infos from chain and save in global appstore
        const [_tokenA, _tokenB, _lpToken] = await Promise.all([
          store.fetchTokenInfo(poolTokens.result[0]),
          store.fetchTokenInfo(poolTokens.result[1]),
          store.fetchTokenInfo(poolInfo.result.share_token, true),
        ]);
        console.log(_lpToken);

        // Fetch prices and calculate TVL
        const [priceA, priceB] = await Promise.all([
          API.getPrice(_tokenA?.symbol || ''),
          API.getPrice(_tokenB?.symbol || ''),
        ]);

        const tvl =
          (priceA * Number(poolReserves.result[0])) / 10 ** Number(_tokenA?.decimals) +
          (priceB * Number(poolReserves.result[1])) / 10 ** Number(_tokenB?.decimals);

        setPoolLiquidity(tvl);
        // Set token states
        setTokenA({
          name: _tokenA?.symbol as string,
          icon: `/cryptoIcons/${_tokenA?.symbol.toLowerCase()}.svg`,
          usdValue: Number(priceA),
          amount: Number(_tokenA?.balance) / 10 ** Number(_tokenA?.decimals),
          category: 'none',
          decimals: Number(_tokenA?.decimals),
        });
        setTokenB({
          name: _tokenB?.symbol as string,
          icon: `/cryptoIcons/${_tokenB?.symbol.toLowerCase()}.svg`,
          usdValue: Number(priceB),
          amount: Number(_tokenB?.balance) / 10 ** Number(_tokenB?.decimals),
          category: 'none',
          decimals: Number(_tokenB?.decimals),
        });
        setLpToken({
          name: _lpToken?.symbol as string,
          icon: `/cryptoIcons/poolIcon.png`,
          usdValue: 0,
          amount: Number(_lpToken?.balance) / 10 ** Number(_lpToken?.decimals),
          category: 'none',
          decimals: Number(_lpToken?.decimals),
        });
        setAssetLpShare(Number(poolTotalShares.result) / 10 ** Number(_lpToken?.decimals));
        setPoolLiquidityTokenA(
          Number((Number(poolReserves.result[0]) / 10 ** Number(_tokenA?.decimals)).toFixed(2))
        );
        setPoolLiquidityTokenB(
          Number((Number(poolReserves.result[1]) / 10 ** Number(_tokenB?.decimals)).toFixed(2))
        );

        const poolIncentives = [
          {
            // XLM / USDC
            address: 'CBHCRSVX3ZZ7EGTSYMKPEFGZNWRVCSESQR3UABET4MIW52N4EVU6BIZX',
            amount: 12500,
          },
        ];

        // const stakingInfoA = await stakeContractAddress.query_total_staked({
        //   simulate: false,
        // });
        // const stakingInfo = await stakingInfoA.simulate({ restore: true });
        const totalStaked = Number(stakingInfo?.result);

        const ratioStaked = totalStaked / Number(poolInfo.result.asset_lp_share.amount);
        // const valueStaked = tvl * ratioStaked;
        const poolIncentive = poolIncentives.find(
          (incentive) => incentive.address === params.poolAddress
        )!;
        const phoprice = await fetchPho();
        const apr = ((poolIncentive?.amount * phoprice) / valueStaked) * 100 * 6;

        const tokenPrice = valueStaked / (totalStaked / 10 ** 7);
        setLpTokenPrice(tokenPrice);
        // const stakes = await fetchStakes(_lpToken?.symbol, stakeContractAddress, apr, tokenPrice);
        // Get user share
        if (storePersist.wallet.address) {
          if (poolInfo.result) {
            // Get the total amount of LP tokens in the pool
            const info = poolInfo.result;

            const lpShareAmount = Number(info.asset_lp_share.amount);
            const lpShareAmountDec = Number(lpShareAmount) / 10 ** (_lpToken?.decimals || 7);

            // Get the amount of LP tokens the user has as balance or staked
            const userLpTokenAmount =
              Number(_lpToken!.balance || 0) / 10 ** (_lpToken?.decimals || 7);

            const summedStakes =
              stakes?.reduce((acc, stake) => acc + Number(stake.amount.tokenAmount), 0) || 0;

            // Total LP tokens of the user
            const totalUserLPTokens = userLpTokenAmount + summedStakes;

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

  const claimTokens = async () => {
    await executeContractTransaction({
      contractType: 'pool',
      contractAddress: params.poolAddress,
      transactionFunction: async (client, restore) =>
        client.claim(
          {
            user: storePersist.wallet.address!,
          },
          { simulate: !restore }
        ),
    });
    // Wait 7 Seconds for the next block and fetch new balances
    setTimeout(() => {
      getPool();
    }, 7000);
  };

  useEffect(() => {
    getPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storePersist.wallet.address]);

  if (!params.poolAddress || poolNotFound) {
    return <Alert severity="info">{`The pool you're looking for doesn't exist.`}</Alert>;
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Pool
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {params.poolAddress}
        </Typography>
      </Stack>
      {/* First row: PortfolioValue/AssetsAndLiabilities */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>{tokenA?.name}</Grid2>
      </Grid2>
    </DashboardContent>
  );
}
