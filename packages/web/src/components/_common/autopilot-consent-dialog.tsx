'use client';

// #33 Stage 3 — the inline consent moment (decision D2: offered at the first
// cross-chain swap, BEFORE anything signs — never mid-flow). One passkey
// ceremony creates the "Normal Autopilot" delegation on the user's own
// Turnkey sub-org, bounded by a policy the SIGNER enforces (own addresses,
// allowlisted bridge contracts, value 0). Declining just keeps the
// interactive prompts — the swap proceeds either way.

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { grantAutopilotConsent } from '@/lib/turnkey/autopilot-consent';

import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

export default function AutopilotConsentDialog({
  open,
  onChoose,
}: {
  open: boolean;
  /** true = delegation granted (ceremony succeeded); false = "Not now". */
  onChoose: (enabled: boolean) => void;
}) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);

  const handleEnable = async () => {
    const serverPublicKey = process.env.NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY;
    if (!serverPublicKey) return; // callers gate on this; belt-and-braces
    try {
      setBusy(true);
      await grantAutopilotConsent(serverPublicKey);
      enqueueSnackbar(t('Automatic swap completion is on — change it anytime in Settings.'), {
        variant: 'success',
      });
      onChoose(true);
    } catch (e: any) {
      // Stay open: the user can retry the passkey or pick "Not now".
      enqueueSnackbar(e?.message ?? t('Could not enable — you can keep signing manually.'), {
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : () => onChoose(false)}
      PaperProps={{ sx: { borderRadius: '20px', maxWidth: 420, p: '24px' } }}
    >
      <Typography sx={{ fontSize: '17px', fontWeight: 700, color: '#0A0A0F', mb: '10px' }}>
        {t('Finish future swaps automatically?')}
      </Typography>
      <Typography sx={{ fontSize: '13.5px', color: 'rgba(10,10,15,0.6)', lineHeight: 1.6 }}>
        {t(
          'That swap needed a signature after the bridge wait. Enable this and next time Normal finishes that step for you — you sign once at the start and walk away.'
        )}
      </Typography>
      <Typography
        sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.5)', lineHeight: 1.6, mt: '10px' }}
      >
        {t(
          'Your wallet itself enforces the limits: only swaps you started, only to your own addresses, only the allowlisted bridge contracts. Turn it off anytime in Settings. Enabling takes up to two quick passkey confirmations.'
        )}
      </Typography>
      <Stack direction="row" spacing={1.25} sx={{ mt: '18px' }}>
        <Button
          onClick={busy ? undefined : () => onChoose(false)}
          disabled={busy}
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
          {t('Not now')}
        </Button>
        <Button
          onClick={busy ? undefined : handleEnable}
          disabled={busy}
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
          {busy ? t('Confirming…') : t('Enable')}
        </Button>
      </Stack>
    </Dialog>
  );
}
