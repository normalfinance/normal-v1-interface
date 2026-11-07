'use client';

import type { ReactNode } from 'react';
import type { BrandHue } from '@/theme/brand-colors';

import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { useRef, useState, useEffect } from 'react';
import { GUTTER_SX, COLUMN_SX } from '@/theme/site-grid';
import { INK, MUTED, CANVAS, BLOCK_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';

import { BrandButton } from '@/components/_common/brand';

import { PhoneHomeScreen } from './hero-phone';
import { SendScreen, SwapScreen, PhoneDevice, SavingsScreen, AddMoneyScreen } from './cta-phones';

// ----------------------------------------------------------------------

type Link = { label: string; href: string };

type Slide = {
  /** The slide's name, for screen readers. */
  name: string;
  hue: BrandHue;
  title: string;
  lede: string;
  primary: Link;
  secondary: Link;
  checks: string[];
  /** Fine print under the checks. */
  note?: string;
  screen: ReactNode;
};

const SIGN_UP: Link = { label: 'Open a free account', href: paths.auth.signup };
const HOW: Link = { label: 'How it works', href: paths.site.how };

// One ask per slide, each a solid block of its colour, in the logo's order:
// light blue, purple, magenta, coral, yellow. The words are the site's own
// (the product cards, Savings); the figures on the phones are examples.
const SLIDES: Slide[] = [
  {
    name: 'Get started',
    hue: 'sky',
    title: 'Ready when you are.',
    lede: 'Open a free account in a few minutes and see for yourself.',
    primary: SIGN_UP,
    secondary: { label: 'Talk to us', href: paths.core.contact },
    checks: ['Free to open', 'Only an email needed', 'Withdraw savings any time'],
    screen: <PhoneHomeScreen balance={4330.5} showToast={false} showPayment />,
  },
  {
    name: 'Swap',
    hue: 'violet',
    title: 'Dollars to crypto.',
    lede: 'Switch between digital dollars and Bitcoin, Ethereum or Solana. You see the rate and the fee before you confirm.',
    primary: SIGN_UP,
    secondary: HOW,
    checks: ['Rate and fee shown first', 'Nothing moves until you confirm'],
    screen: <SwapScreen />,
  },
  {
    name: 'Send',
    hue: 'magenta',
    title: 'Send it anywhere.',
    lede: 'Pay friends and family on Stellar, Bitcoin, Ethereum or Solana, in seconds.',
    primary: SIGN_UP,
    secondary: HOW,
    checks: ['Four networks', 'Delivered in seconds'],
    screen: <SendScreen />,
  },
  {
    name: 'Add money',
    hue: 'coral',
    title: 'Add money, fast.',
    lede: 'Use your card or a bank transfer, through our licensed partners.',
    primary: SIGN_UP,
    secondary: HOW,
    checks: ['Card or bank transfer', 'Licensed partners'],
    screen: <AddMoneyScreen />,
  },
  {
    name: 'Savings',
    hue: 'yellow',
    title: 'Earn every day.',
    lede: 'Move digital dollars into Savings and they grow every day. Take them out whenever you want.',
    primary: { label: 'Start saving', href: paths.savings },
    secondary: HOW,
    checks: ['Earnings added daily', 'No lock-up'],
    note: 'The yield changes with the market and is never guaranteed.',
    screen: <SavingsScreen />,
  },
];

// The track's side padding: from the screen's edge to the column's, so each
// slide snaps to the column and its neighbours show past the frame lines.
const EDGE = 'calc((100% - min(var(--page-max), 100% - 2 * var(--frame-inset, 0px))) / 2)';

/** One slide: the ask on the left at display size, the app on the right. */
function SlideBlock({ slide, index }: { slide: Slide; index: number }) {
  // Bright on the white page, the deep shade for the words; the dark mode's
  // own tones on the dark page (BLOCK_COLORS).
  const { surface, words } = BLOCK_COLORS[slide.hue];

  return (
    <Box
      data-slide
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${SLIDES.length}: ${slide.name}`}
      sx={{
        flex: '0 0 100%',
        scrollSnapAlign: 'start',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
        overflow: 'hidden',
        color: words,
        bgcolor: surface,
      }}
    >
      <Box sx={{ ...GUTTER_SX, py: { xs: 8, md: 14 } }}>
        <Typography component="h2" sx={{ ...TYPE.display, color: 'inherit' }}>
          {slide.title}
        </Typography>
        <Typography sx={{ ...TYPE.lead, mt: 3, maxWidth: 480, color: 'inherit' }}>
          {slide.lede}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4.5 }}>
          {/* The block's own colours, swapped. */}
          <BrandButton
            href={slide.primary.href}
            sx={{ color: surface, bgcolor: words, '&:hover': { bgcolor: words, opacity: 0.88 } }}
          >
            {slide.primary.label}
          </BrandButton>
          <BrandButton
            emphasis="secondary"
            href={slide.secondary.href}
            sx={{
              color: 'inherit',
              bgcolor: 'transparent',
              borderColor: 'currentColor',
              '&:hover': { bgcolor: 'transparent', borderColor: 'currentColor', opacity: 0.8 },
            }}
          >
            {slide.secondary.label}
          </BrandButton>
        </Stack>
        <Box
          component="ul"
          sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1, mt: 4 }}
        >
          {slide.checks.map((item) => (
            <Box
              component="li"
              key={item}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              <CheckCircleOutlineRounded sx={{ fontSize: 18 }} />
              <Typography sx={{ ...TYPE.small, color: 'inherit' }}>{item}</Typography>
            </Box>
          ))}
        </Box>
        {slide.note && (
          <Typography sx={{ ...TYPE.caption, mt: 2, maxWidth: 480, color: 'inherit' }}>
            {slide.note}
          </Typography>
        )}
      </Box>

      <Box sx={{ position: 'relative', minHeight: { xs: 360, md: 'auto' } }}>
        <PhoneDevice>{slide.screen}</PhoneDevice>
      </Box>
    </Box>
  );
}

const arrowSx = {
  width: 44,
  height: 44,
  color: INK,
  border: `1px solid ${HAIRLINE_COLOR}`,
  borderRadius: 'var(--radius-site)',
  '&:hover': { bgcolor: CANVAS },
  '&.Mui-disabled': { color: MUTED, opacity: 0.5 },
} as const;

/**
 * The close, before the footer, on every page that has one: a carousel of
 * asks, each a solid block in its own colour with a real screen of the app
 * beside it. One slide fills the column at a time and its neighbours show past
 * the frame lines. It moves only when the visitor moves it: previous and next
 * under it, a swipe on phones.
 */
export function HomeCta() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const update = () => {
      setAtStart(track.scrollLeft <= 4);
      setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
    };
    update();
    track.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  const page = (direction: 1 | -1) => {
    const track = trackRef.current;
    const width = track?.querySelector<HTMLElement>('[data-slide]')?.offsetWidth;
    if (!track || !width) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direction * width, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <Box
      component="section"
      aria-roledescription="carousel"
      aria-label="Get started with Normal"
      sx={{ borderTop: `1px solid ${HAIRLINE_COLOR}` }}
    >
      <Box
        ref={trackRef}
        sx={{
          display: 'flex',
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          px: EDGE,
          scrollPaddingInline: EDGE,
        }}
      >
        {SLIDES.map((slide, index) => (
          <SlideBlock key={slide.name} slide={slide} index={index} />
        ))}
      </Box>

      <Stack
        direction="row"
        justifyContent="flex-end"
        gap={1}
        sx={{ ...COLUMN_SX, ...GUTTER_SX, py: 2.5 }}
      >
        <IconButton
          aria-label="Previous slide"
          disabled={atStart}
          onClick={() => page(-1)}
          sx={arrowSx}
        >
          <ArrowBackRounded />
        </IconButton>
        <IconButton aria-label="Next slide" disabled={atEnd} onClick={() => page(1)} sx={arrowSx}>
          <ArrowForwardRounded />
        </IconButton>
      </Stack>
    </Box>
  );
}
