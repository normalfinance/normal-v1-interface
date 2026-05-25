'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';

const GRADIENT =
  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

const SMALL_CARDS = [
  {
    eyebrow: 'Cash in & out',
    title: '50+ countries, one tap.',
    description:
      'Fiat ramps via Stripe, Coinbase, MoonPay, SEPA and ACH. Deposits clear in minutes, not days.',
  },
  {
    eyebrow: 'Full transparency',
    title: 'Every balance, on-chain.',
    description:
      'Verify each rate, balance and transaction yourself. No black boxes, no asterisks, no surprises.',
  },
  {
    eyebrow: 'More assets coming',
    title: 'Crypto, equities and RWAs.',
    description:
      'BTC and ETH next. Tokenized treasuries and ETFs after that. One account, every asset.',
  },
];

export const RoadmapBento: React.FC = () => (
  <Box
    component="section"
    sx={{ bgcolor: '#FAFAFB', pt: { xs: '40px', md: '56px' }, pb: { xs: '80px', md: '110px' } }}
  >
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
      {/* Header */}
      <Typography
        sx={{
          fontSize: '11px',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: '#6B6B76',
          mb: 1.5,
        }}
      >
        — What we're building right now
      </Typography>
      <Typography
        component="h2"
        sx={{
          fontWeight: 500,
          fontSize: 'clamp(32px, 4vw, 50px)',
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: '#0A0A0F',
          mb: '8px',
        }}
      >
        The next 90 days.
      </Typography>
      <Typography sx={{ fontSize: '16px', color: '#6B6B76', lineHeight: 1.55, mb: '48px' }}>
        A snapshot of the work in motion. Specifics may shift, but the direction stays.
      </Typography>

      {/* Bento grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(6, 1fr)' },
          gridAutoRows: 'minmax(220px, auto)',
          gap: '14px',
        }}
      >
        {/* Big card */}
        <Box
          sx={{
            gridColumn: { xs: '1', md: '1 / -1' },
            bgcolor: '#FFFFFF',
            border: '1px solid rgba(10,10,15,0.08)',
            borderRadius: '22px',
            p: '28px',
            transition: 'box-shadow 250ms ease',
            '&:hover': { boxShadow: '0 1px 2px rgba(10,10,15,0.04), 0 8px 32px rgba(10,10,15,0.05)' },
          }}
        >
          <Typography
            sx={{
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B76',
              mb: '8px',
            }}
          >
            In progress · #1
          </Typography>
          <Typography
            component="h3"
            sx={{
              fontSize: { xs: '22px', md: '28px' },
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: '#0A0A0F',
              mb: '10px',
              maxWidth: '700px',
            }}
          >
            A USDC savings account that{' '}
            <Box
              component="span"
              sx={{
                background: GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              pays real yield
            </Box>
            , automatically.
          </Typography>
          <Typography
            sx={{
              fontSize: '15px',
              color: '#6B6B76',
              lineHeight: 1.55,
              maxWidth: '600px',
              mb: '28px',
            }}
          >
            Auto-compounded into audited Stellar lending pools. No active management, no claiming,
            no gas. Open and earn in under 60 seconds.
          </Typography>

          {/* Stats */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'stretch',
              gap: '28px',
              pt: '24px',
              borderTop: '1px solid rgba(10,10,15,0.04)',
              flexWrap: 'wrap',
            }}
          >
            {[
              { value: '8.09%', label: 'Current APY' },
              { value: '$24M+', label: 'Deposits' },
              { value: '0', label: 'Lockups' },
            ].map((stat, i, arr) => (
              <Box key={stat.label} sx={{ display: 'flex', alignItems: 'stretch', gap: '28px' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <Typography
                    sx={{
                      fontSize: '28px',
                      fontWeight: 500,
                      color: '#0A0A0F',
                      letterSpacing: '-0.02em',
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#6B6B76',
                      fontWeight: 500,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
                {i < arr.length - 1 && (
                  <Box sx={{ width: '1px', bgcolor: 'rgba(10,10,15,0.04)', flexShrink: 0 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Small cards */}
        {SMALL_CARDS.map((card) => (
          <Box
            key={card.eyebrow}
            sx={{
              gridColumn: { xs: '1', md: 'span 2' },
              bgcolor: '#FFFFFF',
              border: '1px solid rgba(10,10,15,0.08)',
              borderRadius: '22px',
              p: '28px',
              transition: 'box-shadow 250ms ease',
              '&:hover': { boxShadow: '0 1px 2px rgba(10,10,15,0.04), 0 8px 32px rgba(10,10,15,0.05)' },
            }}
          >
            <Typography
              sx={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#6B6B76',
                mb: '8px',
              }}
            >
              {card.eyebrow}
            </Typography>
            <Typography
              component="h3"
              sx={{
                fontSize: '22px',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                color: '#0A0A0F',
                mb: '10px',
              }}
            >
              {card.title}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: '#6B6B76', lineHeight: 1.55 }}>
              {card.description}
            </Typography>
          </Box>
        ))}

        {/* Promise card (dark) */}
        <Box
          sx={{
            gridColumn: { xs: '1', md: '1 / -1' },
            position: 'relative',
            overflow: 'hidden',
            bgcolor: '#0A0A0F',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '22px',
            p: '28px',
            isolation: 'isolate',
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background:
                'radial-gradient(closest-side at 15% 100%, rgba(91,207,255,0.20), transparent 65%), radial-gradient(closest-side at 100% 0%, rgba(177,123,255,0.25), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              sx={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
                mb: '8px',
              }}
            >
              Our promise
            </Typography>
            <Typography
              component="h3"
              sx={{
                fontSize: { xs: '22px', md: '26px' },
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                color: '#fff',
                mb: '10px',
              }}
            >
              Transparency. Safety. Long term.
            </Typography>
            <Typography
              sx={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.55,
                maxWidth: '560px',
                mb: '16px',
              }}
            >
              We default to transparency, prioritize your safety, and build for the long term — not
              the hype cycle. Help shape what Normal becomes next.
            </Typography>
            <Box
              component="a"
              href="/contact"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                mt: '4px',
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                px: '14px',
                py: '8px',
                borderRadius: '100px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background 150ms ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.14)' },
              }}
            >
              Share your feedback →
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

export default RoadmapBento;
