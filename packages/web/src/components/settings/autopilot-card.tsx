'use client';

// #33 Stage 3 — the "Automatic swap completion" card. Status read live from
// /api/autopilot/status (truth = Turnkey); revoke = one passkey prompt.
// Absent config / failed check renders the honest inactive state.

import useSWR from 'swr';
import { useState } from 'react';
import { useTranslate } from '@/locales';
import { buildAuthHeaders } from '@/utils/http';
import { grantAutopilotConsent } from '@/lib/turnkey/autopilot-consent';
import { revokeAutopilotConsent } from '@/lib/turnkey/autopilot-revoke';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { useSnackbar } from '@/components/template/snackbar';

interface Status {
  active: boolean;
  autopilotUserId: string | null;
}

export default function AutopilotCard() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const [busy, setBusy] = useState(false);
  const { data, mutate, error } = useSWR<Status>(
    'autopilot-status',
    async () => {
      const res = await fetch('/api/autopilot/status', { headers: await buildAuthHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `status ${res.status}`);
      return { active: !!json.active, autopilotUserId: json.autopilotUserId ?? null };
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const handleRevoke = async () => {
    if (!data?.autopilotUserId) return;
    try {
      setBusy(true);
      await revokeAutopilotConsent(data.autopilotUserId);
      enqueueSnackbar(t('Automatic swap completion turned off.'), { variant: 'success' });
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.message ?? t('Could not revoke — try again.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  // The enable door for users who picked "Not now" at the swap-time offer —
  // everything visible must be actionable, so Off comes with a Turn on.
  const serverPublicKey = process.env.NEXT_PUBLIC_AUTOPILOT_PUBLIC_KEY;
  const handleEnable = async () => {
    if (!serverPublicKey) return;
    try {
      setBusy(true);
      await grantAutopilotConsent(serverPublicKey);
      // They changed their mind — stop suppressing the swap-time offer too.
      try {
        localStorage.removeItem('nf:autopilot-declined:v1');
      } catch {
        /* cosmetic */
      }
      enqueueSnackbar(t('Automatic swap completion is on.'), { variant: 'success' });
      await mutate();
    } catch (e: any) {
      enqueueSnackbar(e?.message ?? t('Could not enable — try again.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        p: '18px',
        borderRadius: '16px',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FAFAFB',
        mb: '16px',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: '6px' }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F' }}>
          {t('Automatic swap completion')}
        </Typography>
        <Typography
          sx={{
            fontSize: '11px',
            fontWeight: 700,
            px: '9px',
            py: '3px',
            borderRadius: '999px',
            bgcolor: data?.active ? 'rgba(26,179,125,0.12)' : 'rgba(10,10,15,0.06)',
            color: data?.active ? '#0A6649' : '#6B6B76',
          }}
        >
          {data?.active ? t('On') : error ? t('Unknown') : t('Off')}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '12.5px', color: 'rgba(10,10,15,0.55)', lineHeight: 1.55 }}>
        {data?.active
          ? t(
              'Normal finishes the swaps you start — only to your own addresses, only the allowlisted bridge contracts. Revoking takes one passkey confirmation.'
            )
          : t(
              'When enabled (during a cross-chain swap), Normal completes the later swap steps automatically so you never sign twice around a bridge wait.'
            )}
      </Typography>
      {data?.active && (
        <Button
          onClick={busy ? undefined : handleRevoke}
          disabled={busy}
          sx={{
            mt: '12px',
            textTransform: 'none',
            fontSize: '13px',
            fontWeight: 600,
            color: '#B42318',
            border: '1px solid rgba(180,35,24,0.3)',
            borderRadius: '10px',
            px: '14px',
            '&:hover': { bgcolor: 'rgba(180,35,24,0.05)' },
          }}
        >
          {busy ? t('Revoking…') : t('Turn off')}
        </Button>
      )}
      {data && !data.active && !error && serverPublicKey && (
        <Button
          onClick={busy ? undefined : handleEnable}
          disabled={busy}
          sx={{
            mt: '12px',
            textTransform: 'none',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0A0A0F',
            border: '1px solid rgba(10,10,15,0.14)',
            borderRadius: '10px',
            px: '14px',
            '&:hover': { bgcolor: 'rgba(10,10,15,0.04)' },
          }}
        >
          {busy ? t('Confirming…') : t('Turn on — one passkey')}
        </Button>
      )}
    </Box>
  );
}
