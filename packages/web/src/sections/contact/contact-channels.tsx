'use client';

import { Icon } from '@iconify/react';
import { paths } from '@/routes/paths';
import { SOCIAL_COLORS } from '@/theme/brand-colors';

import { PageSection, SectionHeader } from '@/components/_common/brand';

import { LinkCells } from './link-cells';

import type { LinkCell } from './link-cells';

// ----------------------------------------------------------------------

// Each channel in its own network's colours, at the owner's request, like
// Roadmap's principles and About's values. X, Telegram and Discord are the
// site's own links (paths.socials), the same ones the footer uses. LinkedIn is
// not in paths.ts yet.
const CHANNELS: LinkCell[] = [
  {
    icon: <Icon icon="fa6-brands:x-twitter" />,
    name: 'X / Twitter',
    detail: '@normalfi',
    href: paths.socials.twitter,
    external: true,
    colors: SOCIAL_COLORS.x,
  },
  {
    icon: <Icon icon="fa6-brands:telegram" />,
    name: 'Telegram',
    detail: '@normalfinance',
    href: paths.socials.telegram,
    external: true,
    colors: SOCIAL_COLORS.telegram,
  },
  {
    icon: <Icon icon="fa6-brands:discord" />,
    name: 'Discord',
    detail: 'Normal server',
    href: paths.socials.discord,
    external: true,
    colors: SOCIAL_COLORS.discord,
  },
  {
    icon: <Icon icon="fa6-brands:linkedin" />,
    name: 'LinkedIn',
    detail: 'Normal Finance',
    href: 'https://linkedin.com/company/normalfinance',
    external: true,
    colors: SOCIAL_COLORS.linkedin,
  },
];

/** The community channels: one row of link cells between the frame lines. */
export function ContactChannels() {
  return (
    <PageSection divider hatchFoot aria-labelledby="channels-title">
      <SectionHeader
        id="channels-title"
        eyebrow="Find us"
        title="Other ways to reach us"
        subtitle="Join our community channels for the fastest updates, announcements, and real-time support."
      />
      <LinkCells items={CHANNELS} />
    </PageSection>
  );
}
