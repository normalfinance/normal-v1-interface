'use client';

import * as React from 'react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import { styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

type Testimonial = {
  body: string;
  name: string;
  role: string;
  avatar: string;
};

const ALL: Testimonial[] = [
  {
    body: `"In portfolios, you're not just investing in assets; you're investing in teams. The Normal team's drive and positive energy are truly building something special that's inclusive to everyone."`,
    name: 'Raphael Fortin',
    role: 'Co-founder at Lumen Loop',
    avatar: cdn('testimonials/6.webp'),
  },
  {
    body: `"I believe in the Normal Team and their mission of index funds. I look forward to supporting them!"`,
    name: 'Nima Beheshtian',
    role: 'Head of Business at Luganodes',
    avatar: cdn('testimonials/12.webp'),
  },
  {
    body: `"Normal has made transitioning from traditional finance to DeFi effortless by streamlining the entire investing process. It serves as the perfect bridge connecting the old world with the new."`,
    name: 'Clair Gamoke',
    role: 'Head of Community at Bitcoin OS',
    avatar: cdn('testimonials/13.webp'),
  },
  {
    body: `"The Normal team is a beast and their product is awesome! I aspire to be Normal!"`,
    name: 'Srijeth Padmesh',
    role: 'Growth at Reclaim Protocol',
    avatar: cdn('testimonials/11.webp'),
  },
  {
    body: `"Normal index funds make financial freedom easy for my family."`,
    name: 'Richie Lewis',
    role: 'Professional Fighter and World Champion Wrestler',
    avatar: cdn('testimonials/7.webp'),
  },
  {
    body: `"Normal has the best team and makes investing simpler, smarter, and exactly how it should be."`,
    name: 'Zahid Valencia',
    role: 'Professional USA Wrestler',
    avatar: cdn('testimonials/8.webp'),
  },
  {
    body: `"Normal makes investing automated and customizable, perfect for users to diversify."`,
    name: 'Roshan Vadassery',
    role: 'Founder of Permissionaless.net and Crypto Influencer',
    avatar: cdn('testimonials/10.webp'),
  },
  {
    body: `"The Normal Team is legendary and their vision is clear with Normal index funds."`,
    name: 'Shabbir Khan',
    role: 'Investment Partner at EAK Ventures',
    avatar: cdn('testimonials/14.webp'),
  },
  {
    body: `"Normal saves me time and money — all while being as easy to use as my traditional banking apps."`,
    name: 'Devin Kopp',
    role: 'Co-founder @ Rodeo Money',
    avatar: cdn('testimonials/1.webp'),
  },
  {
    body: `"Normal is a platform that simplifies investing. The platform is very clean and easy to use."`,
    name: 'Victor Acevedo',
    role: 'An OG normie',
    avatar: cdn('testimonials/3.webp'),
  },
];

// Row 1: original order. Row 2: reversed — they scroll in opposite directions.
const row1Base = ALL;
const row2Base = [...ALL].reverse();

// ----------------------------------------------------------------------

const SectionRoot = styled('section')({
  backgroundColor: '#fff',
});

const CarouselWrapper = styled('div')({
  position: 'relative',
  overflowX: 'clip',
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    pointerEvents: 'none',
    zIndex: 2,
  },
  '&::before': {
    left: 0,
    background: 'linear-gradient(90deg, #fff, transparent)',
  },
  '&::after': {
    right: 0,
    background: 'linear-gradient(-90deg, #fff, transparent)',
  },
  '&:hover .testi-row': {
    animationPlayState: 'paused',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& .testi-row': {
      animationPlayState: 'paused',
    },
  },
});

const Row = styled('div')<{ direction: 'left' | 'right' }>(({ direction }) => ({
  display: 'flex',
  gap: 16,
  width: 'max-content',
  willChange: 'transform',
  ...(direction === 'left'
    ? {
        animation: 'testi-scroll-left 70s linear infinite',
        '@keyframes testi-scroll-left': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      }
    : {
        animation: 'testi-scroll-right 90s linear infinite',
        '@keyframes testi-scroll-right': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
      }),
}));

const Card = styled('figure')({
  margin: 0,
  width: 360,
  flexShrink: 0,
  backgroundColor: '#fafafa',
  border: '1px solid #e8e8ec',
  borderRadius: 18,
  padding: 22,
  minHeight: 200,
  display: 'flex',
  flexDirection: 'column',
});

// ----------------------------------------------------------------------

type CardProps = { testimonial: Testimonial; hidden?: boolean };

const TestimonialCard: React.FC<CardProps> = ({ testimonial, hidden }) => (
  <Card aria-hidden={hidden || undefined}>
    <Box
      component="blockquote"
      sx={{
        m: 0,
        fontSize: 15,
        lineHeight: 1.5,
        color: '#0a0a0b',
        letterSpacing: '-0.005em',
        flex: 1,
      }}
    >
      {testimonial.body}
    </Box>

    <Box
      component="figcaption"
      sx={{
        mt: 'auto',
        pt: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <Avatar
        src={testimonial.avatar}
        alt={testimonial.name}
        sx={{ width: 32, height: 32 }}
      />
      <Box>
        <Box
          component="span"
          sx={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: '#0a0a0b' }}
        >
          {testimonial.name}
        </Box>
        <Box
          component="span"
          sx={{ display: 'block', fontSize: 12.5, color: '#6b6b76' }}
        >
          {testimonial.role}
        </Box>
      </Box>
    </Box>
  </Card>
);

// ----------------------------------------------------------------------

export type TestimonialGridProps = React.ComponentPropsWithoutRef<'section'>;

export const TestimonialGrid: React.FC<TestimonialGridProps> = (props) => {
  const { t } = useTranslate();

  return (
    <SectionRoot aria-labelledby="testimonials-heading" {...props}>
      <Box sx={{ py: 12 }}>
        {/* Header — constrained */}
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          <Box
            component="p"
            sx={{
              m: 0,
              mb: '14px',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#6b6b76',
            }}
          >
            {t('— Loved by')}
          </Box>

          <Box
            component="h2"
            id="testimonials-heading"
            sx={{
              m: 0,
              fontSize: 'clamp(34px, 4.4vw, 56px)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              color: '#0a0a0b',
            }}
          >
            {t('Loved by')}{' '}
            <Box
              component="span"
              sx={{
                fontStyle: 'italic',
                background: 'linear-gradient(90deg, #2bd2ff 0%, #b561ff 40%, #ff5cb1 70%, #ffb347 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('Normies')}
            </Box>
          </Box>
        </Box>

        {/* Carousel — full-bleed */}
        <CarouselWrapper sx={{ mt: 7, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Row 1 — scrolls left */}
          <Row direction="left" className="testi-row">
            {[...row1Base, ...row1Base].map((item, i) => (
              <TestimonialCard
                key={`r1-${i}`}
                testimonial={item}
                hidden={i >= row1Base.length}
              />
            ))}
          </Row>

          {/* Row 2 — scrolls right */}
          <Row direction="right" className="testi-row">
            {[...row2Base, ...row2Base].map((item, i) => (
              <TestimonialCard
                key={`r2-${i}`}
                testimonial={item}
                hidden={i >= row2Base.length}
              />
            ))}
          </Row>
        </CarouselWrapper>
      </Box>
    </SectionRoot>
  );
};

TestimonialGrid.displayName = 'TestimonialGrid';

export default TestimonialGrid;
