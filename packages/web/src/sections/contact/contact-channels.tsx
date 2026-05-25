'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Box, Typography, Link } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

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
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#FFFFFF',
      border: '1px solid rgba(10,10,15,0.08)',
      borderRadius: '20px',
      p: '24px',
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(10,10,15,0.05)',
      transition: 'box-shadow 180ms ease, transform 180ms ease',
      '&:hover': {
        boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 8px 28px rgba(10,10,15,0.1)',
        '& .arrow-btn': {
          bgcolor: '#0A0A0F',
          color: '#fff',
        },
      },
    }}
  >
    {/* Top row: icon + arrow */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: '20px' }}>
      {/* Icon box */}
      <Box
        sx={{
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F4F4F7',
          borderRadius: '10px',
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
          borderRadius: '8px',
          color: '#0A0A0F',
          transition: 'bgcolor 150ms ease, color 150ms ease',
        }}
      >
        <ArrowForwardIcon sx={{ fontSize: 14 }} />
      </Box>
    </Box>

    <Typography
      sx={{
        fontSize: '17px',
        fontWeight: 600,
        color: '#0A0A0F',
        letterSpacing: '-0.01em',
        mb: '4px',
      }}
    >
      {channel.name}
    </Typography>

    <Typography
      sx={{
        fontSize: '13px',
        color: '#6B6B76',
        fontFamily: '"Geist Mono", "Courier New", monospace',
      }}
    >
      {channel.handle}
    </Typography>
  </Link>
);

export const ContactChannels: React.FC = () => (
  <Box
    component="section"
    sx={{ bgcolor: '#FAFAFB', pt: { xs: '80px', md: '110px' }, pb: { xs: '40px', md: '56px' } }}
  >
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
      {/* Header */}
      <Box sx={{ mb: { xs: '40px', md: '48px' } }}>
        <Typography
          sx={{
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#6B6B76',
            mb: 1.5,
          }}
        >
          — Find Us
        </Typography>
        <Typography
          component="h2"
          sx={{
            fontWeight: 500,
            fontSize: 'clamp(32px, 4vw, 52px)',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#0A0A0F',
            mb: '16px',
          }}
        >
          Other ways to reach us
        </Typography>
        <Typography
          sx={{
            fontSize: '16px',
            color: '#6B6B76',
            lineHeight: 1.55,
            maxWidth: '480px',
          }}
        >
          Join our community channels for the fastest updates, announcements, and real-time support.
        </Typography>
      </Box>

      {/* Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr 1fr',
            md: 'repeat(4, 1fr)',
          },
          gap: { xs: '16px', md: '24px' },
        }}
      >
        {CHANNELS.map((channel) => (
          <ChannelCard key={channel.name} channel={channel} />
        ))}
      </Box>
    </Box>
  </Box>
);

export default ContactChannels;
