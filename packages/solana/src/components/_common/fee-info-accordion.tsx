// fee-info-accordion.tsx
import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Iconify } from '../iconify';
import { fCurrencyTwoDecimals, fRawPercent } from '@/utils/format-number';
import { Token } from '@/types/token';
import { SwapFeeInfo } from '@/types/swap-fee-info';

interface FeeInfoAccordionProps {
  conversionText: string;
  insufficientBalance: boolean;
  sellToken?: Token;
  swapFeeInfo?: SwapFeeInfo;
  sellFiatValue: number;
}

const FeeInfoAccordion: React.FC<FeeInfoAccordionProps> = ({
  conversionText,
  insufficientBalance,
  sellToken,
  swapFeeInfo,
  sellFiatValue,
}) => {
  const theme = useTheme();

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
                Not enough {sellToken.shortname} to swap
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
                  Fee <Box component="span">({swapFeeInfo?.feePercentage}%)</Box>
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
                {fCurrencyTwoDecimals(sellFiatValue * ((swapFeeInfo?.feePercentage ?? 0) / 100))}
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
                  Network cost
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
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {fCurrencyTwoDecimals(swapFeeInfo?.networkCost)}
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
                  Price impact
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
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {fRawPercent(swapFeeInfo?.priceImpact)}
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
                  Max slippage
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
                  color: theme.palette.text.secondary,
                  fontSize: '12px',
                }}
              >
                {fRawPercent(swapFeeInfo?.maxSlippage)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FeeInfoAccordion;
