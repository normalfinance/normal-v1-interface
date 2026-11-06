'use client';

import { useTranslate } from '@/locales';
import { TYPE } from '@/theme/type-scale';
import { INK, MUTED, CANVAS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import {
  HAIRLINE,
  GUTTER_SX,
  PageSection,
  GRID_FRAME_SX,
  SectionHeader,
} from '@/components/_common/brand';

import { TEAM } from './about-data';
import { SocialLinks } from './social-links';

import type { TeamMember } from './about-data';

// ----------------------------------------------------------------------

// Three to a row on desktops, two on tablets and phones. With an odd count the
// last person takes a whole two-column row: photo on the left, words on the
// right, the line between them running on from the column line above.
const LAST_ALONE = TEAM.length % 2 === 1;

function MemberCell({ member, index }: { member: TeamMember; index: number }) {
  const alone = LAST_ALONE && index === TEAM.length - 1;

  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: alone ? '1fr 1fr' : '1fr', md: '1fr' },
        // The photo keeps its square; the words take the rest of the row.
        gridTemplateRows: { xs: alone ? 'auto' : 'auto 1fr', md: 'auto 1fr' },
        gridColumn: { xs: alone ? '1 / -1' : 'auto', md: 'auto' },
        minWidth: 0,
        borderTop: { xs: index >= 2 ? HAIRLINE : 'none', md: index >= 3 ? HAIRLINE : 'none' },
        borderLeft: {
          xs: index % 2 === 1 ? HAIRLINE : 'none',
          md: index % 3 > 0 ? HAIRLINE : 'none',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          // Alone on its row, the photo fills the row's height beside the words.
          aspectRatio: { xs: alone ? 'auto' : '1 / 1', md: '1 / 1' },
          minHeight: { xs: alone ? 200 : 0, md: 0 },
          bgcolor: CANVAS,
        }}
      >
        <Box
          component="img"
          src={member.image}
          alt={member.name}
          loading="lazy"
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: member.focus ?? '50% 25%',
            borderRadius: 'var(--radius-site)',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          ...GUTTER_SX,
          py: 3,
          color: INK,
          borderTop: { xs: alone ? 'none' : HAIRLINE, md: HAIRLINE },
          borderLeft: { xs: alone ? HAIRLINE : 'none', md: 'none' },
        }}
      >
        <Typography component="h3" sx={{ ...TYPE.h4, color: INK }}>
          {member.name}
        </Typography>
        <Typography sx={{ ...TYPE.caption, mt: 0.5, color: MUTED }}>{member.role}</Typography>
        <Typography sx={{ ...TYPE.small, mt: 1.5, color: MUTED }}>{member.bio}</Typography>
        <Box sx={{ mt: 'auto', pt: 2.5 }}>
          <SocialLinks name={member.name} links={member.links} />
        </Box>
      </Box>
    </Box>
  );
}

export function AboutTeam() {
  const { t } = useTranslate();

  return (
    <PageSection divider hatchFoot aria-labelledby="team-title">
      <SectionHeader
        id="team-title"
        eyebrow="The Team"
        title={t('Meet the Crew')}
        subtitle={t('A small, focused team building the future of everyday crypto finance.')}
      />

      <Box
        component="ul"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))' },
          ...GRID_FRAME_SX,
        }}
      >
        {TEAM.map((member, index) => (
          <MemberCell key={member.name} member={member} index={index} />
        ))}
      </Box>
    </PageSection>
  );
}
