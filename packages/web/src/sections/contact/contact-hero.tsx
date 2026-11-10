'use client';

import type { PageFact } from '@/components/_common/page-hero';

import { TYPE } from '@/theme/type-scale';
import { BRAND_COLORS } from '@/theme/brand-colors';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';

import { PageHero } from '@/components/_common/page-hero';
import {
  Eyebrow,
  GUTTER_SX,
  MONO_FONT,
  BrandButton,
  VISUALLY_HIDDEN_SX,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

const EMAIL = 'hello@normalfinance.io';

// Both are typed in, not measured.
const FACTS: PageFact[] = [
  { label: 'Avg. response', value: '8 hours' },
  { label: 'Based in', value: 'Chicago, USA' },
];

/**
 * The page's one focal point: the address on the sky wash, filling the hero's
 * right-hand cell between the hairlines. Every word on the wash is the deep
 * shade, as on the Savings card.
 */
function EmailCard() {
  const sky = BRAND_COLORS.sky;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard (an insecure page, a refused permission): the address is
      // on screen to copy by hand.
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        ...GUTTER_SX,
        py: 'var(--section-y)',
        color: sky.deep,
        bgcolor: sky.tint,
      }}
    >
      <Eyebrow sx={{ color: 'inherit' }}>Drop us a line</Eyebrow>
      <Box
        component="a"
        href={`mailto:${EMAIL}`}
        sx={{
          ...TYPE.h3,
          mt: 2,
          fontFamily: MONO_FONT,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'inherit',
          textDecoration: 'none',
          overflowWrap: 'anywhere',
          '&:hover': {
            textDecoration: 'underline',
            textDecorationThickness: '1px',
            textUnderlineOffset: '0.18em',
          },
        }}
      >
        {/* Where a narrow cell has to break the address, it breaks after the @. */}
        hello@
        <wbr />
        normalfinance.io
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 'auto', pt: 5 }}>
        <BrandButton href={`mailto:${EMAIL}`} endIcon={<ArrowForwardRounded />}>
          Open messaging app
        </BrandButton>
        <BrandButton
          emphasis="secondary"
          onClick={handleCopy}
          startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />}
          sx={{ bgcolor: 'transparent' }}
        >
          {copied ? 'Copied!' : 'Copy address'}
        </BrandButton>
      </Stack>
      <Box role="status" sx={VISUALLY_HIDDEN_SX}>
        {copied ? 'Email address copied' : ''}
      </Box>
    </Box>
  );
}

/** The facts sit on the hero's 7:5 split, so the line beside the card runs on through them. */
export function ContactHero() {
  return (
    <PageHero
      id="contact-title"
      eyebrow="We reply fast"
      title="Let's talk."
      lede="Whether you have a question about savings, want to report a bug, or are interested in partnering, drop us a line and a real human will respond."
      aside={<EmailCard />}
      facts={FACTS}
    />
  );
}
