'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { cdn } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tooltip from '@mui/material/Tooltip';

import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';

const MONO = {
  fontFamily: '"Geist Mono", ui-monospace, monospace',
  letterSpacing: '-0.01em',
} as const;

interface BitcoinReceiveModalProps {
  open: boolean;
  address: string | null;
  onClose: () => void;
}

export function BitcoinReceiveModal({ open, address, onClose }: BitcoinReceiveModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

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
            {/* BTC icon */}
            <Box
              component="img"
              src={cdn('tokens/bitcoin.webp')}
              alt="Bitcoin"
              sx={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: '15px', fontWeight: 600, color: '#0A0A0F', letterSpacing: '-0.01em' }}>
              Receive Bitcoin
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#6B6B76', borderRadius: '8px' }}>
            <CloseOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
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
            <Box sx={{ width: 188, height: 188, bgcolor: 'rgba(10,10,15,0.04)', borderRadius: '8px' }} />
          )}
        </Box>

        {/* Address + copy */}
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
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
              <Box sx={{ ...MONO, fontSize: '12px', color: '#0A0A0F', flex: 1, textAlign: 'left', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {address}
              </Box>
              {copied
                ? <CheckOutlinedIcon sx={{ fontSize: 15, color: '#1AB37D', flexShrink: 0 }} />
                : <ContentCopyOutlinedIcon sx={{ fontSize: 15, color: 'rgba(10,10,15,0.4)', flexShrink: 0 }} />
              }
            </Box>
          </Tooltip>
        </Box>

        {/* Warning */}
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
          Only send <strong>Bitcoin (BTC)</strong> to this address. Sending other assets will result in permanent loss.
        </Box>
      </DialogContent>
    </Dialog>
  );
}
