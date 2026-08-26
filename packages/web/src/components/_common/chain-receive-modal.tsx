'use client';

import QRCode from 'qrcode';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

// ---------------------------------------------------------------------------
// Generic single-chain receive modal (QR + copyable address) for chains that
// don't need extra ceremony — Ethereum, Solana. Bitcoin keeps its own modal
// (mempool watcher); Stellar keeps its own (activation/trustline states).
// ---------------------------------------------------------------------------

interface ChainReceiveModalProps {
  open: boolean;
  onClose: () => void;
  address: string | null;
  chainLabel: string; // "Ethereum"
  symbol: string; // "ETH"
  warning: string; // "Only send Ethereum (ETH) to this address!"
}

export function ChainReceiveModal({
  open,
  onClose,
  address,
  chainLabel,
  symbol,
  warning,
}: ChainReceiveModalProps) {
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const { enqueueSnackbar } = useSnackbar();
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    if (!open || !address) return;
    QRCode.toDataURL(address, {
      width: 200,
      margin: 1,
      color: { dark: '#0A0A0F', light: '#FFFFFF' },
    })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(''));
  }, [open, address]);

  if (!address) return null;

  const handleCopy = () => {
    copy(address);
    enqueueSnackbar(t('Address copied to clipboard'), { variant: 'success' });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: '22px' } } }}
    >
      <DialogTitle sx={{ px: '22px', pt: '22px', pb: '12px' }}>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography
            sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}
          >
            {t('Receive {{symbol}}', { symbol })}
          </Typography>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 0,
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
              '&:hover': { bgcolor: 'rgba(10,10,15,0.1)' },
            }}
          >
            <Iconify icon="mingcute:close-line" width={16} />
          </Box>
        </Box>
        <Typography
          sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', textAlign: 'center', mt: '4px' }}
        >
          {t('Scan the QR code or copy your {{chain}} address', { chain: chainLabel })}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: '22px', pt: '16px', pb: '22px' }}>
        <Stack spacing={1.5} alignItems="center">
          {/* QR */}
          <Box
            sx={{
              p: '16px',
              borderRadius: '16px',
              bgcolor: '#FAFAFB',
              border: '1px solid rgba(10,10,15,0.08)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 220,
              width: '100%',
            }}
          >
            {qrCodeUrl ? (
              <Box
                component="img"
                src={qrCodeUrl}
                alt={`${chainLabel} address QR`}
                sx={{ maxWidth: '100%', borderRadius: '4px' }}
              />
            ) : (
              <CircularProgress size={36} sx={{ color: 'rgba(10,10,15,0.3)' }} />
            )}
          </Box>

          {/* Network-only warning */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              px: '12px',
              py: '10px',
              borderRadius: '10px',
              bgcolor: 'rgba(245,158,11,0.06)',
              border: '1px solid rgba(245,158,11,0.2)',
              width: '100%',
            }}
          >
            <Iconify
              icon="eva:alert-triangle-outline"
              width={15}
              sx={{ color: 'warning.main', flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.65)', lineHeight: 1.5 }}>
              {warning}
            </Typography>
          </Box>

          {/* Address */}
          <Box
            sx={{
              px: '14px',
              py: '12px',
              borderRadius: '12px',
              bgcolor: '#FAFAFB',
              border: '1px solid rgba(10,10,15,0.08)',
              width: '100%',
              wordBreak: 'break-all',
            }}
          >
            <Typography
              sx={{
                fontSize: '12px',
                color: '#0A0A0F',
                fontFamily: '"Geist Mono", "Courier New", monospace',
                lineHeight: 1.6,
              }}
            >
              {address}
            </Typography>
          </Box>

          <Box
            component="button"
            onClick={handleCopy}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              px: '14px',
              py: '8px',
              borderRadius: '10px',
              border: '1px solid rgba(10,10,15,0.12)',
              bgcolor: '#FFFFFF',
              color: '#0A0A0F',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': { bgcolor: '#F4F4F7' },
            }}
          >
            <Iconify icon="solar:copy-outline" width={15} />
            {t('Copy Address')}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
