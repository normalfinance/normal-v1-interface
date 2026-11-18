'use client';

import { cdn } from '@/utils/cdn';
import { useTranslate } from '@/locales';
import { TYPE } from '@/theme/type-scale';
import { BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { HAIRLINE, COLUMN_SX } from '@/components/_common/brand';

import { SocialLinks } from './social-links';
import { FOUNDER_LINKS } from './about-data';

// ----------------------------------------------------------------------

const FOUNDER = {
  name: 'Justin Benjamin',
  role: 'Founder & CEO',
  image: cdn('about-page/justin.webp'),
  bio: [
    'Justin formerly designed products at Bitcoin of America and CoinFlip, two of the largest crypto ATM and exchange networks in the US. He has invested in crypto for 7+ years and holds a BS in Learning & Organizational Change from Northwestern University.',
    "He started Normal after realising that DeFi's best yields were locked behind interfaces built for traders, not everyday savers. His goal is simple: take the complexity out of on-chain finance and put real, sustainable yield in the hands of anyone with a phone.",
  ],
  // A fact about him, written by hand: update it as the years pass.
  fact: { value: '7+', label: 'Years in crypto' },
};

/**
 * The founder, set like the Savings case study on the home page: his photo and
 * his words on the sky wash, which fills the column between the frame lines.
 * The quote at the top, the fact and his links at the foot; every word on the
 * wash in the deep shade.
 */
export function AboutFounder() {
  const { t } = useTranslate();
  const sky = BRAND_COLORS.sky;

  return (
    <Box
      component="section"
      id="our-vision"
      aria-labelledby="founder-title"
      sx={{ scrollMarginTop: 72, borderTop: HAIRLINE }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          ...COLUMN_SX,
          color: sky.deep,
          bgcolor: sky.tint,
        }}
      >
        <Box sx={{ position: 'relative', minHeight: { xs: 360, sm: 520, md: 'auto' } }}>
          <Box
            component="img"
            src={FOUNDER.image}
            alt={FOUNDER.name}
            loading="lazy"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: '50% 20%',
              borderRadius: 'var(--radius-site)',
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            py: { xs: 5, md: 8 },
            px: { xs: 2, sm: 3, md: 7 },
            borderLeft: { md: HAIRLINE },
          }}
        >
          <Typography id="founder-title" component="h2" sx={{ ...TYPE.eyebrow, color: 'inherit' }}>
            {t('Our Founder')}
          </Typography>

          <Box component="figure" sx={{ m: 0, mt: 2.5 }}>
            <Typography
              component="blockquote"
              sx={{ ...TYPE.statement, m: 0, color: 'inherit', textWrap: 'pretty' }}
            >
              &ldquo;We&apos;re not building a wallet. We&apos;re building the money account most
              people wish they already had.&rdquo;
            </Typography>
            <Box component="figcaption" sx={{ mt: { xs: 4, md: 5 } }}>
              <Typography sx={{ ...TYPE.h4, color: 'inherit' }}>{FOUNDER.name}</Typography>
              <Typography sx={{ ...TYPE.small, mt: 0.25, color: 'inherit' }}>
                {FOUNDER.role}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, mt: 3, maxWidth: 600 }}>
            {FOUNDER.bio.map((paragraph) => (
              <Typography key={paragraph} sx={{ ...TYPE.body, color: 'inherit' }}>
                {paragraph}
              </Typography>
            ))}
          </Box>

          {/* The fact and the links at the foot, as on the Savings card. */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 3,
              mt: { xs: 5, md: 'auto' },
              pt: { md: 6 },
            }}
          >
            <Box sx={{ pl: 2, borderLeft: `1px solid ${sky.deep}` }}>
              <Typography sx={{ ...TYPE.h3, color: 'inherit' }}>{FOUNDER.fact.value}</Typography>
              <Typography sx={{ ...TYPE.small, mt: 0.25, color: 'inherit' }}>
                {FOUNDER.fact.label}
              </Typography>
            </Box>
            <SocialLinks name={FOUNDER.name} links={FOUNDER_LINKS} size={40} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
