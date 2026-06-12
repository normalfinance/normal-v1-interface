'use client';

import { useState } from 'react';
import { ensureChainAccount } from '@/lib/turnkey/add-account';

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FingerprintIcon from '@mui/icons-material/Fingerprint';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface BitcoinWalletSetupProps {
  userEmail?: string | null;
  userId: string;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BitcoinWalletSetup({ userEmail, userId, onSuccess }: BitcoinWalletSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);

    try {
      // Lazy provisioning — derives BTC on the existing wallet, or creates
      // passkey + sub-org + BTC-only wallet for first-time users.
      await ensureChainAccount('bitcoin', userId, userEmail);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Box
        component="button"
        onClick={handleSetup}
        disabled={loading}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          py: '13px',
          px: '20px',
          borderRadius: '14px',
          border: '1px solid rgba(247,147,26,0.25)',
          bgcolor: 'rgba(247,147,26,0.06)',
          color: '#B45309',
          fontSize: '14px',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.15s',
          '&:hover:not(:disabled)': {
            bgcolor: 'rgba(247,147,26,0.10)',
            borderColor: 'rgba(247,147,26,0.4)',
          },
        }}
      >
        {loading ? (
          <CircularProgress size={16} sx={{ color: '#B45309' }} />
        ) : (
          <FingerprintIcon sx={{ fontSize: 18, color: '#B45309' }} />
        )}
        {loading ? 'Setting up…' : 'Set up Bitcoin wallet'}
      </Box>

      <Box sx={{ fontSize: '11.5px', color: 'rgba(10,10,15,0.4)', textAlign: 'center', lineHeight: 1.5 }}>
        Secured by your device biometrics. No seed phrase required.
      </Box>

      {error && (
        <Box
          sx={{
            fontSize: '12px',
            color: '#B91C1C',
            bgcolor: 'rgba(185,28,28,0.06)',
            border: '1px solid rgba(185,28,28,0.15)',
            borderRadius: '10px',
            px: '12px',
            py: '8px',
          }}
        >
          {error}
        </Box>
      )}
    </Box>
  );
}
