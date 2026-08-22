'use client';

// Layer 3 of the dynamic-gas design (Niko GO 2026-08-21): when the live gas
// price outruns the reserve between quote and send, the user gets THIS
// choice instead of an error dump. "Use X ETH" adjusts the card's amount and
// refreshes the quote — the user then confirms the UPDATED numbers with the
// normal Swap press. Deliberately NOT auto-signing the adjusted amount:
// (1) the receive amount changed, and signing a swap the user never saw
// quoted breaks the honesty rules; (2) WebAuthn needs fresh user activation
// — an auto-triggered passkey after async re-quoting fails NotAllowedError
// on some browsers. Nothing was signed before this dialog; cancel is free.

import { useTranslate } from '@/locales';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';

export default function GasShortfallDialog({
  open,
  triedAmountEth,
  affordableEth,
  onUseAffordable,
  onCancel,
}: {
  open: boolean;
  /** the amount the user tried to swap (decimal ETH string) */
  triedAmountEth: string;
  /** the most the balance can carry at the CURRENT gas price */
  affordableEth: string;
  onUseAffordable: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslate();

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{ sx: { borderRadius: '20px', maxWidth: 400, p: '24px' } }}
    >
      <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', mb: '10px' }}>
        {t('Network fee just went up')}
      </Typography>
      <Typography sx={{ fontSize: '13.5px', color: 'rgba(10,10,15,0.6)', lineHeight: 1.6 }}>
        {t(
          'Gas on Ethereum rose between your quote and now, so {{tried}} ETH plus the fee no longer fits your balance. You can swap up to {{affordable}} ETH at the current fee.',
          { tried: triedAmountEth, affordable: affordableEth }
        )}
      </Typography>
      <Typography
        sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)', lineHeight: 1.6, mt: '10px' }}
      >
        {t(
          'Nothing was signed or sent. Choosing the smaller amount refreshes your quote — review it and press Swap to confirm.'
        )}
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ mt: '18px' }}>
        <Button
          onClick={onCancel}
          sx={{
            flex: 1,
            textTransform: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#0A0A0F',
            border: '1px solid rgba(10,10,15,0.14)',
            borderRadius: '12px',
            py: '9px',
          }}
        >
          {t('Cancel')}
        </Button>
        <Button
          onClick={onUseAffordable}
          sx={{
            flex: 1.4,
            textTransform: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#fff',
            bgcolor: '#0A0A0F',
            borderRadius: '12px',
            py: '9px',
            '&:hover': { bgcolor: '#0A0A0F', opacity: 0.85 },
          }}
        >
          {t('Use {{amount}} ETH', { amount: affordableEth })}
        </Button>
      </Stack>
    </Dialog>
  );
}
