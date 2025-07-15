import React from 'react';
import { getCryptoIconUrl } from '@normalfinance/utils';

import { Box, Avatar } from '@mui/material';

interface PoolTokensAvatarGroupProps {
  tokenAName: string;
  tokenBName: string;
}

const PoolTokensAvatarGroup: React.FC<PoolTokensAvatarGroupProps> = ({
  tokenAName,
  tokenBName,
}) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <Avatar src={getCryptoIconUrl(tokenAName)} alt="Token A" sx={{ width: 27, height: 27 }} />

      <Avatar
        src={getCryptoIconUrl(tokenBName)}
        alt="Token B"
        sx={{
          width: 27,
          height: 27,
          ml: '-12px',
          zIndex: 1,
        }}
      />
    </Box>
  );

export default PoolTokensAvatarGroup;
