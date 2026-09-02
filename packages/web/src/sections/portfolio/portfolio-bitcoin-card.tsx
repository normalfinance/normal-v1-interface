'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';

import { BitcoinWalletSetup } from '@/components/_common/bitcoin-wallet-setup';

import { MONO, CARD_SX } from './_shared';

// ---------------------------------------------------------------------------
// BTC logo — inline SVG (matches the "no icon library" convention)
// ---------------------------------------------------------------------------
function BtcIcon({ size = 34 }: { size?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: '#F7931A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="white">
        <path d="M17.06 11.57c.45-1.01.28-2.23-.56-3.05-.6-.59-1.43-.9-2.37-.96l.42-2.53-1.23-.2-.41 2.47-.98-.16.41-2.47-1.23-.21-.42 2.53-2.42-.4-.21 1.27 1 .17c.41.07.68.46.61.87L8.1 15.1c-.07.41-.46.68-.87.61l-1-.17-.44 1.25 2.43.4-.43 2.56 1.23.21.43-2.56.98.16-.43 2.57 1.23.2.43-2.55c2.6.27 4.42-.47 4.93-2.6.42-1.71-.2-2.75-1.46-3.41zm-5.79-3.4l1.37.23c.76.13 1.27.85 1.14 1.62-.13.76-.85 1.27-1.62 1.14l-1.37-.23.48-2.76zm1.71 7.21l-1.6-.27.53-3.17 1.6.27c.88.15 1.47.99 1.33 1.87-.15.88-.99 1.47-1.87 1.32l.01-.02z" />
      </svg>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Balance fetch from Mempool.space (free, no API key)
// ---------------------------------------------------------------------------
interface BtcBalance {
  satoshis: number;
  btc: number;
  usd: number | null;
}

async function fetchBtcBalance(address: string): Promise<BtcBalance | null> {
  try {
    const [addrRes, priceRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${address}`),
      fetch('https://mempool.space/api/v1/prices'),
    ]);
    if (!addrRes.ok) return null;
    const addrData = await addrRes.json();
    const priceData = priceRes.ok ? await priceRes.json() : null;

    const funded: number = addrData.chain_stats?.funded_txo_sum ?? 0;
    const spent: number = addrData.chain_stats?.spent_txo_sum ?? 0;
    const satoshis = funded - spent;
    const btc = satoshis / 1e8;
    const btcPrice: number | null = priceData?.USD ?? null;
    const usd = btcPrice != null ? btc * btcPrice : null;

    return { satoshis, btc, usd };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Address pill with copy
// ---------------------------------------------------------------------------
function AddressPill({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const short = `${address.slice(0, 8)}...${address.slice(-6)}`;

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Tooltip title={copied ? 'Copied!' : address} placement="top">
      <Box
        component="button"
        onClick={copy}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          px: '10px',
          py: '5px',
          borderRadius: '8px',
          border: '1px solid rgba(10,10,15,0.08)',
          bgcolor: '#F4F4F7',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '12px',
          color: 'rgba(10,10,15,0.6)',
          transition: 'all 0.15s',
          '&:hover': { bgcolor: 'rgba(10,10,15,0.06)', borderColor: 'rgba(10,10,15,0.14)' },
        }}
      >
        <Box sx={{ ...MONO, fontSize: '12px' }}>{short}</Box>
        {copied ? (
          <CheckOutlinedIcon sx={{ fontSize: 12, color: '#1AB37D' }} />
        ) : (
          <ContentCopyOutlinedIcon sx={{ fontSize: 12 }} />
        )}
      </Box>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------
interface PortfolioBitcoinCardProps {
  userId: string;
  userEmail?: string | null;
}

export function PortfolioBitcoinCard({ userId, userEmail }: PortfolioBitcoinCardProps) {
  const { addresses, loading, hasWallet, refetch } = useTurnkeyWallet(!!userId);
  const [balance, setBalance] = useState<BtcBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const loadBalance = useCallback(async (addr: string) => {
    setBalanceLoading(true);
    const b = await fetchBtcBalance(addr);
    setBalance(b);
    setBalanceLoading(false);
  }, []);

  useEffect(() => {
    if (addresses?.bitcoinAddress) loadBalance(addresses.bitcoinAddress);
  }, [addresses?.bitcoinAddress, loadBalance]);

  // ─── Not yet checked ────────────────────────────────────────────────────
  if (loading || hasWallet === null) {
    return (
      <Box sx={CARD_SX}>
        <Skeleton
          variant="rectangular"
          height={120}
          sx={{ borderRadius: '12px', bgcolor: 'rgba(10,10,15,0.06)' }}
        />
      </Box>
    );
  }

  // ─── No wallet yet — show setup ─────────────────────────────────────────
  if (!hasWallet) {
    return (
      <Box sx={CARD_SX}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', mb: '16px' }}>
          <BtcIcon />
          <Box>
            <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F' }}>Bitcoin</Box>
            <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
              Non-custodial · secured by your device
            </Box>
          </Box>
        </Box>
        <BitcoinWalletSetup userId={userId} userEmail={userEmail} onSuccess={refetch} />
      </Box>
    );
  }

  // ─── Wallet exists ───────────────────────────────────────────────────────
  const btcAddress = addresses?.bitcoinAddress;

  return (
    <Box sx={CARD_SX}>
      {/* Header */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '20px' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BtcIcon />
          <Box>
            <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F' }}>Bitcoin</Box>
            <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.45)' }}>
              Non-custodial · Turnkey TEE
            </Box>
          </Box>
        </Box>
        {btcAddress && <AddressPill address={btcAddress} />}
      </Box>

      {/* Balance */}
      <Box>
        <Box
          sx={{
            fontSize: '11px',
            color: 'rgba(10,10,15,0.35)',
            mb: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Balance
        </Box>
        {balanceLoading ? (
          <Skeleton
            variant="text"
            width={120}
            height={40}
            sx={{ bgcolor: 'rgba(10,10,15,0.06)' }}
          />
        ) : (
          <>
            <Box
              sx={{
                ...MONO,
                fontSize: '26px',
                fontWeight: 400,
                color: '#0A0A0F',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {balance != null ? `${balance.btc.toFixed(6)} BTC` : '0.000000 BTC'}
            </Box>
            {balance?.usd != null && (
              <Box sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.4)', mt: '2px' }}>
                ≈ $
                {balance.usd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Receive info */}
      <Box
        sx={{
          mt: '18px',
          p: '12px 14px',
          borderRadius: '12px',
          bgcolor: 'rgba(247,147,26,0.05)',
          border: '1px solid rgba(247,147,26,0.15)',
          fontSize: '12px',
          color: 'rgba(10,10,15,0.55)',
          lineHeight: 1.55,
        }}
      >
        Send Bitcoin to your address above to get started. Your funds are secured by device
        biometrics — Normal never holds your private keys.
      </Box>
    </Box>
  );
}
