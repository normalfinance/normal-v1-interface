'use client';

import React, { useState } from 'react';

import CheckIcon from '@mui/icons-material/Check';
import { Box, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const GRADIENT =
  'linear-gradient(90deg, #5BCFFF 0%, #6E8BFF 28%, #B17BFF 55%, #FF7BC5 78%, #FFB060 100%)';

const EMAIL = 'hello@normalfinance.io';

const META = [
  { label: 'Avg. response', value: '8 hours' },
  { label: 'Based in', value: 'Chicago, USA' },
];

export const ContactHero: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#0A0A0F',
        pt: { xs: '80px', md: '110px' },
        pb: { xs: '64px', md: '96px' },
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

      {/* Content */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: '40px', md: '80px' },
            alignItems: 'center',
          }}
        >
          {/* Left: text */}
          <Box>
            {/* Live pill */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                px: '16px',
                py: '8px',
                borderRadius: '100px',
                bgcolor: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.75)',
                mb: '28px',
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: '#4ADE80',
                  flexShrink: 0,
                  boxShadow: '0 0 0 2px rgba(74,222,128,0.3)',
                }}
              />
              We reply fast
            </Box>

            <Typography
              component="h1"
              sx={{
                fontWeight: 500,
                fontSize: { xs: '2.5rem', sm: '3.25rem', md: '3.75rem', lg: '4.25rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                mb: '24px',
                color: '#FFFFFF',
              }}
            >
              {"Let's "}
              <Box
                component="span"
                sx={{
                  background: GRADIENT,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                talk.
              </Box>
            </Typography>

            <Typography
              sx={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.75,
                mb: '36px',
                maxWidth: '480px',
              }}
            >
              Whether you have a question about savings, want to report a bug, or are interested in
              partnering — drop us a line and a real human will respond.
            </Typography>

            {/* Meta row */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: '24px', sm: '36px' },
                pt: '28px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                flexWrap: 'wrap',
              }}
            >
              {META.map((item) => (
                <Box key={item.label}>
                  <Box
                    sx={{
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      mb: '5px',
                    }}
                  >
                    {item.label}
                  </Box>
                  <Box
                    sx={{
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#FFFFFF',
                      letterSpacing: '-0.01em',
                      fontFamily: '"Geist Mono", "Courier New", monospace',
                    }}
                  >
                    {item.value}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Right: email card */}
          <Box
            sx={{
              background: `linear-gradient(135deg, rgba(91,207,255,0.25) 0%, rgba(177,123,255,0.25) 50%, rgba(255,123,197,0.25) 100%)`,
              borderRadius: '20px',
              p: '2px',
            }}
          >
            <Box
              sx={{
                bgcolor: '#111118',
                borderRadius: '18px',
                p: { xs: '28px', md: '40px' },
              }}
            >
              <Typography
                sx={{
                  fontSize: '11px',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                  mb: '20px',
                }}
              >
                — Drop us a line
              </Typography>

              <Box
                component="a"
                href={`mailto:${EMAIL}`}
                sx={{
                  display: 'block',
                  fontSize: { xs: '18px', md: '22px' },
                  fontWeight: 400,
                  fontFamily: '"Geist Mono", "Courier New", monospace',
                  letterSpacing: '-0.02em',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  mb: '28px',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                {EMAIL}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: '12px',
                  pt: '24px',
                  borderTop: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <Tooltip title={copied ? 'Copied!' : 'Copy email'} placement="top">
                  <Box
                    onClick={handleCopy}
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '8px',
                      px: '16px',
                      py: '10px',
                      borderRadius: '100px',
                      bgcolor: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.75)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.13)' },
                    }}
                  >
                    {copied ? (
                      <CheckIcon sx={{ fontSize: 14, color: '#4ADE80' }} />
                    ) : (
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    )}
                    {copied ? 'Copied!' : 'Copy address'}
                  </Box>
                </Tooltip>

                <Box
                  component="a"
                  href={`mailto:${EMAIL}`}
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    px: '16px',
                    py: '10px',
                    borderRadius: '100px',
                    bgcolor: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0A0A0F',
                    textDecoration: 'none',
                    transition: 'opacity 150ms ease',
                    '&:hover': { opacity: 0.88 },
                  }}
                >
                  Open messaging app
                  <ArrowForwardIcon sx={{ fontSize: 14 }} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ContactHero;
