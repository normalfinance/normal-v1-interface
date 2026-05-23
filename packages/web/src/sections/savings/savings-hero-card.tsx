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
  apy: number | null;
  loading: boolean;
  walletAddress?: string;
}

function StatBox({
  label,
  value,
  accent,
  loading,
}: {
  label: string;
  value: string;
  accent?: boolean;
  loading: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <Typography
        sx={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width={90} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
      ) : (
        <Typography
          sx={{
            fontSize: '22px',
            fontWeight: 700,
            fontFamily: MONO,
            letterSpacing: '-0.03em',
            color: accent ? '#4ADE80' : '#FFFFFF',
            lineHeight: 1.1,
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );
}

export function SavingsHeroCard({
  currentValue,
  totalDeposited,
  earnings,
  apy,
  loading,
  walletAddress,
}: SavingsHeroCardProps) {
  const earningsPct =
    totalDeposited > 0 ? ((earnings / totalDeposited) * 100).toFixed(2) : '0.00';

  const estAnnual = apy !== null ? currentValue * (apy / 100) : null;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

      {/* Stats row — explicit 9-col template keeps all 5 stats + 4 dividers in one row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            sm: '1fr 1px 1fr 1px 1fr 1px 1fr 1px 1fr',
          },
          columnGap: { sm: '28px' },
          rowGap: { xs: '24px', sm: '0' },
        }}
      >
        <StatBox
          label="Current Balance"
          value={`$${fmt(currentValue)}`}
          loading={loading && currentValue === 0}
        />

        <Box sx={DIVIDER_SX} />

        <StatBox
          label="Total Deposited"
          value={`$${fmt(totalDeposited)}`}
          loading={loading && totalDeposited === 0}
        />

        <Box sx={DIVIDER_SX} />

        <StatBox
          label={`Earnings (+${earningsPct}%)`}
          value={`$${fmt(earnings)}`}
          accent={earnings > 0}
          loading={loading && earnings === 0}
        />

        <Box sx={DIVIDER_SX} />

        {/* Est. Annual — projected yearly yield at current balance + APY */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.02em',
            }}
          >
            Est. Annual
          </Typography>
          {estAnnual === null || loading ? (
            <Skeleton variant="text" width={90} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 700,
                fontFamily: MONO,
                letterSpacing: '-0.03em',
                color: '#FFFFFF',
                lineHeight: 1.1,
              }}
            >
              ${fmt(estAnnual)}
            </Typography>
          )}
        </Box>

        <Box sx={DIVIDER_SX} />

        {/* APY */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Typography
            sx={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.02em',
            }}
          >
            Current APY
          </Typography>
          {apy === null ? (
            <Skeleton variant="text" width={80} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: '#4ADE80',
                  flexShrink: 0,
                  boxShadow: '0 0 0 2px rgba(74,222,128,0.25)',
                }}
              />
              <Typography
                sx={{
                  fontSize: '22px',
                  fontWeight: 700,
                  fontFamily: MONO,
                  letterSpacing: '-0.03em',
                  color: '#4ADE80',
                  lineHeight: 1.1,
                }}
              >
                {Number(apy).toFixed(2)}%
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Earnings chart */}
      <SavingsChart walletAddress={walletAddress} currentEarnings={earnings} apy={apy} />
    </Box>
  );
}
