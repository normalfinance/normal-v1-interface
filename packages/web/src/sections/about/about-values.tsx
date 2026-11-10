'use client';

import type { ReactNode } from 'react';
import type { BrandHue } from '@/theme/brand-colors';

import { useTranslate } from '@/locales';
import { TYPE } from '@/theme/type-scale';
import { INK, MUTED, PAPER, BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FingerprintRounded from '@mui/icons-material/FingerprintRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';

import { IconTile } from '@/components/_common/icon-tile';
import {
  HAIRLINE,
  GUTTER_SX,
  MONO_FONT,
  PageSection,
  GRID_FRAME_SX,
  SectionHeader,
} from '@/components/_common/brand';

// ----------------------------------------------------------------------

type Value = { name: string; hue: BrandHue; line: string; body: string };

// The four values beside the featured one, each on its own wash, carrying on
// the logo's order after the feature's light blue: purple, magenta, coral,
// yellow.
const VALUES: Value[] = [
  {
    name: 'Security First',
    hue: 'violet',
    line: "Cutting corners on security isn't a tradeoff. It's a failure.",
    body: 'Audited contracts, battle-tested code, and active monitoring. Normal Savings was audited by Halborn, an independent security firm. We treat your savings with the same seriousness you do.',
  },
  {
    name: 'Permissionless Innovation',
    hue: 'magenta',
    line: 'The best infrastructure is infrastructure no single company controls.',
    body: 'Build composable primitives that anyone can extend, fork, or build on top of.',
  },
  {
    name: 'Community Ownership',
    hue: 'coral',
    line: 'No backroom decisions. No surprise upgrades.',
    body: "The roadmap belongs to the people using the product. We're here to build what the community decides.",
  },
  {
    name: 'Data > Hype',
    hue: 'yellow',
    line: "Hype fades. Real yield, real volume, and real retention don't.",
    body: "Let on-chain metrics guide every product decision. We don't ship features because they're trending. We ship them because usage data says users need them.",
  },
];

/** A value's number and name, above its line. */
function Label({ n, children }: { n: number; children: ReactNode }) {
  return (
    <Typography
      component="p"
      sx={{ ...TYPE.small, display: 'flex', gap: 1.5, fontWeight: 500, color: 'inherit' }}
    >
      <span>{String(n).padStart(2, '0')}</span>
      <span>{children}</span>
    </Typography>
  );
}

// What most wallets hand you before you can start: words to write down, in
// order. An illustration, the first twelve words of the standard word list,
// not anyone's wallet.
const SEED_WORDS = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
];

/**
 * The principle at work: the seed phrase most wallets start with, next to
 * what Normal's wallet setup says instead, word for word
 * (components/_common/chain-setup-dialog). The old way is a plain white card;
 * Normal's is the solid card, the wash's deep blue with its tint for words
 * (the pair is tested at 4.5:1 both ways, in both modes).
 */
function SetupCompare() {
  const { t } = useTranslate();
  const sky = BRAND_COLORS.sky;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
        alignItems: 'stretch',
        gap: 1.5,
        mt: 'auto',
        pt: { xs: 5, md: 7 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
          color: INK,
          bgcolor: PAPER,
          border: HAIRLINE,
        }}
      >
        <Typography sx={{ ...TYPE.caption, color: MUTED }}>{t('Most crypto wallets')}</Typography>
        <Box
          component="ol"
          aria-label={t('Twelve example recovery words')}
          sx={{
            // Down each column, the way wallets show them: 1 to 6, then 7 to 12.
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(6, auto)',
            gridAutoFlow: 'column',
            columnGap: 2,
            rowGap: 0.75,
            m: 0,
            mt: 2,
            p: 0,
            listStyle: 'none',
          }}
        >
          {SEED_WORDS.map((word, index) => (
            <Box
              component="li"
              key={word}
              sx={{
                ...TYPE.caption,
                display: 'flex',
                gap: 0.75,
                minWidth: 0,
                fontFamily: MONO_FONT,
              }}
            >
              <Box component="span" sx={{ color: MUTED }}>
                {index + 1}
              </Box>
              <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {word}
              </Box>
            </Box>
          ))}
        </Box>
        <Typography sx={{ ...TYPE.small, mt: 'auto', pt: 2, fontWeight: 500, color: 'inherit' }}>
          {t('Write these 12 words down before you start.')}
        </Typography>
      </Box>

      <Box
        aria-hidden="true"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <ArrowForwardRounded sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 20 }} />
        <ArrowDownwardRounded sx={{ display: { xs: 'block', sm: 'none' }, fontSize: 20 }} />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          p: 2.5,
          color: sky.tint,
          bgcolor: sky.deep,
        }}
      >
        <Typography sx={{ ...TYPE.caption, color: 'inherit' }}>Normal</Typography>
        {/* A page-coloured tile, its icon in the card's blue. */}
        <Box sx={{ mt: 2, color: sky.deep }}>
          <IconTile tone="wash">
            <FingerprintRounded />
          </IconTile>
        </Box>
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Typography sx={{ ...TYPE.small, fontWeight: 500, color: 'inherit' }}>
            {t('Secured by your device biometrics.')}
          </Typography>
          <Typography sx={{ ...TYPE.small, color: 'inherit' }}>
            {t('No seed phrase required.')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * The value the page leads with, on the first wash, light blue: the principle,
 * then the principle at work (SetupCompare).
 */
function FeaturedValue() {
  const { t } = useTranslate();
  const sky = BRAND_COLORS.sky;

  return (
    <Box
      component="li"
      sx={{
        gridColumn: { sm: '1 / -1', lg: '1 / span 2' },
        gridRow: { lg: '1 / span 2' },
        display: 'flex',
        flexDirection: 'column',
        // The gutter, so the words line up with the heading above.
        ...GUTTER_SX,
        py: 4,
        color: sky.deep,
        bgcolor: sky.tint,
      }}
    >
      <Label n={1}>{t('Keep Crypto Human')}</Label>
      <Typography
        component="h3"
        sx={{ ...TYPE.statement, mt: { xs: 3, md: 4 }, maxWidth: 560, color: 'inherit' }}
      >
        If your parents can&apos;t use it, we&apos;re not done.
      </Typography>
      <Typography sx={{ ...TYPE.body, mt: 2.5, maxWidth: 520, color: 'inherit' }}>
        {t(
          'Remove complexity, speak plainly, and design for real people, not power users. Every screen, every error message, and every transaction should be explainable in a single sentence.'
        )}
      </Typography>

      <SetupCompare />
    </Box>
  );
}

/**
 * Five principles, each on its own wash in the logo's order, every word in its
 * wash's deep shade (the owner's call). The first is still the focal point: it
 * is the big cell, with the statement-size line and the example. Wide
 * screens: the feature fills the left half and the four make a two-by-two on
 * the right. Narrower, the four go two-by-two under it (four across would
 * leave each cell too narrow for its words).
 */
export function AboutValues() {
  const { t } = useTranslate();

  return (
    <PageSection divider hatchFoot id="core-values" aria-labelledby="values-title">
      <SectionHeader
        id="values-title"
        eyebrow="Our Principles"
        title={t('Core Values')}
        subtitle={t(
          'Five guiding principles that keep us focused on making crypto transparent, secure, and genuinely useful.'
        )}
      />

      <Box
        component="ul"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          ...GRID_FRAME_SX,
        }}
      >
        <FeaturedValue />

        {VALUES.map((value, index) => (
          <Box
            component="li"
            key={value.name}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              ...GUTTER_SX,
              py: { xs: 3, md: 4 },
              color: BRAND_COLORS[value.hue].deep,
              bgcolor: BRAND_COLORS[value.hue].tint,
              // Phones: one column. Tablets and small laptops: two, under the
              // feature. Wide screens: two by two, right of it.
              borderTop: { xs: HAIRLINE, lg: index >= 2 ? HAIRLINE : 'none' },
              borderLeft: {
                xs: 'none',
                sm: index % 2 === 1 ? HAIRLINE : 'none',
                lg: HAIRLINE,
              },
            }}
          >
            <Label n={index + 2}>{t(value.name)}</Label>
            <Typography component="h3" sx={{ ...TYPE.h4, mt: 3, color: 'inherit' }}>
              {t(value.line)}
            </Typography>
            <Typography sx={{ ...TYPE.small, mt: 1.5, color: 'inherit' }}>
              {t(value.body)}
            </Typography>
          </Box>
        ))}
      </Box>
    </PageSection>
  );
}
