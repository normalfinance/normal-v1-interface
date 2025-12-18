'use client';

import type { IndexFundComponent } from '@normalfinance/types';

import React from 'react';

import Box from '@mui/material/Box';

import { IndexComponentStorageOverview } from './index-component-storage-overview';

// Define a constant for storage calculation
const PERCENT = 100;

type Props = {
  components: IndexFundComponent[];
  onRemoveComponent?: (id: string) => void;
  onReplaceComponent?: (id: string) => void;
};

export default function IndexComponentList({
  components,
  onRemoveComponent,
  onReplaceComponent,
}: Props) {
  return (
    <Box>
      <IndexComponentStorageOverview
        total={PERCENT}
        data={components}
        onRemoveComponent={onRemoveComponent}
        onReplaceComponent={onReplaceComponent}
      />
    </Box>
  );
}
