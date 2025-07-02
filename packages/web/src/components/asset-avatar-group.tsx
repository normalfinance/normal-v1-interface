'use client';

import type { CardProps } from '@mui/material/Card';

// @mui
import { Avatar } from '@mui/material';
import AvatarGroup, { avatarGroupClasses } from '@mui/material/AvatarGroup';
import { getCryptoIconUrl } from '@/utils/get-crypto-icon';

// ----------------------------------------------------------------------

interface Props extends CardProps {
  assets: string[];
  size: number;
  max: number;
  fontSize: number;
}

export default function AssetAvatarGroup({ assets, size, max, fontSize }: Props) {
  return (
    <AvatarGroup
      max={max}
      sx={{
        [`& .${avatarGroupClasses.avatar}`]: {
          width: size,
          height: size,
          '&:first-of-type': {
            fontSize,
          },
        },
      }}
    >
      {assets.map((asset) => (
        <Avatar key={asset} alt={asset} src={getCryptoIconUrl(asset)} />
      ))}
    </AvatarGroup>
  );
}
