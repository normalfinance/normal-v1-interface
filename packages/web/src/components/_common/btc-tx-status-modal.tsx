'use client';

import useSWR from 'swr';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { usePersistStore } from '@normalfinance/state';
import React, { useRef, useState, useEffect } from 'react';
import { fCurrency } from '@/utils/format-number';

import {
  Box,
  Stack,
  Button,
  Dialog,
  Tooltip,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '../template/iconify';

// ----------------------------------------------------------------------

interface MempoolTx {
  txid: string;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number;
  };
}

export interface BtcTxStatusModalProps {
  open: boolean;
  onClose: () => void;
  txid: string;
  amountBtc: number;
  destination: string;
  estimatedFeeSat?: number;
}

function truncate(str: string, head = 8, tail = 8): string {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export function BtcTxStatusModal({
  open,
  onClose,
  txid,
  amountBtc,
  destination,
  estimatedFeeSat,
}: BtcTxStatusModalProps) {
  const { t } = useTranslate('auto');

  const [copied, setCopied] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [txConfirmed, setTxConfirmed] = useState(false);
  const wasConfirmedRef = useRef(false);

  const tokens = usePersistStore((s) => s.tokenState.tokens);
  const btcPrice = BigNumber(tokens.find((tok) => tok.symbol === 'BTC')?.price ?? 0);

  const { data: txData } = useSWR<MempoolTx>(
    open && txid && !txConfirmed ? `btc-tx-status-${txid}` : null,
    () =>
      fetch(`https://mempool.space/api/tx/${txid}`).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MempoolTx>;
      }),
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  useEffect(() => {
    if (txData?.status?.confirmed && !wasConfirmedRef.current) {
      wasConfirmedRef.current = true;
      setTxConfirmed(true);
      setJustConfirmed(true);
      setTimeout(() => setJustConfirmed(false), 4000);
    }
  }, [txData]);

  const isConfirmed = txConfirmed || txData?.status?.confirmed === true;
  const blockHeight = txData?.status?.block_height;
  const actualFeeSat = txData?.fee ?? estimatedFeeSat;
  const feeFiat =
    actualFeeSat != null && btcPrice.gt(0)
      ? BigNumber(actualFeeSat / 1e8).multipliedBy(btcPrice)
      : null;
  const amountFiat = btcPrice.gt(0) ? BigNumber(amountBtc).multipliedBy(btcPrice) : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(txid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
          <Typography
            sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}
          >
            {t('Transaction sent')}
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

      <DialogContent sx={{ px: '22px', pt: '20px', pb: '4px' }}>
        <Stack spacing={1.5}>
          {/* Status hero */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: '24px',
              borderRadius: '16px',
              bgcolor: isConfirmed ? 'rgba(26,179,125,0.06)' : '#FAFAFB',
              border: '1px solid',
              borderColor: isConfirmed ? 'rgba(26,179,125,0.2)' : 'rgba(10,10,15,0.08)',
              transition: 'background 400ms ease, border-color 400ms ease',
              gap: '10px',
            }}
          >
            {isConfirmed ? (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'rgba(26,179,125,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify
                  icon="eva:checkmark-circle-2-fill"
                  width={28}
                  sx={{ color: '#1AB37D' }}
                />
              </Box>
            ) : (
              <CircularProgress size={36} thickness={3} sx={{ color: 'rgba(10,10,15,0.3)' }} />
            )}

            <Typography
              sx={{
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                color: isConfirmed ? '#1AB37D' : '#0A0A0F',
                transition: 'color 400ms ease',
              }}
            >
              {isConfirmed
                ? t('Transaction confirmed')
                : t('Confirming on Bitcoin network…')}
            </Typography>

            {!isConfirmed && (
              <Typography
                sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', textAlign: 'center' }}
              >
                {t('Bitcoin confirmations take ~10 minutes on average')}
              </Typography>
            )}

            {isConfirmed && blockHeight && (
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                {t('Block')} {blockHeight.toLocaleString()}
              </Typography>
            )}
          </Box>

          {/* Confirmed notification flash */}
          {justConfirmed && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                px: '14px',
                py: '10px',
                borderRadius: '12px',
                bgcolor: 'rgba(26,179,125,0.1)',
                border: '1px solid rgba(26,179,125,0.25)',
              }}
            >
              <Iconify
                icon="eva:checkmark-circle-2-fill"
                width={16}
                sx={{ color: '#1AB37D', flexShrink: 0 }}
              />
              <Typography sx={{ fontSize: '13px', color: '#0A6649', fontWeight: 500 }}>
                {t('Your Bitcoin transaction has been confirmed!')}
              </Typography>
            </Box>
          )}

          {/* Details card */}
          <Box
            sx={{ borderRadius: '16px', border: '1px solid rgba(10,10,15,0.08)', overflow: 'hidden' }}
          >
            {/* Amount */}
            <Box
              sx={{
                px: '16px',
                py: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Typography
                sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', fontWeight: 500 }}
              >
                {t('Amount')}
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  sx={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0A0A0F',
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                  }}
                >
                  {BigNumber(amountBtc).toFixed(8)} BTC
                </Typography>
                {amountFiat && (
                  <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.45)' }}>
                    ≈ {fCurrency(amountFiat)}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />

            {/* To */}
            <Box
              sx={{
                px: '16px',
                py: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  color: 'rgba(10,10,15,0.45)',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {t('To')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '12px',
                  color: '#0A0A0F',
                  fontFamily: '"Geist Mono", "Courier New", monospace',
                  wordBreak: 'break-all',
                  textAlign: 'right',
                }}
              >
                {truncate(destination)}
              </Typography>
            </Box>

            {actualFeeSat != null && (
              <>
                <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />
                <Box
                  sx={{
                    px: '16px',
                    py: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Typography
                    sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', fontWeight: 500 }}
                  >
                    {t('Miner fee')}
                  </Typography>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      sx={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#0A0A0F',
                        fontFamily: '"Geist Mono", "Courier New", monospace',
                      }}
                    >
                      {actualFeeSat.toLocaleString()} sat
                    </Typography>
                    {feeFiat && (
                      <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.45)' }}>
                        ≈ {fCurrency(feeFiat)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </>
            )}

            <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)' }} />

            {/* Transaction ID */}
            <Box
              sx={{
                px: '16px',
                py: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Typography
                sx={{
                  fontSize: '12px',
                  color: 'rgba(10,10,15,0.45)',
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {t('Txid')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Typography
                  sx={{
                    fontSize: '11px',
                    color: '#0A0A0F',
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                  }}
                >
                  {truncate(txid, 6, 6)}
                </Typography>
                <Tooltip title={copied ? t('Copied!') : t('Copy txid')}>
                  <Box
                    component="button"
                    onClick={handleCopy}
                    sx={{
                      width: 24,
                      height: 24,
                      border: 'none',
                      bgcolor: 'rgba(10,10,15,0.06)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      color: copied ? 'success.main' : 'rgba(10,10,15,0.5)',
                      fontFamily: 'inherit',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
                    }}
                  >
                    <Iconify
                      icon={copied ? 'eva:checkmark-circle-2-outline' : 'eva:copy-outline'}
                      width={13}
                    />
                  </Box>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          {/* Mempool.space link */}
          <Box
            component="a"
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              py: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(10,10,15,0.1)',
              color: 'rgba(10,10,15,0.55)',
              fontSize: '13px',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 150ms ease, color 150ms ease',
              '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' },
            }}
          >
            <Iconify icon="eva:external-link-outline" width={14} />
            {t('View on mempool.space')}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: '22px', pb: '22px', pt: '16px' }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={onClose}
          sx={{
            borderRadius: '12px',
            bgcolor: isConfirmed ? '#1AB37D' : '#0A0A0F',
            fontWeight: 700,
            fontSize: '15px',
            py: '13px',
            textTransform: 'none',
            letterSpacing: '-0.01em',
            transition: 'background 400ms ease',
            '&:hover': { bgcolor: isConfirmed ? '#15946a' : '#1a1a25' },
          }}
        >
          {isConfirmed ? t('Done') : t('Close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
