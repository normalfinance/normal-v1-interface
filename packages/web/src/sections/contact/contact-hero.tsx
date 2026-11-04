'use client';

import React, { useState } from 'react';

import { Box, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import {
  Eyebrow,
  LiveDot,
  HeroLede,
  MetaItem,
  HeroBadge,
  HeroTitle,
  MONO_FONT,
  BrandButton,
  PageSection,
  GradientText,
  HAIRLINE_ON_DARK,
  BLOCK_ON_DARK_SX,
} from '@/components/_common/brand';

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
    <PageSection tone="dark">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '1fr 1fr' },
          gap: { xs: 5, md: 10 },
          alignItems: 'center',
        }}
      >
        {/* Left: text */}
        <Box>
          <HeroBadge tone="dark">
            <LiveDot tone="dark" />
            We reply fast
          </HeroBadge>

          <HeroTitle tone="dark">
            {"Let's "}
            <GradientText>talk.</GradientText>
          </HeroTitle>

          <HeroLede tone="dark">
            Whether you have a question about savings, want to report a bug, or are interested in
            partnering — drop us a line and a real human will respond.
          </HeroLede>

          {/* Meta row */}
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 3, sm: 5 },
              mt: 5,
              pt: 3,
              borderTop: HAIRLINE_ON_DARK,
              flexWrap: 'wrap',
            }}
          >
            {META.map((item) => (
              <MetaItem key={item.label} tone="dark" label={item.label} value={item.value} />
            ))}
          </Box>
        </Box>

        {/* Right: email card */}
        <Box sx={{ ...BLOCK_ON_DARK_SX, p: { xs: '24px', md: '32px' } }}>
          <Eyebrow tone="dark" sx={{ mb: 2 }}>
            Drop us a line
          </Eyebrow>

          <Box
            component="a"
            href={`mailto:${EMAIL}`}
            sx={{
              display: 'block',
              fontSize: { xs: '18px', md: '22px' },
              fontWeight: 400,
              fontFamily: MONO_FONT,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
              textDecoration: 'none',
              mb: 3,
              overflowWrap: 'anywhere',
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
              gap: 1.5,
              pt: 3,
              borderTop: HAIRLINE_ON_DARK,
            }}
          >
            <Tooltip title={copied ? 'Copied!' : 'Copy email'} placement="top">
              <BrandButton
                tone="dark"
                emphasis="secondary"
                onClick={handleCopy}
                startIcon={
                  copied ? (
                    <CheckIcon sx={{ fontSize: 16, color: '#4ADE80' }} />
                  ) : (
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  )
                }
              >
                {copied ? 'Copied!' : 'Copy address'}
              </BrandButton>
            </Tooltip>

            <BrandButton
              tone="dark"
              href={`mailto:${EMAIL}`}
              endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            >
              Open messaging app
            </BrandButton>
          </Box>
        </Box>
      </Box>
    </PageSection>
  );
};

export default ContactHero;
