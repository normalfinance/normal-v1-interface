import { cdn } from '@/utils/cdn';
import { TYPE } from '@/theme/type-scale';
import { SITE_THEME_ATTR } from '@/theme/site-theme';
import { MUTED, HAIRLINE_COLOR } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

// Who stands behind Normal, as their marks: a strip of cells across the
// column, the way customer.io shows the brands that trust it. The files are
// dark on transparent (CDN homepage/), drawn at one visual weight; in dark
// mode they are drawn white. The strip has no outer border: the frame lines
// are its sides, and the section around it draws the line underneath.
const BACKERS = [
  { label: 'Backed by', alt: 'Stellar', src: cdn('homepage/stellar-logo.webp'), height: 34 },
  {
    label: 'Backed by',
    alt: 'Draper University',
    src: cdn('homepage/draper-university.webp'),
    height: 48,
  },
  {
    label: 'Savings audited by',
    alt: 'Halborn',
    src: cdn('homepage/halborn-logo.webp'),
    height: 18,
  },
];

const LOGO_BOX = Math.max(...BACKERS.map((backer) => backer.height));

export function Backers() {
  return (
    <Box
      component="ul"
      aria-label="Backers and auditors"
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}
    >
      {BACKERS.map((backer, index) => (
        <Box
          component="li"
          key={backer.alt}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            minHeight: { xs: 140, md: 172 },
            px: 3,
            py: 4,
            borderTop: { xs: index > 0 ? `1px solid ${HAIRLINE_COLOR}` : 'none', sm: 'none' },
            borderLeft: { sm: index > 0 ? `1px solid ${HAIRLINE_COLOR}` : 'none' },
          }}
        >
          <Typography sx={{ ...TYPE.caption, color: MUTED }}>{backer.label}</Typography>
          {/* One height for every mark, so the three labels line up. */}
          <Box sx={{ display: 'flex', alignItems: 'center', height: LOGO_BOX }}>
            <Box
              component="img"
              src={backer.src}
              alt={backer.alt}
              sx={{
                display: 'block',
                height: backer.height,
                width: 'auto',
                maxWidth: '100%',
                objectFit: 'contain',
                [`html[${SITE_THEME_ATTR}="dark"] &`]: {
                  filter: 'brightness(0) invert(1)',
                  opacity: 0.88,
                },
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
}
