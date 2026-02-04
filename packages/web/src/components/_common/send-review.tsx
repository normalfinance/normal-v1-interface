import type { Token } from '@normalfinance/types';

import { useSendToken } from '@/hooks';
import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { getCryptoIconUrl } from '@normalfinance/utils';

import { LoadingButton } from '@mui/lab';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Alert,
  alpha,
  Dialog,
  Checkbox,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import { Iconify } from '../template/iconify';

export interface SendReviewProps {
  open: boolean;
  onClose: () => void;
  sendToken: Token;
  tokenValue: number;
  fiatValue: number;
  address: string;
  memo: string;
}

const SendReview: React.FC<SendReviewProps> = ({
  open,
  onClose,
  sendToken,
  tokenValue,
  fiatValue,
  address,
  memo,
}) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const { loading, error, setError, send } = useSendToken();

  const [approved, setApproved] = useState<boolean>(false);

  const onSubmit = async () => {
    if (!sendToken || !tokenValue || !address) {
      setError(
        !sendToken
          ? 'No asset selected'
          : !tokenValue
            ? 'Amount not available'
            : 'Destination not found'
      );
      return;
    }

    try {
      const txHash = await send({
        destination: address,
        token: sendToken,
        amount: tokenValue.toFixed(7),
        memo,
      });

      if (txHash) {
        enqueueSnackbar('Transaction successful', { variant: 'success' });
      } else {
        enqueueSnackbar('Failed to send asset', { variant: 'error' });
      }
      onClose();
    } catch (e: any) {
      setError('Error during transfer');
    }
  };

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
            {t('Review withdrawal')}
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
            <Typography variant="caption" color="text.secondary" mb={1}>
              {t("You're sending")}
            </Typography>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h4">
                  {t('$')}
                  {fiatValue}
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
                  {tokenValue.toFixed(4)} {sendToken?.symbol}
                </Typography>
              </Box>

              <Box
                component="img"
                src={sendToken ? getCryptoIconUrl(sendToken.symbol) : ''}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" mb={2}>
              {t('To')}
            </Typography>
            <Box
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>
                  {address}
                </Typography>
              </Box>
            </Box>
            {memo && (
              <>
                <Typography variant="caption" color="text.secondary" mb={2}>
                  {t('With memo')}
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: 'break-all', whiteSpace: 'normal' }}
                    >
                      {memo}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t('Please review all information - mistakes cannot be reversed!')}
            </Alert>
            <Checkbox
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              data-testid="send-review-checkbox"
            />
            <Typography variant="body2" color="text.secondary">
              {t("I've reviewed this transaction")}
            </Typography>
          </Box>

          <Box sx={{ width: '100%', height: '1px', bgcolor: theme.palette.text.disabled }} />

          {/* Display send error if exists */}
          {error && (
            <Box
              sx={{
                padding: theme.spacing(1.5),
                backgroundColor: alpha(theme.palette.error.main, 0.1),
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                borderRadius: '12px',
                mt: 2,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.error.main,
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                {error.toString()}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0, width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <LoadingButton
            fullWidth
            variant="soft"
            color="success"
            size="large"
            onClick={onSubmit}
            loading={loading}
            disabled={!approved}
          >
            {t('Send')}
          </LoadingButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SendReview;
