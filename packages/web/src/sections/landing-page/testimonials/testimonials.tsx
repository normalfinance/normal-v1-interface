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

// Distribute into 2 columns
const col1 = ALL.filter((_, i) => i % 2 === 0);
const col2 = ALL.filter((_, i) => i % 2 === 1);

// ----------------------------------------------------------------------

const SectionRoot = styled('section')({
  backgroundColor: '#FAFAFB',
  overflow: 'hidden',
});

const Card = styled('figure')({
  margin: 0,
  backgroundColor: '#fff',
  border: '1px solid rgba(10,10,15,0.08)',
  borderRadius: 22,
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  transition: 'border-color 200ms, background 200ms',
  '&:hover': {
    borderColor: 'rgba(10,10,15,0.13)',
    backgroundColor: '#fdfdfd',
  },
});

// ----------------------------------------------------------------------

const TestimonialCard: React.FC<{ testimonial: Testimonial; hidden?: boolean }> = ({
  testimonial,
  hidden,
}) => (
  <Card aria-hidden={hidden || undefined}>
    <Box
      component="blockquote"
      sx={{
        m: 0,
        fontSize: '18px',
        lineHeight: 1.65,
        color: '#3a3a44',
        letterSpacing: '-0.01em',
        flex: 1,
      }}
    >
      {testimonial.body}
    </Box>

    <Box
      component="figcaption"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        pt: '16px',
        borderTop: '1px solid rgba(10,10,15,0.06)',
      }}
    >
      <Avatar
        src={testimonial.avatar}
        alt={testimonial.name}
        sx={{ width: 34, height: 34, flexShrink: 0 }}
      />
      <Box>
        <Box
          component="span"
          sx={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#0a0a0b', lineHeight: 1.3 }}
        >
          {testimonial.name}
        </Box>
        <Box
          component="span"
          sx={{ display: 'block', fontSize: '12px', color: '#9a9aa3', mt: '2px', lineHeight: 1.3 }}
        >
          {testimonial.role}
        </Box>
      </Box>
    </Box>
  </Card>
);

// ----------------------------------------------------------------------

const MARQUEE_H = 660;

interface ColumnProps {
  items: Testimonial[];
  duration: number;
  direction: 'up' | 'down';
}

const Column: React.FC<ColumnProps> = ({ items, duration, direction }) => {
  const doubled = [...items, ...items];
  const animName = direction === 'up' ? 'vMarqueeUp' : 'vMarqueeDown';

  return (
    <Box sx={{ overflow: 'hidden', height: MARQUEE_H }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          willChange: 'transform',
          animation: `${animName} ${duration}s linear infinite`,
          [`@keyframes vMarqueeUp`]: {
            from: { transform: 'translateY(0)' },
            to: { transform: 'translateY(-50%)' },
          },
          [`@keyframes vMarqueeDown`]: {
            from: { transform: 'translateY(-50%)' },
            to: { transform: 'translateY(0)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animationPlayState: 'paused' },
        }}
      >
        {doubled.map((item, i) => (
          <TestimonialCard key={i} testimonial={item} hidden={i >= items.length} />
        ))}
      </Box>
    </Box>
  );
};

// ----------------------------------------------------------------------

export type TestimonialGridProps = React.ComponentPropsWithoutRef<'section'>;

export const TestimonialGrid: React.FC<TestimonialGridProps> = (props) => {
  const { t } = useTranslate();

  return (
    <SectionRoot aria-labelledby="testimonials-heading" {...props}>
      <Box sx={{ pt: { xs: '80px', md: '110px' }, pb: { xs: '40px', md: '56px' } }}>
        {/* Header */}
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, mb: '56px', textAlign: 'center' }}>
          <Box
            component="p"
            sx={{
              m: 0,
              mb: '14px',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
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
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1.04,
              color: '#0a0a0b',
            }}
          >
            {t('Loved by Normies')}
          </Box>
        </Box>

        {/* Vertical marquee — 3 columns */}
        <Box sx={{ px: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto', position: 'relative' }}>
          {/* Top fade */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              background: 'linear-gradient(to bottom, #FAFAFB 0%, transparent 100%)',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />
          {/* Bottom fade */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              background: 'linear-gradient(to top, #FAFAFB 0%, transparent 100%)',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: '14px',
              alignItems: 'start',
            }}
          >
            <Column items={col1} duration={55} direction="up" />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Column items={col2} duration={72} direction="down" />
            </Box>
          </Box>
        </Box>
      </Box>
    </SectionRoot>
  );
};

TestimonialGrid.displayName = 'TestimonialGrid';

export default TestimonialGrid;
