'use client';

// In-flight ramp transfers pinned above the asset's activity table — the
// generalized sibling of MoneyGramPendingBanner (doc 89 F2). Renders from OUR
// db rows, so it survives closed dialogs, reloads and other devices, and it
// disappears the moment the chain shows the money (the hook flips the row to
// `arrived` and the row leaves the list).
//
// Failures stay visible until dismissed — the user must learn what happened —
// and the dismissal is local: it hides the card, it does not rewrite history.

import { useState } from 'react';
import { useTranslate } from '@/locales/use-locales';
import { useInFlightRamps } from '@/hooks/use-inflight-ramps';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/template/iconify';

const DISMISSED_KEY = 'nf:ramp-dismissed:v1';

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

interface Props {
  /** Show only transfers of this asset (the asset page's own symbol). */
  symbol?: string;
}

export default function RampPendingBanner({ symbol }: Props) {
  const { t } = useTranslate();
  const { inFlight } = useInFlightRamps();
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    typeof window === 'undefined' ? new Set() : readDismissed()
  );

  const visible = inFlight.filter(
    (r) => !dismissed.has(r.id) && (!symbol || r.asset.toUpperCase() === symbol.toUpperCase())
  );
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {
      /* private mode — the card returns next visit, which is harmless */
    }
  };

  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      {visible.slice(0, 3).map((r) => (
        <Box
          key={r.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            px: '16px',
            py: '12px',
            borderRadius: '14px',
            border: '1px solid',
            borderColor: r.failed ? 'rgba(185,28,28,0.25)' : 'rgba(10,10,15,0.08)',
            bgcolor: r.failed ? 'rgba(185,28,28,0.04)' : '#FAFAFB',
          }}
        >
          <Iconify
            icon={r.failed ? 'mingcute:warning-line' : 'eos-icons:three-dots-loading'}
            width={20}
            sx={{ color: r.failed ? '#B91C1C' : 'rgba(10,10,15,0.45)', flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#0A0A0F' }}>
              {r.message}
            </Typography>
            <Typography sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.5)' }}>
              {r.detail}
            </Typography>
          </Box>
          {r.failed && (
            <Box
              component="button"
              type="button"
              onClick={() => dismiss(r.id)}
              aria-label={t('Dismiss')}
              sx={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'rgba(10,10,15,0.4)',
                p: '4px',
                '&:hover': { color: '#0A0A0F' },
              }}
            >
              <Iconify icon="mingcute:close-line" width={16} />
            </Box>
          )}
        </Box>
      ))}
    </Stack>
  );
}
