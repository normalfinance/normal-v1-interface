'use client';

import type { Token } from '@normalfinance/types';

import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import React, { useMemo, useState } from 'react';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';

import { LoadingButton } from '@mui/lab';
import {
  Box,
  Stack,
  Dialog,
  Tooltip,
  Checkbox,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from '../template/iconify';

import type { SendParams } from './send-adapters';

// ----------------------------------------------------------------------

const STELLAR_NETWORK_FEE_XLM = 0.0002;

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-8)}`;
}

export interface SendReviewProps {
  open: boolean;
  onClose: () => void;
  sendToken: Token;
  tokenValue: number;
  fiatValue: number;
  address: string;
  memo: string;
  /** Adapter-provided send function — handles both Stellar and Bitcoin */
  sendFn: (params: SendParams) => Promise<string>;
  /** Estimated BTC miner fee in satoshis — only set when sending Bitcoin */
  estimatedFeeSat?: number;
  /** Called on successful BTC send instead of the default snackbar+close flow */
  onBtcSendSuccess?: (txid: string) => void;
}

const SendReview: React.FC<SendReviewProps> = ({
  open,
  onClose,
  sendToken,
  tokenValue,
  fiatValue,
  address,
  memo,
  sendFn,
  estimatedFeeSat,
  onBtcSendSuccess,
}) => {
  const { t } = useTranslate('auto');
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isBtc = sendToken.contract === '__btc__';

  const tokens = usePersistStore((s) => s.tokenState.tokens);
  const xlmPrice = BigNumber(tokens.find((tok) => tok.symbol === 'XLM')?.price ?? 0);
  const stellarFeeFiat = BigNumber(STELLAR_NETWORK_FEE_XLM).multipliedBy(xlmPrice);

  const btcFeeFiat = useMemo(() => {
    if (!isBtc || estimatedFeeSat == null) return null;
    const feeBtc = estimatedFeeSat / 1e8;
    return BigNumber(feeBtc).multipliedBy(sendToken.price);
  }, [isBtc, estimatedFeeSat, sendToken.price]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onSubmit = async () => {
    if (!tokenValue || !address) return;
    setLoading(true);
    try {
      const txHash = await sendFn({
        token: sendToken,
        amount: tokenValue.toFixed(isBtc ? 8 : 7),
        destination: address,
        memo,
      });
      if (txHash) {
        if (isBtc && onBtcSendSuccess) {
          onBtcSendSuccess(txHash);
        } else {
          enqueueSnackbar(t('Transaction sent successfully'), { variant: 'success' });
          onClose();
        }
      }
    } catch (err: any) {
      enqueueSnackbar(err?.message ?? t('Transaction failed'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogTitle sx={{ px: '22px', pt: '22px', pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
            {t('Confirm transaction')}
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              width: 28,
              height: 28,
              borderRadius: '8px',
              border: 'none',
              bgcolor: 'rgba(10,10,15,0.06)',
              color: '#0A0A0F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 150ms ease',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: '22px', pt: '16px', pb: '4px' }}>
        <Stack spacing={1.5}>
          {/* Amount hero */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: '20px',
              borderRadius: '16px',
              bgcolor: '#FAFAFB',
              border: '1px solid rgba(10,10,15,0.08)',
              gap: '8px',
            }}
          >
            <Box
              component="img"
              src={sendToken.icon ?? getCryptoIconUrl(sendToken.symbol)}
              sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
            />
            <Typography
              sx={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0A0A0F',
                letterSpacing: '-0.02em',
                fontFamily: '"Geist Mono", "Courier New", monospace',
              }}
            >
              {BigNumber(tokenValue).toFixed(isBtc ? 6 : 4, BigNumber.ROUND_DOWN)} {sendToken.symbol}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)' }}>
              ≈ {fCurrency(fiatValue)}
            </Typography>
          </Box>

          {/* Details */}
          <Box sx={{ borderRadius: '16px', border: '1px solid rgba(10,10,15,0.08)', overflow: 'hidden' }}>
            {/* To */}
            <Box sx={{ px: '16px', py: '12px' }}>
              <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '6px' }}>
                {t('To')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <Typography sx={{ fontSize: '13px', color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace', wordBreak: 'break-all' }}>
                  {truncateAddress(address)}
                </Typography>
                <Tooltip title={copied ? t('Copied!') : t('Copy address')}>
                  <Box
                    component="button"
                    onClick={handleCopy}
                    sx={{
                      width: 28,
                      height: 28,
                      border: 'none',
                      bgcolor: 'rgba(10,10,15,0.06)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      color: copied ? 'success.main' : 'rgba(10,10,15,0.5)',
                      transition: 'background 150ms ease',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                    }}
                  >
                    <Iconify icon={copied ? 'eva:checkmark-circle-2-outline' : 'eva:copy-outline'} width={15} />
                  </Box>
                </Tooltip>
              </Box>
            </Box>

            {memo && (
              <>
                <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />
                <Box sx={{ px: '16px', py: '12px' }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '6px' }}>
                    {t('Memo')}
                  </Typography>
                  <Typography sx={{ fontSize: '13px', color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                    {memo}
                  </Typography>
                </Box>
              </>
            )}

            <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />

            {/* Network fee */}
            <Box sx={{ px: '16px', py: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                  {t('Network fee')}
                </Typography>
                <Tooltip
                  title={
                    isBtc
                      ? t('Estimated Bitcoin miner fee. Actual fee is set at signing time based on current mempool conditions.')
                      : t('Fixed Stellar network fee paid to validators.')
                  }
                >
                  <Box sx={{ display: 'flex', color: 'rgba(10,10,15,0.3)', cursor: 'help' }}>
                    <Iconify icon="eva:info-outline" width={13} />
                  </Box>
                </Tooltip>
              </Box>
              {isBtc ? (
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                  {estimatedFeeSat != null ? `~${estimatedFeeSat.toLocaleString()} sat` : '—'}{' '}
                  {btcFeeFiat && (
                    <Box component="span" sx={{ color: 'rgba(10,10,15,0.45)', fontWeight: 400 }}>
                      ({fCurrency(btcFeeFiat)})
                    </Box>
                  )}
                </Typography>
              ) : (
                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                  {STELLAR_NETWORK_FEE_XLM} XLM{' '}
                  <Box component="span" sx={{ color: 'rgba(10,10,15,0.45)', fontWeight: 400 }}>
                    ({fCurrency(stellarFeeFiat)})
                  </Box>
                </Typography>
              )}
            </Box>

            <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />

            {/* Total deducted */}
            <Box sx={{ px: '16px', py: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FAFAFB' }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F' }}>
                {t('Total deducted')}
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                {isBtc ? (
                  <>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                      {BigNumber(tokenValue).toFixed(6, BigNumber.ROUND_DOWN)} BTC
                    </Typography>
                    {estimatedFeeSat != null && (
                      <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.45)' }}>
                        + ~{estimatedFeeSat.toLocaleString()} sat {t('fee')}
                      </Typography>
                    )}
                  </>
                ) : sendToken.symbol === 'XLM' ? (
                  <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                    {BigNumber(tokenValue).plus(STELLAR_NETWORK_FEE_XLM).toFixed(4, BigNumber.ROUND_DOWN)} XLM
                  </Typography>
                ) : (
                  <>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0A0A0F', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                      {BigNumber(tokenValue).toFixed(4, BigNumber.ROUND_DOWN)} {sendToken.symbol}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.45)' }}>
                      + {STELLAR_NETWORK_FEE_XLM} XLM {t('fee')}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* Warning + confirm */}
          <Box
            sx={{
              px: '14px',
              py: '12px',
              borderRadius: '14px',
              bgcolor: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <Box sx={{ display: 'flex', gap: '8px', mb: '10px' }}>
              <Iconify icon="eva:alert-triangle-outline" width={16} sx={{ color: 'warning.main', flexShrink: 0, mt: '1px' }} />
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.6)', lineHeight: 1.55 }}>
                {isBtc
                  ? t('Bitcoin transactions are irreversible. Your device biometrics will be required to authorise the transaction. Double-check the destination address.')
                  : t('Blockchain transactions are irreversible. Double-check the destination address — funds sent to the wrong address cannot be recovered.')}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  size="small"
                  sx={{ py: 0, color: 'rgba(10,10,15,0.3)', '&.Mui-checked': { color: '#0A0A0F' } }}
                />
              }
              label={
                <Typography sx={{ fontSize: '12px', color: '#0A0A0F' }}>
                  {t('I have verified the address and amount')}
                </Typography>
              }
              sx={{ m: 0, alignItems: 'flex-start' }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: '22px', pb: '22px', pt: '16px' }}>
        <LoadingButton
          fullWidth
          variant="contained"
          size="large"
          onClick={onSubmit}
          loading={loading}
          disabled={!confirmed}
          sx={{
            borderRadius: '12px',
            bgcolor: '#0A0A0F',
            fontWeight: 700,
            fontSize: '15px',
            py: '13px',
            textTransform: 'none',
            letterSpacing: '-0.01em',
            '&:hover': { bgcolor: '#1a1a25' },
            '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
          }}
        >
          {isBtc ? t('Send with passkey') : (
            <>{t('Send')} {BigNumber(tokenValue).toFixed(4, BigNumber.ROUND_DOWN)} {sendToken.symbol}</>
          )}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default SendReview;
