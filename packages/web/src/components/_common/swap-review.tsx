import type { Token } from '@normalfinance/types';

import React from 'react';
import { useTranslate } from '@/locales';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import { useTheme } from '@mui/material/styles';
import {
  Box,
  Dialog,
  Button,
  Accordion,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';

import { Iconify } from '../template/iconify';

export interface SwapReviewProps {
  open: boolean;
  onClose: () => void;
  tradeDirection: 'buy' | 'sell';
  selectedToken?: Token;
  fiatAmount: string;
  feePercentage: number;
  sellFiatValue: number;
  onSubmit: () => void;
}

const SwapReview: React.FC<SwapReviewProps> = ({
  open,
  onClose,
  tradeDirection,
  selectedToken,
  fiatAmount,
  feePercentage,
  sellFiatValue,
  onSubmit,
}) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '400px',
            maxHeight: 'auto',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" color="text.primary">
            {tradeDirection === 'buy' ? t("You're buying") : t("You're selling")}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '2px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: '20px',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h4">
                  {fiatAmount} {t('USD worth of')} {selectedToken?.symbol}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: 'var(--components-nav-item-size, 14px)',
                    fontStyle: 'normal',
                    fontWeight: 'var(--components-nav-item-weight, 500)',
                    lineHeight: 'var(--components-nav-item-line-height, 22px)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'clip',
                    minWidth: 0,
                  }}
                >
                  {`${fCurrencyTwoDecimals(sellFiatValue)}`}
                </Typography>
              </Box>

              <Box
                component="img"
                src={
                  selectedToken
                    ? (selectedToken.icon ?? getCryptoIconUrl(selectedToken.symbol))
                    : ''
                }
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          </Box>
          <Accordion
            defaultExpanded
            disableGutters
            sx={{
              mt: 0,
              backgroundColor: 'transparent !important',
              boxShadow: 'none !important',
              width: '100%',
              padding: '0px !important',
              '::before': {
                display: 'none',
              },
            }}
          >
            <AccordionSummary
              aria-controls="panel3-content"
              id="panel3-header"
              sx={{
                padding: '0 !important',
                minHeight: 0,
                '&.Mui-expanded': {
                  minHeight: 0,
                },
                '& .MuiAccordionSummary-content': {
                  margin: 0,
                  padding: 0,
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    bgcolor: theme.palette.text.disabled,
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mx: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.secondary,
                      fontSize: '12px',
                    }}
                  >
                    {t('Show less')}
                  </Typography>
                  <Iconify
                    icon="carbon:chevron-sort"
                    width={14}
                    sx={{ color: theme.palette.text.secondary, ml: 0.5 }}
                  />
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    height: '1px',
                    bgcolor: theme.palette.text.disabled,
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, px: 0, pt: 2 }}>
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
                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    px: 0,
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
                        {t('Total Fee')}&nbsp;
                        <Box component="span">
                          {t('(')}
                          {fPercent(feePercentage / 100)}
                          {t(')')}
                        </Box>{' '}
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
                      {fCurrencyTwoDecimals((sellFiatValue * feePercentage) / 10000)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={onSubmit}
            sx={{
              backgroundColor: 'rgba(148,123,255,0.29)',
              color: '#6E4BFF',
              '&:hover': {
                backgroundColor: 'rgba(148,123,255,0.20)',
              },
              borderRadius: '20px',
            }}
          >
            {tradeDirection === 'buy' ? t('Buy') : t('Sell')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SwapReview;
