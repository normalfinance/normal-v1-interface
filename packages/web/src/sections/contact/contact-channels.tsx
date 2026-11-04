'use client';

import React from 'react';
import { Icon } from '@iconify/react';

import { Box, Link, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { BLOCK_SX, MONO_FONT, PageSection, SectionHeader } from '@/components/_common/brand';

type Channel = {
  icon: React.ReactNode;
  name: string;
  handle: string;
  href: string;
};

const CHANNELS: Channel[] = [
  {
    icon: <Icon icon="fa6-brands:x-twitter" width={18} height={18} />,
    name: 'X / Twitter',
    handle: '@normalfinance',
    href: 'https://x.com/normalfinance',
  },
  {
    icon: <Icon icon="fa6-brands:telegram" width={18} height={18} />,
    name: 'Telegram',
    handle: '@normalfinance',
    href: 'https://t.me/normalfinance',
  },
  {
    icon: <Icon icon="fa6-brands:discord" width={18} height={18} />,
    name: 'Discord',
    handle: 'normalfinance',
    href: 'https://discord.gg/normalfinance',
  },
  {
    icon: <Icon icon="fa6-brands:linkedin-in" width={18} height={18} />,
    name: 'LinkedIn',
    handle: 'Normal Finance',
    href: 'https://linkedin.com/company/normalfinance',
  },
];

const ChannelCard: React.FC<{ channel: Channel }> = ({ channel }) => (
  <Link
    href={channel.href}
    target="_blank"
    rel="noopener noreferrer"
    underline="none"
    sx={{
      ...BLOCK_SX,
      display: 'flex',
      flexDirection: 'column',
      transition: 'border-color 150ms ease',
      '&:hover': {
        borderColor: 'rgba(10,10,15,0.14)',
        '& .arrow-btn': {
          bgcolor: '#0A0A0F',
          color: '#fff',
        },
      },
    }}
  >
    {/* Top row: icon + arrow */}
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: '20px',
      }}
    >
      {/* Icon box */}
      <Box
        sx={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F4F4F7',
          borderRadius: 'var(--radius-md)',
          color: '#0A0A0F',
        }}
      >
        {channel.icon}
      </Box>

      {/* Arrow button */}
      <Box
        className="arrow-btn"
        sx={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F4F4F7',
          borderRadius: 'var(--radius-md)',
          color: '#0A0A0F',
          transition: 'bgcolor 150ms ease, color 150ms ease',
        }}
      >
        <ArrowForwardIcon sx={{ fontSize: 14 }} />
      </Box>
    </Box>

    <Typography
      sx={{
        fontSize: '18px',
        fontWeight: 500,
        color: '#0A0A0F',
        letterSpacing: '-0.015em',
        mb: '4px',
      }}
    >
      {channel.name}
    </Typography>

    <Typography
      sx={{
        fontSize: '13px',
        color: '#6B6B76',
        fontFamily: MONO_FONT,
      }}
    >
      {channel.handle}
    </Typography>
  </Link>
);

export const ContactChannels: React.FC = () => (
  <PageSection>
    <SectionHeader
      eyebrow="Find Us"
      title="Other ways to reach us"
      subtitle="Join our community channels for the fastest updates, announcements, and real-time support."
    />

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: { xs: 1.5, md: 2 },
      }}
    >
      {CHANNELS.map((channel) => (
        <ChannelCard key={channel.name} channel={channel} />
      ))}
    </Box>
  </PageSection>
);

export default ContactChannels;
