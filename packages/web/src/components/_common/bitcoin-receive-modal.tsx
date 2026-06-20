'use client';

import QRCode from 'qrcode';
import { cdn } from '@normalfinance/utils';
import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';
import { usePersistStore } from '@normalfinance/state';
import { useState, useEffect, useMemo } from 'react';
import { useBtcAddressWatch } from '@/hooks/use-btc-address-watch';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';

import { Iconify } from '../template/iconify';

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  letterSpacing: '-0.01em',
} as const;

function truncateTxid(txid: string) {
  return `${txid.slice(0, 8)}…${txid.slice(-8)}`;
}

interface BitcoinReceiveModalProps {
  open: boolean;
  address: string | null;
  onClose: () => void;
}

export function BitcoinReceiveModal({ open, address, onClose }: BitcoinReceiveModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedTxid, setCopiedTxid] = useState(false);

  const tokens = usePersistStore((s) => s.tokenState.tokens);
  const btcPrice = useMemo(
    () => BigNumber(tokens.find((t) => t.symbol === 'BTC')?.price ?? 0),
    [tokens],
  );

  const { incomingTxs, isConnected } = useBtcAddressWatch(address, open);

  // The most recent incoming tx (if any)
  const latestIncoming = incomingTxs[incomingTxs.length - 1] ?? null;

  const incomingAmountSat = useMemo(() => {
    if (!latestIncoming || !address) return 0;
    return latestIncoming.vout
      .filter((o) => o.scriptpubkey_address === address)
      .reduce((s, o) => s + o.value, 0);
  }, [latestIncoming, address]);

  const incomingAmountBtc = incomingAmountSat / 1e8;
  const incomingFiat = btcPrice.gt(0)
    ? BigNumber(incomingAmountBtc).multipliedBy(btcPrice)
    : null;

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(address, {
      width: 220,
      margin: 2,
      color: { dark: '#0A0A0F', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl);
  }, [address]);

  const handleCopy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleCopyTxid = async () => {
    if (!latestIncoming) return;
    await navigator.clipboard.writeText(latestIncoming.txid);
    setCopiedTxid(true);
    setTimeout(() => setCopiedTxid(false), 1800);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '20px', p: 0, overflow: 'hidden' } } }}
    >
      <DialogTitle sx={{ p: '20px 20px 0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box
              component="img"
              src={cdn('tokens/bitcoin.webp')}
              alt="Bitcoin"
              sx={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <Typography
              sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}
            >
              Receive Bitcoin
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#6B6B76', borderRadius: '8px' }}>
            <CloseOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{ p: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}
      >
        {/* QR code */}
        <Box
          sx={{
            p: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(10,10,15,0.08)',
            bgcolor: '#fff',
            display: 'inline-flex',
            mt: '4px',
          }}
        >
          {qrDataUrl ? (
            <Box
              component="img"
              src={qrDataUrl}
              alt="Bitcoin address QR code"
              sx={{ width: 188, height: 188, display: 'block' }}
            />
          ) : (
            <Box
              sx={{ width: 188, height: 188, bgcolor: 'rgba(10,10,15,0.04)', borderRadius: '8px' }}
            />
          )}
        </Box>

        {/* Address + copy */}
        <Box
          sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}
        >
          <Typography
            sx={{
              fontSize: '11px',
              color: 'rgba(10,10,15,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            Your Bitcoin address
          </Typography>

          <Tooltip title={copied ? 'Copied!' : 'Click to copy'} placement="top">
            <Box
              component="button"
              onClick={handleCopy}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                px: '14px',
                py: '10px',
                borderRadius: '12px',
                border: '1px solid rgba(10,10,15,0.08)',
                bgcolor: '#F4F4F7',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.06)', borderColor: 'rgba(10,10,15,0.14)' },
              }}
            >
              <Box
                sx={{
                  ...MONO,
                  fontSize: '12px',
                  color: '#0A0A0F',
                  flex: 1,
                  textAlign: 'left',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}
              >
                {address}
              </Box>
              {copied ? (
                <CheckOutlinedIcon sx={{ fontSize: 15, color: '#1AB37D', flexShrink: 0 }} />
              ) : (
                <ContentCopyOutlinedIcon
                  sx={{ fontSize: 15, color: 'rgba(10,10,15,0.4)', flexShrink: 0 }}
                />
              )}
            </Box>
          </Tooltip>
        </Box>

        {/* BTC only warning */}
        <Box
          sx={{
            width: '100%',
            p: '10px 14px',
            borderRadius: '10px',
            bgcolor: 'rgba(247,147,26,0.05)',
            border: '1px solid rgba(247,147,26,0.15)',
            fontSize: '12px',
            color: 'rgba(10,10,15,0.55)',
            lineHeight: 1.55,
            textAlign: 'center',
          }}
        >
          Only send <strong>Bitcoin (BTC)</strong> to this address. Sending other assets will
          result in permanent loss.
        </Box>

        {/* Payment status */}
        <Box sx={{ width: '100%' }}>
          {latestIncoming ? (
            /* ── Payment detected ── */
            <Box
              sx={{
                p: '14px 16px',
                borderRadius: '14px',
                bgcolor: 'rgba(26,179,125,0.07)',
                border: '1px solid rgba(26,179,125,0.22)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'rgba(26,179,125,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Iconify icon="eva:checkmark-fill" width={14} sx={{ color: '#1AB37D' }} />
                </Box>
                <Box>
                  <Typography
                    sx={{ fontSize: '13px', fontWeight: 600, color: '#0A6649', lineHeight: 1.3 }}
                  >
                    {BigNumber(incomingAmountBtc).toFixed(8)} BTC incoming
                    {incomingTxs.length > 1 && (
                      <Box
                        component="span"
                        sx={{
                          ml: '6px',
                          px: '6px',
                          py: '1px',
                          borderRadius: '999px',
                          bgcolor: 'rgba(26,179,125,0.15)',
                          color: '#0A6649',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        +{incomingTxs.length - 1} more
                      </Box>
                    )}
                  </Typography>
                  {incomingFiat && (
                    <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.5)' }}>
                      ≈ {fCurrency(incomingFiat)} · Confirming on Bitcoin network (~10 min)
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Txid row */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  px: '10px',
                  py: '8px',
                  borderRadius: '10px',
                  bgcolor: 'rgba(10,10,15,0.04)',
                }}
              >
                <Typography sx={{ ...MONO, fontSize: '11px', color: 'rgba(10,10,15,0.6)' }}>
                  {truncateTxid(latestIncoming.txid)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tooltip title={copiedTxid ? 'Copied!' : 'Copy txid'}>
                    <Box
                      component="button"
                      onClick={handleCopyTxid}
                      sx={{
                        width: 24,
                        height: 24,
                        border: 'none',
                        bgcolor: 'transparent',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: copiedTxid ? '#1AB37D' : 'rgba(10,10,15,0.4)',
                        fontFamily: 'inherit',
                        '&:hover': { bgcolor: 'rgba(10,10,15,0.06)' },
                      }}
                    >
                      <Iconify
                        icon={copiedTxid ? 'eva:checkmark-circle-2-outline' : 'eva:copy-outline'}
                        width={13}
                      />
                    </Box>
                  </Tooltip>
                  <Box
                    component="a"
                    href={`https://mempool.space/tx/${latestIncoming.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'rgba(10,10,15,0.4)',
                      textDecoration: 'none',
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.06)', color: '#0A0A0F' },
                    }}
                  >
                    <Iconify icon="eva:external-link-outline" width={13} />
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            /* ── Watching state ── */
            <Box
              sx={{
                p: '12px 16px',
                borderRadius: '14px',
                bgcolor: '#FAFAFB',
                border: '1px solid rgba(10,10,15,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {isConnected ? (
                <CircularProgress size={14} thickness={3.5} sx={{ color: '#1AB37D', flexShrink: 0 }} />
              ) : (
                <CircularProgress size={14} thickness={3.5} sx={{ color: 'rgba(10,10,15,0.25)', flexShrink: 0 }} />
              )}
              <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)' }}>
                {isConnected
                  ? 'Watching for incoming payment…'
                  : 'Connecting to Bitcoin network…'}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
