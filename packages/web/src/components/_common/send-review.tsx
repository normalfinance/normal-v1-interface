import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import { fCurrencyTwoDecimals } from '@/utils/format-number';
import { Token } from '@/types/token';
import { Iconify } from '../iconify';
import { useTheme } from '@mui/material/styles';
import { shortenAddress } from '@/utils/format-address';

export interface SendReviewProps {
  open: boolean;
  onClose: () => void;
  sendToken?: Token | null;
  tokenValue: number;
  fiatValue: number;
  address: string;
  networkCost: number;
}

const SendReview: React.FC<SendReviewProps> = ({
  open,
  onClose,
  sendToken,
  tokenValue,
  fiatValue,
  address,
  networkCost,
}) => {
  const theme = useTheme();

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
            Review send
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
              You're sending
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
                <Typography variant="h4">${fiatValue}</Typography>
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
                  {tokenValue.toFixed(4)} {sendToken?.shortname}
                </Typography>
              </Box>

              <Box
                component="img"
                src={sendToken?.url}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </Box>

            <Typography variant="caption" color="text.secondary" mb={1}>
              To
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
                <Typography variant="h4">{shortenAddress(address)}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: '100%', height: '1px', bgcolor: theme.palette.text.disabled }} />
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
                Network cost
              </Typography>
              <Iconify
                icon="solar:info-circle-bold"
                width={14}
                sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
              />
            </Box>

            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: theme.palette.text.primary,
                fontSize: '12px',
              }}
            >
              {fCurrencyTwoDecimals(networkCost)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Button fullWidth variant="soft" color="success" size="large">
            Send
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default SendReview;
