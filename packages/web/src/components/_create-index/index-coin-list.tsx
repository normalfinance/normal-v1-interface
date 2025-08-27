'use client';

import type { IndexCoin } from '@/types/indexes';

import React from 'react';

import Box from '@mui/material/Box';

import { IndexCoinStorageOverview } from './index-coin-storage-overview';

// Define a constant for storage calculation
const PERCENT = 100;

type Props = {
  indexCoinList: IndexCoin[];
  onRemoveCoin?: (id: number) => void;
  onReplaceCoin?: (id: number) => void;
};

export default function IndexCoinList({ indexCoinList, onRemoveCoin, onReplaceCoin }: Props) {
  return (
    <Box>
      <IndexCoinStorageOverview
        total={PERCENT}
        data={indexCoinList}
        onRemoveCoin={onRemoveCoin}
        onReplaceCoin={onReplaceCoin}
      />
    </Box>
  );
}
