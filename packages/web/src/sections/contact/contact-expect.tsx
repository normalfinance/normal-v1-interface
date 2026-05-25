'use client';

import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const EMAIL = 'hello@normalfinance.io';

const RESPONSE_TIMES = [
  { label: 'Bug reports', value: '~2h' },
  { label: 'Press & partnerships', value: '~1 day' },
  { label: 'General questions', value: '~8h' },
];

export const ContactExpect: React.FC = () => (
  <Box
    component="section"
    sx={{ bgcolor: '#FAFAFB', py: { xs: '40px', md: '56px' } }}
  >
    <Container maxWidth="xl">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '280px 1fr' },
          gap: { xs: '32px', md: '80px' },
          alignItems: 'start',
        }}
      >
        {/* Left: eyebrow label */}
        <Box>
          <Typography
            sx={{
              fontSize: '11px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#6B6B76',
            }}
          >
            — What to expect
          </Typography>
        </Box>

        {/* Right: content */}
        <Box>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: 'clamp(32px, 4vw, 52px)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              color: '#0A0A0F',
              mb: '20px',
            }}
          >
            One inbox, routed by humans.
          </Typography>

          <Typography
            sx={{
              fontSize: '16px',
              color: '#6B6B76',
              lineHeight: 1.65,
              mb: '40px',
              maxWidth: '560px',
            }}
          >
            Everything lands in{' '}
            <Box
              component="a"
              href={`mailto:${EMAIL}`}
              sx={{
                color: '#0A0A0F',
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {EMAIL}
            </Box>
            {' '}and gets triaged by a real person — not a bot. We route by topic so you always
            hear from someone who actually knows the answer.
          </Typography>

          {/* Response times grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              border: '1px solid rgba(10,10,15,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
              boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(10,10,15,0.04)',
            }}
          >
            {RESPONSE_TIMES.map((item, i) => (
              <Box
                key={item.label}
                sx={{
                  px: { xs: '24px', md: '32px' },
                  py: { xs: '20px', md: '28px' },
                  borderRight: {
                    xs: 'none',
                    sm: i < RESPONSE_TIMES.length - 1 ? '1px solid rgba(10,10,15,0.07)' : 'none',
                  },
                  borderBottom: {
                    xs: i < RESPONSE_TIMES.length - 1 ? '1px solid rgba(10,10,15,0.07)' : 'none',
                    sm: 'none',
                  },
                }}
              >
                <Typography
                  sx={{
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#9A9AA3',
                    mb: '8px',
                  }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '28px',
                    fontWeight: 400,
                    color: '#0A0A0F',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    fontFamily: '"Geist Mono", "Courier New", monospace',
                  }}
                >
                  {item.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  </Box>
);

export default ContactExpect;
