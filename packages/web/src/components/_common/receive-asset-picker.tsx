'use client';

import { cdn } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';

interface ReceiveAssetPickerProps {
  open: boolean;
  onClose: () => void;
  onSelectStellar: () => void;
  onSelectBitcoin: () => void;
}

export function ReceiveAssetPicker({
  open,
  onClose,
  onSelectStellar,
  onSelectBitcoin,
}: ReceiveAssetPickerProps) {
  const options = [
    {
      key: 'stellar',
      iconUrl: cdn('tokens/XLM.webp'),
      label: 'Stellar',
      subtitle: 'USDC, XLM and Stellar tokens',
      dotColor: '#14B8A6',
      onClick: onSelectStellar,
    },
    {
      key: 'bitcoin',
      iconUrl: cdn('tokens/bitcoin.webp'),
      label: 'Bitcoin',
      subtitle: 'BTC on Bitcoin network',
      dotColor: '#F7931A',
      onClick: onSelectBitcoin,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: '20px' } } }}
    >
      <DialogTitle sx={{ px: '22px', pt: '22px', pb: '12px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}
          >
            Receive
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: '#6B6B76', borderRadius: '8px' }}>
            <CloseOutlined sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mt: '4px' }}>
          Select the network you want to receive on
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: '16px', pt: '16px !important', pb: '16px' }}>
        {options.map((opt) => (
          <Box
            key={opt.key}
            component="button"
            onClick={opt.onClick}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              px: '14px',
              py: '14px',
              borderRadius: '14px',
              border: '1px solid rgba(10,10,15,0.07)',
              bgcolor: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              mb: '8px',
              transition: 'all 0.15s',
              '&:last-child': { mb: 0 },
              '&:hover': { bgcolor: 'rgba(10,10,15,0.03)', borderColor: 'rgba(10,10,15,0.12)' },
            }}
          >
            <Box
              component="img"
              src={opt.iconUrl}
              alt={opt.label}
              sx={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0A0A0F',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.3,
                }}
              >
                {opt.label}
              </Box>
              <Box
                sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)', mt: '2px', lineHeight: 1.4 }}
              >
                {opt.subtitle}
              </Box>
            </Box>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: opt.dotColor,
                flexShrink: 0,
              }}
            />
            <ChevronRightOutlined
              sx={{ fontSize: 18, color: 'rgba(10,10,15,0.3)', flexShrink: 0 }}
            />
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
}
