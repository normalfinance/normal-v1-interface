'use client';

import { cdn, getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';

import { getAssetNetwork } from './network-badge';

// ---------------------------------------------------------------------------
// Asset icon with a small network logo overlaid bottom-right (the familiar
// wallet pattern: USDC icon + Stellar mini-badge). Only USDC gets the badge —
// it's the one asset whose network is ambiguous (USDC exists on many chains);
// XLM and BTC are unmistakably their own networks.
// ---------------------------------------------------------------------------

interface AssetAvatarProps {
  token: { symbol: string; name: string; contract: string; icon?: string | null };
  size?: number;
}

export function AssetAvatar({ token, size = 32 }: AssetAvatarProps) {
  const network = getAssetNetwork(token);
  const showOverlay = network === 'Stellar' && token.symbol === 'USDC';
  const overlaySize = Math.round(size * 0.5);

  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Avatar
        src={token.icon || getCryptoIconUrl(token.symbol)}
        alt={token.name}
        sx={{ width: size, height: size }}
      />
      {showOverlay && (
        <Box
          component="img"
          src={cdn('tokens/XLM.webp')}
          alt="Stellar"
          sx={{
            position: 'absolute',
            right: -1,
            bottom: -1,
            width: overlaySize,
            height: overlaySize,
            borderRadius: '50%',
            border: '1.5px solid #fff',
            bgcolor: '#fff',
            objectFit: 'cover',
          }}
        />
      )}
    </Box>
  );
}
