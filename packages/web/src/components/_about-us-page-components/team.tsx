'use client';

import type { ButtonProps } from '@mui/material';

import React from 'react';
import { Icon } from '@iconify/react';
import { useTranslate } from '@/locales';
import { cdn } from '@normalfinance/utils';

import Link from '@mui/material/Link';
import GitHubIcon from '@mui/icons-material/GitHub';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TelegramIcon from '@mui/icons-material/Telegram';
import { Box, Grid, Container, Typography } from '@mui/material';

type ImageProps = {
  src: string;
  alt?: string;
};

type Footer = {
  heading: string;
  description: string;
  button: CustomButtonProps;
};

type SocialLink = {
  href: string;
  icon: React.ReactNode;
};

type TeamMember = {
  image: ImageProps;
  name: string;
  jobTitle: string;
  description: string;
  socialLinks: SocialLink[];
};

export type CustomButtonProps = ButtonProps & { title: string };

type Props = {
  tagline: string;
  heading: string;
  description: string;
  teamMembers: TeamMember[];
  footerContent: Footer;
};

export type TeamProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

const BRAND = {
  x: '#000000',
  linkedin: '#0077B5',
  github: '#181717',
  telegram: '#0088CC',
};

export const TeamDefaults: Props = {
  tagline: 'Tagline',
  heading: 'Our team',
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  teamMembers: [
    {
      image: {
        src: cdn('about-page/just.webp'),
        alt: 'Justin Benjamin',
      },
      name: 'Justin Benjamin',
      jobTitle: 'Co-founder & CEO',
      description:
        'Justin formerly designed products at Bitcoin of America and CoinFlip, has invested in crypto for 7+ years, and holds a BS in Learning & Organizational Change from Northwestern.',
      socialLinks: [
        {
          href: 'https://x.com/justinbenjaminn',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/justin-benjamin1/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        {
          href: 'https://t.me/justinbenjamin',
          icon: <TelegramIcon sx={{ color: BRAND.telegram }} />,
        }, // ⬅️ new
      ],
    },
    {
      image: {
        src: cdn('about-page/avm.webp'),
        alt: 'Amit Anand',
      },
      name: 'Amit Anand',
      jobTitle: 'Head of Marketing',
      description:
        'Built 10m+ impression marketing strategies at Polygon, formerly led Partnerships at Zo World.',
      socialLinks: [
        {
          href: 'https://x.com/0xawmit',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/0xawmit/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        { href: 'https://t.me/awmitx', icon: <TelegramIcon sx={{ color: BRAND.telegram }} /> }, // ⬅️ new
      ],
    },
    {
      image: {
        src: cdn('about-page/jake.webp'),
        alt: 'Jake Penzato',
      },
      name: 'Jake Penzato',
      jobTitle: 'Creative Director',
      description:
        'Jake has 3 years of crypto investing experience and holds a BS in Marketing from Aurora University.',
      socialLinks: [
        {
          href: 'https://x.com/JakePenzato',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/jake-penzato-a72747245/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        { href: 'https://t.me/JakeTheCD', icon: <TelegramIcon sx={{ color: BRAND.telegram }} /> }, // ⬅️ new
      ],
    },
    {
      image: {
        src: cdn('about-page/niko.webp'),
        alt: 'Niko Gorjan',
      },
      name: 'Niko Gorjan',
      jobTitle: 'Front-End Developer',
      description:
        'Niko grew up in Slovenia and holds a CS degree from FERI, University of Maribor. After freelancing internationally and building a reputation for clean, component-driven React code, he joined Relume to develop reusable UI systems.',
      socialLinks: [
        {
          href: 'https://x.com/NikoGorjan',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/niko-gorjan-582433276/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        {
          href: 'https://github.com/nikogorjan',
          icon: <GitHubIcon sx={{ color: BRAND.github }} />,
        },
      ],
    },
    {
      image: {
        src: cdn('about-page/jay.webp'),
        alt: 'Jay Malve',
      },
      name: 'Jay Malve',
      jobTitle: 'Full-Stack Developer',
      description:
        'Passionate full-stack developer with 5+ years of experience building impactful products across Dubai and US startups, fueled by a love for code and great conversations—especially over music and coffee.',
      socialLinks: [
        {
          href: 'https://x.com/jaydotdev',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/jay-malave/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        {
          href: 'https://github.com/jaymalave',
          icon: <GitHubIcon sx={{ color: BRAND.github }} />,
        },
      ],
    },
    {
      image: {
        src: cdn('about-page/anth.webp'),
        alt: 'Anthony Benjamin',
      },
      name: 'Anthony Benjamin',
      jobTitle: 'Business Development Lead',
      description:
        'Strategy and Client Support. U.S. Navy Veteran with 2 years of experience managing commercial accounts at Ford. Licensed USVI-BVI sail boat captain.',
      socialLinks: [
        {
          href: 'https://x.com/AnthonyBenjamn',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/anthony-benjamin/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        {
          href: 'https://t.me/anthonypreprint',
          icon: <TelegramIcon sx={{ color: BRAND.telegram }} />,
        },
      ],
    },
    {
      image: {
        src: cdn('about-page/john.webp'),
        alt: 'John Reyes',
      },
      name: 'John Reyes',
      jobTitle: 'Intern',
      description:
        'John is an aspiring crypto investor, social media content producer, and incoming freshman at DePaul University.',
      socialLinks: [
        {
          href: 'https://x.com/0xJohnReyes',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
        {
          href: 'https://www.linkedin.com/in/johnpreyes/',
          icon: <LinkedInIcon sx={{ color: BRAND.linkedin }} />,
        },
        { href: '#', icon: <TelegramIcon sx={{ color: BRAND.telegram }} /> }, // ⬅️ new
      ],
    },
    {
      image: {
        src: cdn('about-page/zeal.webp'),
        alt: 'Chief Doge',
      },
      name: 'Zeal',
      jobTitle: 'Chief Doge',
      description:
        'Zeal is our team mascot and crypto connoisseur. He keeps us on our toes and reviews our personal crypto investments.',
      socialLinks: [
        {
          href: 'https://x.com/NormalDoge_Zeal',
          icon: <Icon icon="fa6-brands:x-twitter" width={16} height={16} color={BRAND.x} />,
        },
      ],
    },
  ],
  footerContent: {
    heading: "We're hiring!",
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    button: { title: 'Open positions', variant: 'outlined' } as CustomButtonProps,
  },
};

export const Team: React.FC<TeamProps> = (props) => {
  const { t } = useTranslate();

  const { tagline, heading, description, teamMembers, footerContent, ...sectionProps } = {
    ...TeamDefaults,
    ...props,
  };

  return (
    <Box
      component="section"
      {...sectionProps}
      py={{ xs: 8, md: 12, lg: 14 }}
      sx={{ backgroundColor: '#F8FAFC' }}
    >
      <Container>
        <Box maxWidth={600} mb={{ xs: 6, md: 9, lg: 10 }}>
          <Typography
            component="h2"
            sx={{
              fontWeight: 500,
              fontSize: {
                xs: '2rem',
                md: '3rem',
                lg: '3rem',
              },
              mb: 2,
            }}
          >
            {t(heading)}
          </Typography>
        </Box>

        <Grid container spacing={{ xs: 4, md: 6 }} mb={{ xs: 8, md: 12 }}>
          {teamMembers.map((member, index) => (
            <Grid item xs={12} md={4} key={index}>
              <TeamMemberCard member={member} />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

const TeamMemberCard: React.FC<{ member: TeamMember }> = ({ member }) => {
  const { t } = useTranslate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      p={1}
      bgcolor="white"
      sx={{
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        borderRadius: 2,
      }}
    >
      <Box position="relative" width="100%" paddingTop="100%" mb={1} sx={{ overflow: 'hidden' }}>
        <Box
          component="img"
          src={member.image.src}
          alt={member.image.alt}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            objectFit: 'cover',
            borderRadius: 2,
            aspectRatio: 1 / 1,
          }}
        />
      </Box>
      <Box
        sx={{
          backgroundColor: 'grey.100',
          borderRadius: 2,
          p: 3,
        }}
      >
        <Box mb={1.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t(member.name)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t(member.jobTitle)}
          </Typography>
        </Box>
        <Typography variant="body2" mb={2}>
          {t(member.description)}
        </Typography>

        <Box
          mb={2}
          mt={2}
          sx={{
            backgroundColor: 'divider',
            width: 1,
            height: '1px',
          }}
        />

        <Box display="flex" gap={2} width="100%" justifyContent="flex-end" alignItems="center">
          {member.socialLinks.map((link, index) => (
            <Link
              key={index}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'text.primary' }}
            >
              {link.icon}
            </Link>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default Team;
