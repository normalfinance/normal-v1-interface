import React, { useState, useRef, useEffect } from 'react';
import { Typography, Box, CardProps, Button, InputBase, Stack } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Token } from '@/types/token';
import { fCurrency } from '@/utils/format-number';
import { Iconify } from '../iconify';
import PickToken from './pick-token';
import { SwapFeeInfo } from '@/types/swap-fee-info';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { convertCoinToFiat, convertFiatToCoin, getMaxAmount } from '@/utils/conversion-helpers';

interface BuyCardProps extends CardProps {
  tokensList?: Token[];
}

const BuyCard: React.FC<BuyCardProps> = ({ tokensList = [], ...other }) => {
  const theme = useTheme();

  return (
    <Stack sx={{ gap: '2px' }}>
      <Stack sx={{ gap: '1px' }}>
        <Stack
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '278px',
            padding: theme.spacing(2),
            alignItems: 'flex-start',
            borderRadius: '8px 8px 0 0',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ height: '82px' }}>
            <Typography variant="body2" sx={{ color: theme.palette.text.primary }}>
              You're buying
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default BuyCard;
