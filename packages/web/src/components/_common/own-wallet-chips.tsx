'use client';

import type { OwnWalletCandidate } from '@/lib/stellar/own-wallets';

import { useTranslate } from '@/locales';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import { deriveWalletReadiness } from '@/lib/stellar/wallet-readiness';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ---------------------------------------------------------------------------
// #74b — "send to your own wallet" quick-pick. One chip per OTHER wallet the
// account owns; tapping fills the destination field, nothing more — every
// existing pre-signature gate (activation minimum, trustline block) still
// runs downstream in send-plan.
//
// Readiness on the chip is asset-aware: for XLM an unactivated target stays
// selectable (the send itself activates it via createAccount — that's the
// designed funding path); for any trustline asset an unready target is
// disabled WITH the reason, because that send could only bounce. A failed or
// in-flight probe shows a plain selectable chip — the chip asserts nothing
// it doesn't know, and the downstream gates still protect the send.
// ---------------------------------------------------------------------------

function OwnWalletChip({
  open,
  candidate,
  assetSymbol,
  assetIssuer,
  selected,
  onSelect,
}: {
  open: boolean;
  candidate: OwnWalletCandidate;
  assetSymbol: string;
  assetIssuer?: string;
  selected: boolean;
  onSelect: (address: string) => void;
}) {
  const { t } = useTranslate();
  const isXlm = assetSymbol === 'XLM';
  const probe = useAccountStatus(open ? candidate.address : undefined, {
    assetCode: isXlm ? undefined : assetSymbol,
    assetIssuer: isXlm ? undefined : assetIssuer,
  });
  const readiness = deriveWalletReadiness(probe);

  let hint: string | null = null;
  let disabled = false;
  if (readiness === 'not-activated') {
    if (isXlm) {
      hint = t('not active — sending XLM activates it');
    } else {
      hint = t('not active yet');
      disabled = true;
    }
  } else if (readiness === 'no-trustline' && !isXlm) {
    hint = t('no {{symbol}} trustline', { symbol: assetSymbol });
    disabled = true;
  }

  return (
    <Box
      component="button"
      onClick={disabled ? undefined : () => onSelect(candidate.address)}
      title={candidate.address}
      sx={{
        appearance: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        px: '10px',
        py: '5px',
        borderRadius: '999px',
        border: selected ? '1px solid rgba(10,10,15,0.9)' : '1px solid rgba(10,10,15,0.12)',
        bgcolor: selected ? '#0A0A0F' : 'transparent',
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .15s ease',
        '&:hover': selected || disabled ? {} : { borderColor: 'rgba(10,10,15,0.3)' },
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: '11.5px', fontWeight: 600, color: selected ? '#fff' : '#6B6B76' }}
      >
        {candidate.label}
      </Typography>
      {hint && (
        <Typography
          component="span"
          sx={{ fontSize: '10.5px', color: selected ? 'rgba(255,255,255,0.7)' : '#B45309' }}
        >
          {hint}
        </Typography>
      )}
    </Box>
  );
}

export default function OwnWalletChips({
  open,
  candidates,
  assetSymbol,
  assetIssuer,
  selectedAddress,
  onSelect,
}: {
  open: boolean;
  candidates: OwnWalletCandidate[];
  assetSymbol: string;
  assetIssuer?: string;
  selectedAddress: string;
  onSelect: (address: string) => void;
}) {
  const { t } = useTranslate();
  if (candidates.length === 0) return null;
  return (
    <Box sx={{ mb: '10px' }}>
      <Typography sx={{ fontSize: '11px', color: 'rgba(10,10,15,0.4)', mb: '6px' }}>
        {t('Your wallets')}
      </Typography>
      <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {candidates.map((c) => (
          <OwnWalletChip
            key={c.address}
            open={open}
            candidate={c}
            assetSymbol={assetSymbol}
            assetIssuer={assetIssuer}
            selected={selectedAddress === c.address}
            onSelect={onSelect}
          />
        ))}
      </Box>
    </Box>
  );
}
