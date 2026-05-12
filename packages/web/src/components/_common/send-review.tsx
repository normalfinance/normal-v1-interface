'use client';

import type { Token } from '@normalfinance/types';

import { useSendToken } from '@/hooks';
import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';

import { LoadingButton } from '@mui/lab';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  Dialog,
  Divider,
  Tooltip,
  Checkbox,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from '../template/iconify';

// ----------------------------------------------------------------------

const NETWORK_FEE_XLM = 0.0002;

export interface SendReviewProps {
  open: boolean;
  onClose: () => void;
  sendToken: Token;
  tokenValue: number;
  fiatValue: number;
  address: string;
  memo: string;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-8)}`;
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

  const { loading, send } = useSendToken();
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const feeFiat = NETWORK_FEE_XLM * (sendToken.symbol === 'XLM' ? sendToken.price : 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onSubmit = async () => {
    if (!tokenValue || !address) return;

    const txHash = await send({
      destination: address,
      token: sendToken,
      amount: tokenValue.toFixed(7),
      memo,
    });

    if (txHash) {
      enqueueSnackbar(t('Transaction sent successfully'), { variant: 'success' });
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ px: 3, pt: 3, pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{t('Confirm transaction')}</Typography>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
        <Stack spacing={2}>
          {/* Amount hero */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 2.5,
              borderRadius: 2.5,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              gap: 1,
            }}
          >
            <Box
              component="img"
              src={sendToken.icon ?? getCryptoIconUrl(sendToken.symbol)}
              sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
            />
            <Typography variant="h4" fontWeight={700}>
              {tokenValue.toFixed(4)} {sendToken.symbol}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ≈ {fCurrency(fiatValue)}
            </Typography>
          </Box>

          {/* Details */}
          <Box
            sx={{
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              overflow: 'hidden',
            }}
          >
            {/* To */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {t('To')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {truncateAddress(address)}
                </Typography>
                <Tooltip title={copied ? t('Copied!') : t('Copy address')}>
                  <IconButton size="small" onClick={handleCopy}>
                    <Iconify
                      icon={copied ? 'eva:checkmark-circle-2-outline' : 'eva:copy-outline'}
                      width={16}
                      sx={{ color: copied ? 'success.main' : 'text.secondary' }}
                    />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {memo && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    {t('Memo')}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {memo}
                  </Typography>
                </Box>
              </>
            )}

            <Divider />

            {/* Network fee */}
            <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {t('Network fee')}
                </Typography>
                <Tooltip title={t('Fixed Stellar network fee paid to validators.')}>
                  <Iconify icon="eva:info-outline" width={13} sx={{ color: 'text.disabled', cursor: 'help' }} />
                </Tooltip>
              </Box>
              <Typography variant="caption" fontWeight={600}>
                {NETWORK_FEE_XLM} XLM{' '}
                <Box component="span" color="text.secondary" fontWeight={400}>
                  ({fCurrency(feeFiat)})
                </Box>
              </Typography>
            </Box>

            <Divider />

            {/* Total */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {t('Total deducted')}
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                {sendToken.symbol === 'XLM' ? (
                  <Typography variant="body2" fontWeight={700}>
                    {(tokenValue + NETWORK_FEE_XLM).toFixed(4)} XLM
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2" fontWeight={700}>
                      {tokenValue.toFixed(4)} {sendToken.symbol}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      + {NETWORK_FEE_XLM} XLM {t('fee')}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* Warning + confirm */}
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.warning.main, 0.06),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Iconify icon="eva:alert-triangle-outline" width={16} sx={{ color: 'warning.main', flexShrink: 0, mt: 0.1 }} />
              <Typography variant="caption" color="text.secondary">
                {t('Blockchain transactions are irreversible. Double-check the destination address — funds sent to the wrong address cannot be recovered.')}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  size="small"
                  sx={{ py: 0 }}
                />
              }
              label={
                <Typography variant="caption" color="text.primary">
                  {t('I have verified the address and amount')}
                </Typography>
              }
              sx={{ m: 0, alignItems: 'flex-start' }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <LoadingButton
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          onClick={onSubmit}
          loading={loading}
          disabled={!confirmed}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {t('Send')} {tokenValue.toFixed(4)} {sendToken.symbol}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default SendReview;
