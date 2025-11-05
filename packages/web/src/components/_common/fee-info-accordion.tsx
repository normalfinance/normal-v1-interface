import type { Token } from '@normalfinance/types';

// fee-info-accordion.tsx
import React from 'react';
import { useTranslate } from '@/locales';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Chip,
  Accordion,
  Typography,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';

import { Iconify } from '../template/iconify';

interface FeeInfoAccordionProps {
  conversionText: string;
  insufficientBalance: boolean;
  sellToken?: Token;
  poolFee: number;
  networkCost: number;
  priceImpact: number;
  maxSlippage: number;
  sellFiatValue: number;
}

const FeeInfoAccordion: React.FC<FeeInfoAccordionProps> = ({
  conversionText,
  insufficientBalance,
  sellToken,
  poolFee,
  networkCost,
  priceImpact,
  maxSlippage,
  sellFiatValue,
}) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Accordion
      defaultExpanded
      disableGutters
      sx={{
        mt: 0,
        backgroundColor: 'transparent !important',
        boxShadow: 'none !important',
        width: '100%',
        padding: '0px !important',
        '::before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={
          <Iconify
            icon="eva:arrow-ios-upward-fill"
            width={14}
            sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
          />
        }
        aria-controls="panel3-content"
        id="panel3-header"
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.secondary,
            fontSize: '12px',
          }}
        >
          {conversionText}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0, px: 1 }}>
        <Box
          sx={{
            mt: 0,
            px: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
          }}
        >
          {insufficientBalance && sellToken && (
            <Box
              sx={{
                p: 2,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.grey[500], 0.08),
                borderRadius: '8px',
              }}
            >
              <Iconify
                icon="solar:danger-triangle-bold"
                width={14}
                sx={{ color: theme.palette.text.secondary }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {t('Not enough')}&nbsp;
                {sellToken.symbol}&nbsp;
                {t('to swap')}
              </Typography>
            </Box>
          )}
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              px: 1,
            }}
          >
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    fontSize: '12px',
                  }}
                >
                  {t('Fee')}&nbsp;
                  <Box component="span">
                    {t('(')}
                    {fPercent(poolFee / 100)}
                    {t(')')}
                  </Box>
                </Typography>
                <Iconify
                  icon="solar:info-circle-bold"
                  width={14}
                  sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
                />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                  fontSize: '12px',
                }}
              >
                {fCurrencyTwoDecimals(sellFiatValue * (poolFee / 10000))}
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    fontSize: '12px',
                  }}
                >
                  {t('Network cost')}
                </Typography>
                <Iconify
                  icon="solar:info-circle-bold"
                  width={14}
                  sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
                />
              </Box>
              {/* <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {fCurrencyTwoDecimals(networkCost)}
              </Typography> */}
              <Chip label="Coming soon" color="info" size="small" />
            </Box>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    fontSize: '12px',
                  }}
                >
                  {t('Price impact')}
                </Typography>
                <Iconify
                  icon="solar:info-circle-bold"
                  width={14}
                  sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
                />
              </Box>
              {/* <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {fRawPercent(priceImpact)}
              </Typography> */}
              <Chip label="Coming soon" color="info" size="small" />
            </Box>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    fontSize: '12px',
                  }}
                >
                  {t('Max slippage')}
                </Typography>
                <Iconify
                  icon="solar:info-circle-bold"
                  width={14}
                  sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
                />
              </Box>
              {/* <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {fRawPercent(maxSlippage)}
              </Typography> */}
              <Chip label="Coming soon" color="info" size="small" />
            </Box>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FeeInfoAccordion;
