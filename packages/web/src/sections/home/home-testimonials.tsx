'use client';

import type { HueShades } from '@/theme/brand-colors';

import { cdn } from '@/utils/cdn';
import { TYPE } from '@/theme/type-scale';
import { useRef, useState, useEffect } from 'react';
import { INK, MUTED, CANVAS, BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';

import { FRAME_MQ, PageSection, SectionHeader } from '@/components/_common/brand';

// ----------------------------------------------------------------------

// Every quote from the previous site, unchanged, each on a pale wash with the
// words in that colour's text shade. The tints repeat in a fixed order, chosen
// so no two neighbours clash.
const ORDER: HueShades[] = [
  BRAND_COLORS.sky,
  BRAND_COLORS.mint,
  BRAND_COLORS.violet,
  BRAND_COLORS.coral,
  BRAND_COLORS.magenta,
  BRAND_COLORS.yellow,
];

const QUOTES: { body: string; name: string; role: string; avatar: string }[] = [
  {
    body: 'Normal saves me time and money, all while being as easy to use as my traditional banking apps.',
    name: 'Devin Kopp',
    role: 'Co-founder, Rodeo Money',
    avatar: cdn('testimonials/1.webp'),
  },
  {
    body: 'Normal has made transitioning from traditional finance to DeFi effortless by streamlining the entire investing process. It serves as the perfect bridge connecting the old world with the new.',
    name: 'Clair Gamoke',
    role: 'Head of Community, Bitcoin OS',
    avatar: cdn('testimonials/13.webp'),
  },
  {
    body: 'Normal is a platform that simplifies investing. The platform is very clean and easy to use.',
    name: 'Victor Acevedo',
    role: 'An OG normie',
    avatar: cdn('testimonials/3.webp'),
  },
  {
    body: "In portfolios, you're not just investing in assets; you're investing in teams. The Normal team's drive and positive energy are truly building something special that's inclusive to everyone.",
    name: 'Raphael Fortin',
    role: 'Co-founder, Lumen Loop',
    avatar: cdn('testimonials/6.webp'),
  },
  {
    body: 'Normal makes investing automated and customizable, perfect for users to diversify.',
    name: 'Roshan Vadassery',
    role: 'Founder, Permissionaless.net',
    avatar: cdn('testimonials/10.webp'),
  },
  {
    body: 'Normal has the best team and makes investing simpler, smarter, and exactly how it should be.',
    name: 'Zahid Valencia',
    role: 'Professional wrestler, USA',
    avatar: cdn('testimonials/8.webp'),
  },
  {
    body: 'Normal index funds make financial freedom easy for my family.',
    name: 'Richie Lewis',
    role: 'Professional fighter and world champion wrestler',
    avatar: cdn('testimonials/7.webp'),
  },
  {
    body: 'I believe in the Normal team and their mission. I look forward to supporting them!',
    name: 'Nima Beheshtian',
    role: 'Head of Business, Luganodes',
    avatar: cdn('testimonials/12.webp'),
  },
  {
    body: 'The Normal team is a beast and their product is awesome! I aspire to be Normal!',
    name: 'Srijeth Padmesh',
    role: 'Growth, Reclaim Protocol',
    avatar: cdn('testimonials/11.webp'),
  },
  {
    body: 'The Normal team is legendary and their vision is clear.',
    name: 'Shabbir Khan',
    role: 'Investment Partner, EAK Ventures',
    avatar: cdn('testimonials/14.webp'),
  },
];

/** A row of quote cards that scrolls sideways, with arrows and keyboard scrolling. */
export function HomeTestimonials() {
  const trackRef = useRef<HTMLUListElement>(null);
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
    if (!track) return;
    const card = track.querySelector('li');
    const step = card ? card.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  const arrow = (direction: 1 | -1, disabled: boolean) => (
    <IconButton
      aria-label={direction === 1 ? 'Next quotes' : 'Previous quotes'}
      disabled={disabled}
      onClick={() => page(direction)}
      sx={{
        width: 44,
        height: 44,
        color: INK,
        border: `1px solid ${HAIRLINE_COLOR}`,
        borderRadius: 'var(--radius-site)',
        '&:hover': { bgcolor: CANVAS },
        '&.Mui-disabled': { color: MUTED, opacity: 0.5 },
      }}
    >
      {direction === 1 ? <ArrowForwardRounded /> : <ArrowBackRounded />}
    </IconButton>
  );

  return (
    <PageSection divider aria-labelledby="quotes-title" sx={{ overflow: 'visible' }}>
      <SectionHeader
        id="quotes-title"
        eyebrow="What people say"
        title="Made for people, not traders"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {arrow(-1, atStart)}
            {arrow(1, atEnd)}
          </Box>
        }
      />
      <Box
        component="ul"
        ref={trackRef}
        tabIndex={0}
        aria-label="Quotes from people who use Normal"
        sx={{
          display: 'flex',
          gap: 2,
          // The track reaches the frame lines; the cards start at the gutter, and
          // snapping keeps them there (scroll-padding matches the padding).
          mx: { xs: -2, sm: -3 },
          px: { xs: 2, sm: 3 },
          scrollPaddingInline: { xs: '16px', sm: '24px' },
          [FRAME_MQ]: { mx: -4, px: 4, scrollPaddingInline: '32px' },
          pb: 1,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 4 },
        }}
      >
        {QUOTES.map((quote, index) => {
          const hue = ORDER[index % ORDER.length];
          return (
            <Box
              component="li"
              key={quote.name}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: '0 0 auto',
                width: { xs: 'min(86vw, 380px)', md: 400 },
                p: { xs: 3, md: 4 },
                scrollSnapAlign: 'start',
                borderRadius: 'var(--radius-site)',
                // Every word on the wash in its deep shade, as on customer.io's cards.
                color: hue.deep,
                bgcolor: hue.tint,
              }}
            >
              <Typography
                component="blockquote"
                sx={{
                  m: 0,
                  ...TYPE.h4,
                  fontSize: 24,
                  lineHeight: 1.35,
                  color: 'inherit',
                }}
              >
                &ldquo;{quote.body}&rdquo;
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto', pt: 4 }}>
                <Box
                  component="img"
                  src={quote.avatar}
                  alt=""
                  loading="lazy"
                  sx={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                />
                <Box>
                  <Typography sx={{ ...TYPE.small, fontWeight: 500, color: 'inherit' }}>
                    {quote.name}
                  </Typography>
                  <Typography sx={{ ...TYPE.caption, color: 'inherit' }}>{quote.role}</Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </PageSection>
  );
}
