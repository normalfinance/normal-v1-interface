'use client';

import type { NativeToken } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { useFormContext } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { fRawPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import { useTheme } from '@mui/material/styles';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Box,
  Stack,
  Dialog,
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

import type { NewIndexSchemaType } from './new-index-form';

type NewIndexSubmissionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  tokenSymbol: NativeToken;
};

export default function NewIndexSubmissionDialog({
  open,
  onClose,
  onSubmit,
  tokenSymbol,
}: NewIndexSubmissionDialogProps) {
  const { t } = useTranslate();
  const { watch, formState } = useFormContext<NewIndexSchemaType>();
  const { isSubmitting } = formState;

  const coinList = watch('indexCoinList');
  const allFields = watch();

  const theme = useTheme();

  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const avatarValue = allFields.avatarUrl;

    if (!avatarValue) {
      setAvatarPreview('');
    } else if (typeof avatarValue === 'string') {
      setAvatarPreview(avatarValue);
    } else if (avatarValue instanceof File) {
      const objectUrl = URL.createObjectURL(avatarValue);
      setAvatarPreview(objectUrl);
      cleanup = () => URL.revokeObjectURL(objectUrl);
    } else {
      setAvatarPreview('');
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [allFields.avatarUrl]);

  const handleSubmitClick = async () => {
    try {
      await onSubmit();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '600px',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div" color="text.primary">
            {t('createIndex.confirmSubmission', 'Confirm Submission')}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ width: '100%' }}>
        <Typography variant="body2">{allFields.indexName}</Typography>

        <Stack
          spacing={3}
          sx={{
            px: 0,
            py: 2,
            zIndex: 1,
            position: 'relative',
            bgcolor: 'background.paper',
            width: '100%',
          }}
        >
          {coinList.map((coin) => (
            <Box
              key={coin.id}
              sx={{
                gap: 2,
                display: 'flex',
                alignItems: 'center',
                typography: 'subtitle2',
                width: '100%',
              }}
            >
              <Box sx={{ width: 36, height: 36 }} component="img" src={coin.url} alt={coin.name} />

              <Stack flex="1 1 auto" textAlign="left">
                <div>{coin.name}</div>
                <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                  {coin.shortName}
                </Box>
              </Stack>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Stack flex="1 1 auto" textAlign="right">
                  <div>{fRawPercent(coin.indexPercentage)}</div>
                  <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                    {fCurrencyTwoDecimals(coin.price)}
                  </Box>
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>

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
                  {t('common.showLess', 'Show less')}
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
                      {t('createIndex.review.indexName', 'Index Name')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {allFields.indexName}
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
                      {t('createIndex.review.indexSymbol', 'Index Symbol')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {allFields.indexSymbol}
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
                      {t('createIndex.review.weightingMethod', 'Weighting Method')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {allFields.weightingMethod}
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
                      {t('createIndex.review.initialPrice', 'Initial Price')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {fCurrencyTwoDecimals(allFields.initialPrice)}
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
                      {t('createIndex.review.initialDeposit', 'Initial Deposit')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {allFields.initialDeposit} {tokenSymbol}
                  </Typography>
                </Box>

                {!!avatarPreview && (
                  <Box sx={{ my: 2, textAlign: 'center' }}>
                    <Box
                      sx={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                      component="img"
                      src={avatarPreview}
                      alt={t('createIndex.avatar.previewAlt', 'Avatar Preview')}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions sx={{ width: '100%' }}>
        <LoadingButton
          fullWidth
          loading={isSubmitting}
          variant="soft"
          color="success"
          onClick={handleSubmitClick}
        >
          {t('common.submit', 'Submit')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
