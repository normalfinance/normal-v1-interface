'use client';

import Box from '@mui/material/Box';

// ---------------------------------------------------------------------------
// Small network pill shown next to an asset so users always know which chain
// it lives on (Stellar USDC is not Ethereum USDC; BTC is its own network).
// ---------------------------------------------------------------------------

export type AssetNetwork = 'Bitcoin' | 'Stellar' | 'Ethereum' | 'Solana';

export function getAssetNetwork(token: { contract: string }): AssetNetwork {
  switch (token.contract) {
    case '__btc__':
      return 'Bitcoin';
    case '__eth__':
      return 'Ethereum';
    case '__sol__':
      return 'Solana';
    default:
      return 'Stellar';
  }
}

export const NETWORK_STYLES: Record<AssetNetwork, { dot: string; bg: string; color: string }> = {
  Bitcoin: { dot: '#F7931A', bg: 'rgba(247,147,26,0.09)', color: '#8A4A00' },
  Stellar: { dot: '#14B8A6', bg: 'rgba(20,184,166,0.09)', color: '#0A5C52' },
  Ethereum: { dot: '#627EEA', bg: 'rgba(98,126,234,0.09)', color: '#2C3E9E' },
  Solana: { dot: '#9945FF', bg: 'rgba(153,69,255,0.09)', color: '#5A1D9E' },
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
      <Box
        component="span"
        sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: s.dot, flexShrink: 0 }}
      />
      {network}
    </Box>
  );
}
