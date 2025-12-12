import type { ChipProps } from '@mui/material';

import React from 'react';
import { format, constants } from '@normalfinance/utils';

import { Chip } from '@mui/material';

export interface AddressChipProps extends ChipProps {
  address: string;
}

const AddressChip: React.FC<AddressChipProps> = ({ address, sx, ...other }) => {
  let label = address;
  let color: ChipProps['color'] | undefined = undefined;

  switch (address) {
    case constants.StellarConfig.NORMAL_ISSUER:
      color = 'primary';
      label = '✏️ Normal Issuer';
      break;

    case constants.StellarConfig.NORMAL_ADMIN:
      color = 'secondary';
      label = '💼 Normal Admin';
      break;

    case constants.StellarConfig.NORMAL_HOT_A:
      color = 'error';
      label = '🔥 Normal Hot A';
      break;

    case constants.StellarConfig.NORMAL_DISTRIBUTOR:
      color = 'info';
      label = '📬 Normal Distributor';
      break;

    default:
      break;
  }

  // Not a Normal account
  if (color === undefined) {
    return format.fTruncate(address, 15);
  }

  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="soft"
      {...other}
      sx={{
        ...sx,
      }}
    />
  );
};

export default AddressChip;
