'use client';

import { useTranslate } from '@/locales';
import { useFormContext } from 'react-hook-form';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';
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
};

export default function NewIndexSubmissionDialog({
  open,
  onClose,
  onSubmit,
}: NewIndexSubmissionDialogProps) {
  const { watch, formState } = useFormContext<NewIndexSchemaType>();
  const { isSubmitting } = formState;
  const { t } = useTranslate('auto');

  const watchComponents = watch('components');
  const allFields = watch();

  const theme = useTheme();

  const {
    tokenState: { tokensByAddress },
  } = usePersistStore();

  // Submit handler for the button
  const handleSubmitClick = async () => {
    // If all good, call the parent's onSubmit
    try {
      await onSubmit();
      onClose();
    } catch (error) {
      // If there's an API error or something, handle here
      console.error(error);
    }
  };

  // Build error messages if fields are invalid

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
            {t('Confirm Submission')}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ width: '100%' }}>
        <Typography variant="body2">{allFields.name}</Typography>

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
          {watchComponents.map((component) => {
            const token = tokensByAddress[component.contract];

            return (
              <Box
                key={component.contract}
                sx={{
                  gap: 2,
                  display: 'flex',
                  alignItems: 'center',
                  typography: 'subtitle2',
                  width: '100%',
                }}
              >
                <Box
                  sx={{ width: 36, height: 36 }}
                  component="img"
                  src={token.icon ?? getCryptoIconUrl(token.symbol)}
                  alt={token.name}
                />

                <Stack flex="1 1 auto" textAlign="left">
                  <div>{token.name}</div>
                  <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                    {token.symbol}
                  </Box>
                </Stack>

                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
                >
                  <Stack flex="1 1 auto" textAlign="right">
                    <div>{fRawPercent(component.indexPercentage)}</div>
                    <Box component="span" sx={{ typography: 'caption', color: 'text.disabled' }}>
                      {fCurrencyTwoDecimals(token.price)}
                    </Box>
                  </Stack>
                </Box>
              </Box>
            );
          })}
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
                      {t('Name')}
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
                    {allFields.name}
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
                      {t('Symbol')}
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
                    {allFields.symbol}
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
                      {t('Weighting Method')}
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
                      {t('Initial Price')}
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
          {t('Create')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
