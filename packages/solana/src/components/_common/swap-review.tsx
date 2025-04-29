import type { Token } from '@/types/token';

import React from 'react';
import { getSwapConversionText } from '@/utils/conversion-helpers';
import { fRawPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

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

import { Iconify } from '../iconify';

export interface SwapReviewProps {
  open: boolean;
  onSubmit: () => void;
  onClose: () => void;
  sellToken?: Token;
  buyToken?: Token;
  sellAmount: string;
  buyAmount: number;
  feePercentage: number;
  networkCost: number;
  priceImpact: number;
  maxSlippage: number;
  sellFiatValue: number;
}

const SwapReview: React.FC<SwapReviewProps> = ({
  open,
  onSubmit,
  onClose,
  sellToken,
  buyToken,
  sellAmount,
  buyAmount,
  feePercentage,
  networkCost,
  priceImpact,
  maxSlippage,
  sellFiatValue,
}) => {
  const theme = useTheme();

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
            You're swapping
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
            borderRadius: '4px',
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
                  {Number(sellAmount).toFixed(6)} {sellToken?.shortname}
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
                src={sellToken?.url}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </Box>

            <Iconify
              width={24}
              icon="eva:arrow-downward-fill"
              sx={{
                my: 2,
                color: theme.palette.text.primary,
              }}
            />

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
                  {buyAmount.toFixed(6)} {buyToken?.shortname}
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
                  {buyToken ? fCurrencyTwoDecimals(buyToken.pricestatus * buyAmount) : ''}
                </Typography>
              </Box>

              <Box
                component="img"
                src={buyToken?.url}
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
                    Show less
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
                        Fee <Box component="span">({feePercentage}%)</Box>{' '}
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
                      {fCurrencyTwoDecimals(sellFiatValue * ((feePercentage ?? 0) / 100))}
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
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                      }}
                    >
                      {fCurrencyTwoDecimals(networkCost)}
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
                        Rate
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
                      {sellToken && buyToken ? getSwapConversionText(sellToken, buyToken) : ''}
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
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                      }}
                    >
                      {fRawPercent(priceImpact)}
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
                        color: theme.palette.text.primary,
                        fontSize: '12px',
                      }}
                    >
                      {fRawPercent(maxSlippage)}
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
          <Button fullWidth variant="soft" color="success" size="large" onClick={onSubmit}>
            Swap
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SwapReview;
