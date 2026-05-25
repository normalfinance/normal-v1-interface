'use client';

import { useTranslate } from '@/locales';
import { fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

import {
  MONO,
  DONUT_COLORS,
  DONUT_R,
  DONUT_SIZE,
  DONUT_CX,
  DONUT_CY,
  DONUT_CIRC,
  DONUT_STROKE,
  DONUT_GAP,
} from './_shared';
import type { HoldingData } from './_shared';

// -------------------------------------------------------------------
// DonutChart
// -------------------------------------------------------------------
function DonutChart({ holdingsData }: { holdingsData: HoldingData[] }) {
  const total = holdingsData.reduce((s, h) => s + h.value, 0);
  if (total === 0) {
    return (
      <svg viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} width={DONUT_SIZE} height={DONUT_SIZE}>
        <circle
          cx={DONUT_CX}
          cy={DONUT_CY}
          r={DONUT_R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={DONUT_STROKE}
        />
      </svg>
    );
  }

  let cumulativePct = 0;
  return (
    <svg viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} width={DONUT_SIZE} height={DONUT_SIZE}>
      <circle
        cx={DONUT_CX}
        cy={DONUT_CY}
        r={DONUT_R}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={DONUT_STROKE}
      />
      {holdingsData.map((h, i) => {
        const pct = h.value / total;
        const dash = Math.max(pct * DONUT_CIRC - DONUT_GAP, 0);
        if (dash <= 0) return null;
        const offset = cumulativePct;
        cumulativePct += pct;
        return (
          <circle
            key={h.token.contract}
            cx={DONUT_CX}
            cy={DONUT_CY}
            r={DONUT_R}
            fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth={DONUT_STROKE}
            strokeDasharray={`${dash} ${DONUT_CIRC - dash}`}
            strokeDashoffset={-(offset * DONUT_CIRC)}
            transform={`rotate(-90 ${DONUT_CX} ${DONUT_CY})`}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}

// -------------------------------------------------------------------
// HeroCard
// -------------------------------------------------------------------
interface HeroCardProps {
  totalBalance: number;
  walletBalance: number;
  savingsValue: number;
  earnings: number;
  loading: boolean;
  holdingsData: HoldingData[];
}

export function HeroCard({
  totalBalance,
  walletBalance,
  savingsValue,
  earnings,
  loading,
  holdingsData,
}: HeroCardProps) {
  const { t } = useTranslate();

  const stats = [
    { label: t('Wallet'), value: fCurrencyTwoDecimals(walletBalance), colored: false, sub: null },
    { label: t('Savings'), value: fCurrencyTwoDecimals(savingsValue), colored: false, sub: null },
    { label: t('Earnings'), value: fCurrencyTwoDecimals(Math.abs(earnings)), colored: true, positive: earnings >= 0, sub: `${Math.abs(earnings).toFixed(7)} USDC` },
  ];

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '22px',
        bgcolor: '#0A0A0F',
        p: { xs: '32px', md: '48px' },
        color: '#fff',
      }}
    >
      {/* Dot grid */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient glow */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: '-20%',
          background: `
            radial-gradient(closest-side at 20% 60%, rgba(91,207,255,0.15), transparent 60%),
            radial-gradient(closest-side at 80% 40%, rgba(177,123,255,0.15), transparent 60%)
          `,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'stretch',
          gap: { xs: '32px', md: '64px' },
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        {/* Left: label + balance + stats */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Top group: label + balance */}
          <Box>
            <Box sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', mb: '10px' }}>
              {t('Total portfolio value')}
            </Box>

            {loading ? (
              <Skeleton
                variant="text"
                width={240}
                height={72}
                sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
              />
            ) : (
              <Box
                sx={{
                  ...MONO,
                  fontSize: 'clamp(42px, 5vw, 68px)',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.05,
                }}
              >
                {fCurrencyTwoDecimals(totalBalance)}
              </Box>
            )}
          </Box>

          {/* Bottom group: stats */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: '20px', md: '32px' },
            }}
          >
            {stats.map((stat) => (
              <Box key={stat.label}>
                <Box sx={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', mb: '6px' }}>
                  {stat.label}
                </Box>
                {loading ? (
                  <Skeleton
                    variant="text"
                    width={80}
                    height={32}
                    sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}
                  />
                ) : (
                  <>
                    <Box
                      sx={{
                        ...MONO,
                        fontSize: '22px',
                        fontWeight: 500,
                        color: stat.colored
                          ? stat.positive
                            ? '#1AB37D'
                            : 'rgba(255,255,255,0.75)'
                          : 'rgba(255,255,255,0.9)',
                      }}
                    >
                      {stat.value}
                    </Box>
                    {stat.sub && (
                      <Box sx={{ ...MONO, fontSize: '12px', color: 'rgba(255,255,255,0.35)', mt: '4px' }}>
                        {stat.sub}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right: donut chart + legend */}
        {!loading && holdingsData.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'row', sm: 'column' },
              alignItems: 'center',
              gap: { xs: '20px', sm: '16px' },
              flexShrink: 0,
            }}
          >
            <DonutChart holdingsData={holdingsData} />

            {/* Legend */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '130px' }}>
              {holdingsData.slice(0, 5).map((h, i) => {
                const pct = totalBalance > 0 ? ((h.value / totalBalance) * 100).toFixed(1) : '0';
                return (
                  <Box
                    key={h.token.contract}
                    sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: DONUT_COLORS[i % DONUT_COLORS.length],
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${DONUT_COLORS[i % DONUT_COLORS.length]}88`,
                      }}
                    />
                    <Box sx={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                      {h.token.symbol}
                    </Box>
                    <Box
                      sx={{
                        ...MONO,
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {pct}%
                    </Box>
                  </Box>
                );
              })}
              {holdingsData.length > 5 && (
                <Box sx={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', pl: '20px' }}>
                  +{holdingsData.length - 5} more
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
