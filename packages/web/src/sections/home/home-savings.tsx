'use client';

import { paths } from '@/routes/paths';
import { TYPE } from '@/theme/type-scale';
import { BRAND_COLORS, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { MarketingPhoto } from '@/components/_common/marketing-photo';
import { Eyebrow, COLUMN_SX, BrandButton } from '@/components/_common/brand';

// ----------------------------------------------------------------------

// The mint wash fills the column, between the frame lines, and stops there: a
// photo cell and a words cell, the way customer.io sets a case study: the label
// over the statement at the top, the figures and the ask at the foot. Every
// word on the wash is the deep green, as on their cards.
const FACTS = [
  { value: 'Daily', label: 'Your earnings are added every day' },
  { value: 'Anytime', label: 'Withdraw with no lock-up or notice' },
];

export function HomeSavings() {
  const mint = BRAND_COLORS.mint;

  return (
    <Box
      component="section"
      id="savings"
      aria-labelledby="savings-title"
      sx={{ scrollMarginTop: 72, borderTop: `1px solid ${HAIRLINE_COLOR}` }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
          ...COLUMN_SX,
          color: mint.deep,
          bgcolor: mint.tint,
        }}
      >
        <Box sx={{ position: 'relative', minHeight: { xs: 320, sm: 420, md: 'auto' } }}>
          <MarketingPhoto slot="savings" sx={{ position: 'absolute', inset: 0 }} />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            py: { xs: 5, md: 8 },
            px: { xs: 2, sm: 3, md: 7 },
            borderLeft: { md: `1px solid ${HAIRLINE_COLOR}` },
          }}
        >
          <Eyebrow sx={{ color: 'inherit' }}>Normal Savings</Eyebrow>
          <Typography
            id="savings-title"
            component="h2"
            sx={{ ...TYPE.statement, mt: 2.5, color: 'inherit' }}
          >
            Your dollars, working while you live. Move digital dollars into Savings and earn a yield
            from lending on the Stellar network.
          </Typography>

          {/* The figures and the ask at the foot of the card, as on customer.io's case studies. */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 3,
              mt: { xs: 5, md: 'auto' },
              pt: { md: 7 },
            }}
          >
            <Box sx={{ display: 'flex' }}>
              {FACTS.map((fact) => (
                <Box
                  key={fact.value}
                  sx={{ pl: 2, pr: 3, maxWidth: 200, borderLeft: `1px solid ${mint.deep}` }}
                >
                  <Typography sx={{ ...TYPE.h4, fontSize: 24, color: 'inherit' }}>
                    {fact.value}
                  </Typography>
                  <Typography sx={{ ...TYPE.small, mt: 0.25, color: 'inherit' }}>
                    {fact.label}
                  </Typography>
                </Box>
              ))}
            </Box>
            <BrandButton href={paths.savings}>Start saving</BrandButton>
          </Box>
          <Typography sx={{ ...TYPE.caption, mt: 3, maxWidth: 420, color: 'inherit' }}>
            The yield changes with the market and is never guaranteed. Audited by Halborn Security.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
