import type { IconButtonProps } from '@mui/material';

import React from 'react';

import { Tooltip, IconButton } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

export interface RefreshButtonProps extends IconButtonProps {
  tooltip?: string;
  onRefresh: VoidFunction;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({
  tooltip = 'Refresh',
  onRefresh,
  sx,
  ...other
}) => (
  <Tooltip title={tooltip}>
    <IconButton sx={{ ...sx }} onClick={onRefresh} {...other}>
      <Iconify icon="solar:refresh-linear" />
    </IconButton>
  </Tooltip>
);

export default RefreshButton;
