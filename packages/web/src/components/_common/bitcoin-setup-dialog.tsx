'use client';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from '@/components/template/iconify';

import { BitcoinWalletSetup } from './bitcoin-wallet-setup';

// ---------------------------------------------------------------------------
// Gate dialog shown when the user starts a Bitcoin action (send, receive)
// without a BTC address yet. The wallet is provisioned lazily and only after
// the user explicitly confirms here — never as a silent side effect.
// ---------------------------------------------------------------------------

interface BitcoinSetupDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string | null;
  /** Called after the BTC account exists; the caller resumes the original action. */
  onSuccess: () => void;
}

export function BitcoinSetupDialog({
  open,
  onClose,
  userId,
  userEmail,
  onSuccess,
}: BitcoinSetupDialogProps) {
  const { t } = useTranslate();

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
          <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
            {t('Set up your Bitcoin wallet')}
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

      <DialogContent sx={{ px: '22px', pt: '16px', pb: '22px' }}>
        <Stack spacing={2}>
          <Box
            sx={{
              px: '14px',
              py: '12px',
              borderRadius: '12px',
              bgcolor: 'rgba(247,147,26,0.06)',
              border: '1px solid rgba(247,147,26,0.2)',
            }}
          >
            <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.7)', lineHeight: 1.55 }}>
              {t(
                'You don’t have a Bitcoin address yet. To continue, add Bitcoin to your Normal wallet — it takes one passkey confirmation and is created on the same secure wallet you already use.'
              )}
            </Typography>
          </Box>

          <BitcoinWalletSetup userId={userId} userEmail={userEmail} onSuccess={onSuccess} />
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
