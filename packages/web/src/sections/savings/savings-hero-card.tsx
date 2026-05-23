'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { SavingsChart } from './savings-chart';

const MONO = '"Geist Mono", "Courier New", monospace';

// Divider shared style
const DIVIDER_SX = {
  display: { xs: 'none', sm: 'block' },
  width: '1px',
  alignSelf: 'stretch',
  bgcolor: 'rgba(255,255,255,0.08)',
};

interface SavingsHeroCardProps {
  currentValue: number;
  totalDeposited: number;
  earnings: number;
  lifetimeEarnings?: number;
  apy: number | null;
  loading: boolean;
  walletAddress?: string;
}


export function SavingsHeroCard({
  currentValue,
  totalDeposited,
  earnings,
  lifetimeEarnings,
  apy,
  loading,
  walletAddress,
}: SavingsHeroCardProps) {
  const earningsPct =
    totalDeposited > 0 ? ((earnings / totalDeposited) * 100).toFixed(2) : '0.00';

  const estAnnual = apy !== null ? currentValue * (apy / 100) : null;
  const estWeekly = apy !== null ? currentValue * (apy / 100) / 52 : null;
  const estMonthly = apy !== null ? currentValue * (apy / 100) / 12 : null;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmt7 = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 7, maximumFractionDigits: 7 });

  return (
    <Box
      sx={{
        borderRadius: '22px',
        background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A2E 100%)',
        p: { xs: '22px', sm: '28px 32px' },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle gradient orb */}
      <Box
        sx={{
          position: 'absolute',
          width: 340,
          height: 340,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          top: -80,
          right: -60,
          pointerEvents: 'none',
        }}
      />

      {/* Stats row — 4 columns, earnings and est projections each stack two rows */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            sm: '1fr 1px 1fr 1px 1fr 1px 1fr',
          },
          columnGap: { sm: '28px' },
          rowGap: { xs: '24px', sm: '0' },
        }}
      >
        {/* Current Balance — dollar value large, 7-decimal USDC below */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
            Current Balance
          </Typography>
          {loading && currentValue === 0 ? (
            <Skeleton variant="text" width={90} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <>
              <Typography sx={{ fontSize: '22px', fontWeight: 700, fontFamily: MONO, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1.1 }}>
                ${fmt(currentValue)}
              </Typography>
              <Typography sx={{ fontSize: '12px', fontWeight: 500, fontFamily: MONO, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
                {fmt7(currentValue)} USDC
              </Typography>
            </>
          )}
        </Box>

        <Box sx={DIVIDER_SX} />

        {/* Earnings column: Current Earnings (big) + All Time Earnings (sub) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
              {`Current Earnings (+${earningsPct}%)`}
            </Typography>
            {loading && earnings === 0 ? (
              <Skeleton variant="text" width={90} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <>
                <Typography sx={{ fontSize: '22px', fontWeight: 700, fontFamily: MONO, letterSpacing: '-0.03em', color: earnings > 0 ? '#4ADE80' : '#FFFFFF', lineHeight: 1.1 }}>
                  ${fmt(earnings)}
                </Typography>
                <Typography sx={{ fontSize: '12px', fontWeight: 500, fontFamily: MONO, letterSpacing: '-0.01em', color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>
                  {fmt7(earnings)} USDC
                </Typography>
              </>
            )}
          </Box>
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em', mb: '2px' }}>
              All Time Earnings
            </Typography>
            <Typography sx={{ fontSize: '14px', fontWeight: 600, fontFamily: MONO, letterSpacing: '-0.02em', color: (lifetimeEarnings ?? 0) > 0 ? '#4ADE80' : 'rgba(255,255,255,0.6)' }}>
              ${fmt(lifetimeEarnings ?? 0)}
            </Typography>
          </Box>
        </Box>

        <Box sx={DIVIDER_SX} />

        {/* Est. column: Annual (big) + Weekly / Monthly side by side (sub) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Box>
            <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em', mb: '4px' }}>
              Est. Annual
            </Typography>
            {estAnnual === null || loading ? (
              <Skeleton variant="text" width={90} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
            ) : (
              <Typography sx={{ fontSize: '22px', fontWeight: 700, fontFamily: MONO, letterSpacing: '-0.03em', color: '#FFFFFF', lineHeight: 1.1 }}>
                ${fmt(estAnnual)}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: '16px' }}>
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em', mb: '2px' }}>
                Est. Weekly
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, fontFamily: MONO, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.6)' }}>
                ~${fmt(estWeekly ?? 0)}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.02em', mb: '2px' }}>
                Est. Monthly
              </Typography>
              <Typography sx={{ fontSize: '14px', fontWeight: 600, fontFamily: MONO, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.6)' }}>
                ~${fmt(estMonthly ?? 0)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={DIVIDER_SX} />

        {/* APY */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Typography sx={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.02em' }}>
            Current APY
          </Typography>
          {apy === null ? (
            <Skeleton variant="text" width={80} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4ADE80', flexShrink: 0, boxShadow: '0 0 0 2px rgba(74,222,128,0.25)' }} />
              <Typography sx={{ fontSize: '22px', fontWeight: 700, fontFamily: MONO, letterSpacing: '-0.03em', color: '#4ADE80', lineHeight: 1.1 }}>
                {Number(apy).toFixed(2)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Earnings chart */}
      <SavingsChart
        walletAddress={walletAddress}
        currentEarnings={earnings}
        lifetimeEarnings={lifetimeEarnings}
        currentBalance={currentValue}
        apy={apy}
      />
    </Box>
  );
}
