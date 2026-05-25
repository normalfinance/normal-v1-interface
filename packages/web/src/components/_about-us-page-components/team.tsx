'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';
import Link from '@mui/material/Link';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';
import { Box, Typography } from '@mui/material';

type SocialLink = { href: string; icon: React.ReactNode };

type TeamMember = {
  image: string;
  name: string;
  jobTitle: string;
  bio?: string;
  socialLinks: SocialLink[];
};

const BRAND_X = 'currentColor';
const BRAND_LI = '#0077B5';
const BRAND_TG = '#0088CC';

const TEAM_MEMBERS: TeamMember[] = [
  {
    image: cdn('about-page/justin.webp'),
    name: 'Justin Benjamin',
    jobTitle: 'Founder & CEO',
    bio: 'Justin designed products at Bitcoin of America and CoinFlip before starting Normal. Crypto investor for 7+ years, BS from Northwestern.',
    socialLinks: [
      {
        href: 'https://x.com/justinbenjaminn',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/justin-benjamin1/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
      {
        href: 'https://t.me/justinbenjamin',
        icon: <TelegramIcon sx={{ fontSize: 15, color: BRAND_TG }} />,
      },
    ],
  },
  {
    image: cdn('about-page/avm.webp'),
    name: 'Amit Anand',
    jobTitle: 'Head of Marketing',
    bio: "Growth strategist with deep roots in Web3, driving Normal's brand and community across every channel.",
    socialLinks: [
      {
        href: 'https://x.com/0xawmit',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/0xawmit/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
      {
        href: 'https://t.me/awmitx',
        icon: <TelegramIcon sx={{ fontSize: 15, color: BRAND_TG }} />,
      },
    ],
  },
  {
    image: cdn('about-page/jake.webp'),
    name: 'Jake Penzato',
    jobTitle: 'Creative Director',
    bio: "Visual storyteller shaping Normal's design language — from brand identity to product UI.",
    socialLinks: [
      {
        href: 'https://x.com/JakePenzato',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/jake-penzato-a72747245/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
      {
        href: 'https://t.me/JakeTheCD',
        icon: <TelegramIcon sx={{ fontSize: 15, color: BRAND_TG }} />,
      },
    ],
  },
  {
    image: cdn('about-page/niko.webp'),
    name: 'Niko Gorjan',
    jobTitle: 'Front-End Lead',
    bio: 'Grew up in Slovenia, CS degree from FERI. Built a reputation for clean, component-driven React code across international clients before joining Normal.',
    socialLinks: [
      {
        href: 'https://x.com/NikoGorjan',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/niko-gorjan-582433276/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
      {
        href: 'https://github.com/nikogorjan',
        icon: <GitHubIcon sx={{ fontSize: 15 }} />,
      },
    ],
  },
  {
    image: cdn('about-page/jay.webp'),
    name: 'Jay Malve',
    jobTitle: 'Full-Stack Developer',
    bio: 'Full-stack engineer bridging smart contracts and polished UIs — if it ships, Jay probably touched it.',
    socialLinks: [
      {
        href: 'https://x.com/jaydotdev',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/jay-malave/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
      {
        href: 'https://github.com/jaymalave',
        icon: <GitHubIcon sx={{ fontSize: 15 }} />,
      },
    ],
  },
  {
    image: cdn('about-page/anth.webp'),
    name: 'Anthony Benjamin',
    jobTitle: 'Business Development Lead',
    bio: "Forging the partnerships and integrations that expand Normal's footprint across DeFi and beyond.",
    socialLinks: [
      {
        href: 'https://x.com/AnthonyBenjamn',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/anthony-benjamin/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
      {
        href: 'https://t.me/anthonypreprint',
        icon: <TelegramIcon sx={{ fontSize: 15, color: BRAND_TG }} />,
      },
    ],
  },
  {
    image: cdn('about-page/john.webp'),
    name: 'John Reyes',
    jobTitle: 'Intern',
    bio: 'Lending a hand across ops, research, and content — bringing fresh energy and curiosity to the team.',
    socialLinks: [
      {
        href: 'https://x.com/0xJohnReyes',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
      {
        href: 'https://www.linkedin.com/in/johnpreyes/',
        icon: <LinkedInIcon sx={{ fontSize: 15, color: BRAND_LI }} />,
      },
    ],
  },
  {
    image: cdn('about-page/zeal.webp'),
    name: 'Zeal',
    jobTitle: 'Chief Doge',
    bio: 'Official mascot, morale officer, and the most photogenic member of the Normal team.',
    socialLinks: [
      {
        href: 'https://x.com/NormalDoge_Zeal',
        icon: <Icon icon="fa6-brands:x-twitter" width={15} height={15} color={BRAND_X} />,
      },
    ],
  },
];

const MemberCard: React.FC<{ member: TeamMember }> = ({ member }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      bgcolor: '#FFFFFF',
      border: '1px solid rgba(10,10,15,0.08)',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(10,10,15,0.05)',
    }}
  >
    {/* Photo */}
    <Box sx={{ p: '12px', pb: 0 }}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          aspectRatio: '4 / 5',
          borderRadius: '12px',
        }}
      >
        <Box
          component="img"
          src={member.image}
          alt={member.name}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            display: 'block',
          }}
        />
      </Box>
    </Box>

    {/* Info */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: '18px' }}>
      <Typography
        sx={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#0A0A0F',
          letterSpacing: '-0.01em',
          mb: '2px',
        }}
      >
        {member.name}
      </Typography>
      <Typography
        sx={{
          fontSize: '13px',
          color: '#6B6B76',
          mb: '10px',
        }}
      >
        {member.jobTitle}
      </Typography>

      {member.bio && (
        <Typography
          sx={{
            fontSize: '13.5px',
            color: '#2A2A33',
            lineHeight: 1.55,
            mb: '14px',
            flex: 1,
          }}
        >
          {member.bio}
        </Typography>
      )}

      {/* Social icons */}
      <Box sx={{ display: 'flex', gap: '8px', mt: 'auto' }}>
        {member.socialLinks.map((link, idx) => (
          <Link
            key={idx}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#F4F4F7',
              borderRadius: '8px',
              color: '#0A0A0F',
              transition: 'bgcolor 120ms ease, color 120ms ease',
              '&:hover': {
                bgcolor: '#0A0A0F',
                color: '#fff',
                '& svg': { color: '#fff !important' },
              },
            }}
          >
            {link.icon}
          </Link>
        ))}
      </Box>
    </Box>
  </Box>
);

export const Team: React.FC = () => {
  const { t } = useTranslate();

  return (
    <>
      {/* ── Team grid ── */}
      <Box
        component="section"
        sx={{ bgcolor: '#FAFAFB', py: { xs: '40px', md: '56px' } }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3 }}>
          {/* Header */}
          <Box mb={{ xs: '40px', md: '56px' }}>
            <Typography
              sx={{
                fontSize: '11px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#6B6B76',
                mb: 1.5,
              }}
            >
              — The Team
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
              {t('Meet the Crew')}
            </Typography>
            <Typography
              sx={{
                fontSize: '16px',
                color: '#6B6B76',
                lineHeight: 1.55,
                maxWidth: '520px',
              }}
            >
              {t('A small, focused team building the future of everyday crypto finance.')}
            </Typography>
          </Box>

          {/* Grid */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                md: 'repeat(4, 1fr)',
              },
              gap: { xs: '24px', md: '32px' },
            }}
          >
            {TEAM_MEMBERS.map((member) => (
              <MemberCard key={member.name} member={member} />
            ))}
          </Box>
        </Box>
      </Box>

    </>
  );
};

export default Team;
