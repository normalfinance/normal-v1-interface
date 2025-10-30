import type { Token } from '@normalfinance/types';

import React from 'react';
import { getCryptoIconUrl } from '@normalfinance/utils';

import { Box, Avatar } from '@mui/material';

interface PoolTokensAvatarGroupProps {
  tokenA: Token;
  tokenB: Token;
}

const PoolTokensAvatarGroup: React.FC<PoolTokensAvatarGroupProps> = ({ tokenA, tokenB }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
    }}
  >
    <Avatar
      src={tokenA.icon ?? getCryptoIconUrl(tokenA.symbol)}
      alt="Token A"
      sx={{ width: 27, height: 27, zIndex: 1 }}
    />

    <Avatar
      src={tokenB.icon ?? getCryptoIconUrl(tokenB.symbol)}
      alt="Token B"
      sx={{
        width: 27,
        height: 27,
        ml: '-12px',
      }}
    />
  </Box>
);

export default PoolTokensAvatarGroup;
