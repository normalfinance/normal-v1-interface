'use client';

import Box from '@mui/material/Box';

// ---------------------------------------------------------------------------
// Small network pill shown next to an asset so users always know which chain
// it lives on (Stellar USDC is not Ethereum USDC; BTC is its own network).
// ---------------------------------------------------------------------------

export type AssetNetwork = 'Bitcoin' | 'Stellar';

export function getAssetNetwork(token: { contract: string }): AssetNetwork {
  return token.contract === '__btc__' ? 'Bitcoin' : 'Stellar';
}

const NETWORK_STYLES: Record<AssetNetwork, { dot: string; bg: string; color: string }> = {
  Bitcoin: { dot: '#F7931A', bg: 'rgba(247,147,26,0.09)', color: '#8A4A00' },
  Stellar: { dot: '#14B8A6', bg: 'rgba(20,184,166,0.09)', color: '#0A5C52' },
};

export function NetworkBadge({ network }: { network: AssetNetwork }) {
  const s = NETWORK_STYLES[network];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        px: '8px',
        py: '2px',
        borderRadius: '999px',
        bgcolor: s.bg,
        color: s.color,
        fontSize: '10.5px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
        flexShrink: 0,
      }}
    >
      <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: s.dot, flexShrink: 0 }} />
      {network}
    </Box>
  );
}
