'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { buildAuthHeaders } from '@/utils/http';

// ---------------------------------------------------------------------------
// Helpers — convert ArrayBuffer to base64url
// ---------------------------------------------------------------------------
function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

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
      // Step 1 — generate a random 32-byte challenge (base64url encoded)
      const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
      const challenge = toBase64Url(challengeBytes.buffer);

      // Step 2 — create the passkey in the browser (triggers Face ID / Touch ID / Windows Hello)
      const rpId = process.env.NEXT_PUBLIC_TURNKEY_RP_ID || 'localhost';
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: challengeBytes,
          rp: { id: rpId, name: 'Normal Finance' },
          user: {
            id: new TextEncoder().encode(userId),
            name: userEmail ?? userId,
            displayName: userEmail ?? 'Normal User',
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },   // ES256 (P-256)
            { type: 'public-key', alg: -257 },  // RS256
          ],
          timeout: 60000,
          attestation: 'direct',
          authenticatorSelection: {
            residentKey: 'preferred',
            requireResidentKey: false,
            userVerification: 'preferred',
          },
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error('Passkey creation was cancelled');

      const response = credential.response as AuthenticatorAttestationResponse;

      const attestation = {
        credentialId: toBase64Url(credential.rawId),
        clientDataJson: toBase64Url(response.clientDataJSON),
        attestationObject: toBase64Url(response.attestationObject),
        transports: response.getTransports?.() ?? [],
      };

      // Step 3 — send attestation to backend to create the Turnkey sub-org
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/turnkey/wallet', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, attestation }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

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
