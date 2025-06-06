'use client';

// @mui
import { Avatar } from '@mui/material';
import { CardProps } from '@mui/material/Card';
import AvatarGroup, { avatarGroupClasses } from '@mui/material/AvatarGroup';

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
        <Avatar key={asset} alt={asset} src={`/assets/icons/cryptoLogos/${asset}.svg`} />
      ))}
    </AvatarGroup>
  );
}
