'use client';

import type { PositionOrBundle } from '@normalfinance/pools';

import { useState } from 'react';
import SwapCard from '@/components/_common/swap-card';
import { DashboardContent } from '@/layouts/dashboard';
import { fetchPositionsForOwner } from '@normalfinance/pools';
import { tickIndexToSqrtPrice } from '@normalfinance/pools-core';
import { devnet, mainnet, address, createSolanaRpc } from '@solana/kit';

import Grid2 from '@mui/material/Grid2';
import { Stack, Typography } from '@mui/material';

export default function SwapView() {
  const [positions, setPositions] = useState<PositionOrBundle[]>([]);
  const [owner, setOwner] = useState<string>('');
  const [tickIndex, setTickIndex] = useState<string>('');
  const [sqrtPrice, setSqrtPrice] = useState<bigint>();

  const rpc = useMemo(() => {
    if (!process.env.NEXT_PUBLIC_RPC_URL) {
      console.error('NEXT_PUBLIC_RPC_URL is not set');
      return createSolanaRpc(devnet('https://api.devnet.solana.com'));
    }
    return createSolanaRpc(mainnet(process.env.NEXT_PUBLIC_RPC_URL));
  }, [process.env.NEXT_PUBLIC_RPC_URL]);

  const fetchPositions = useCallback(async () => {
    const positions = await fetchPositionsForOwner(rpc, address(owner));
    setPositions(positions);
  }, [owner]);

  const convertTickIndex = useCallback(() => {
    const index = parseInt(tickIndex);
    setSqrtPrice(tickIndexToSqrtPrice(index));
  }, [tickIndex]);

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Welcome back 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Start swapping
        </Typography>
      </Stack>
      {/* First row: PortfolioValue/AssetsAndLiabilities */}
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 4 }}>
          <SwapCard />
        </Grid2>
      </Grid2>
    </DashboardContent>
  );
}
