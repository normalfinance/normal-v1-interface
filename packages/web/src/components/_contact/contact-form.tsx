'use client';

import Link from 'next/link';
import * as React from 'react';
import { Icon } from '@iconify/react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import { Box, Grid, Button, Container, Typography } from '@mui/material';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type CustomButtonProps = {
  title: string;
  variant?: 'text' | 'outlined' | 'contained';
};

type SocialLink = {
  href: string;
  icon: React.ReactNode;
};

type Props = {
  tagline: string;
  heading: string;
  description: string;
  email: string;
  button: CustomButtonProps;
  socialLinks: SocialLink[];
};

export type ContactFormProps = React.ComponentPropsWithoutRef<'section'> & Partial<Props>;

/* -------------------------------------------------------------------------- */
/*                               Default Props                                */
/* -------------------------------------------------------------------------- */
const BRAND = {
  x: '#000000',
  linkedin: '#0077B5',
  github: '#181717',
  telegram: '#0088CC',
  discord: '#5865F2',
};

export const ContactFormDefaults: Props = {
  tagline: 'Tagline',
  heading: 'Contact us',
  description:
    'Have a question, idea, or partnership in mind? We’d love to hear from you. Drop us a message anytime and the Normal team will get back to you within one business day.',
  email: 'hello@normalfinance.io',
  socialLinks: [
    {
      href: paths.socials.twitter,
      icon: <Icon icon="bxl:twitter" width={28} height={28} color={BRAND.x} />,
    },
    {
      href: paths.socials.telegram,
      icon: <Icon icon="bxl:telegram" width={28} height={28} color={BRAND.telegram} />,
    },
    {
      href: paths.socials.discord,
      icon: <Icon icon="bxl:discord-alt" width={32} height={32} color={BRAND.discord} />,
    },
  ],
  button: { title: 'Submit', variant: 'contained' },
};

/* -------------------------------------------------------------------------- */
/*                               ContactForm                                   */
/* -------------------------------------------------------------------------- */

export const ContactForm: React.FC<ContactFormProps> = (props) => {
  const { t } = useTranslate();

  const { heading, description, email, socialLinks, ...sectionProps } = {
    ...ContactFormDefaults,
    ...props,
  };

  return (
    <Box
      component="section"
      {...sectionProps}
      py={{ xs: 8, md: 12, lg: 14 }}
      sx={{ backgroundColor: '#F9FAFB' }}
    >
      <Container>
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            <Box mb={{ xs: 3, md: 4 }}>
              <Typography
                component="h2"
                sx={{
                  fontWeight: 500,
                  fontSize: {
                    xs: '2rem',
                    md: '3rem',
                    lg: '4rem',
                  },
                  mb: 2,
                }}
              >
                {t(heading)}
              </Typography>
              <Typography variant="body1">{t(description)}</Typography>
            </Box>
          </Grid>

          <Grid
            item
            xs={12}
            md={6}
            display="flex"
            flexDirection="column"
            gap={4}
            alignItems={{ xs: 'flex-end', md: 'flex-end' }}
            justifyContent="center"
          >
            <Button
              component={Link}
              href={`mailto:${email}`}
              variant="text"
              sx={{ alignSelf: { xs: 'auto', md: 'flex-end' }, textTransform: 'none', p: 1 }}
            >
              {email}
            </Button>

            <Box display="flex" flexDirection="column" gap={4} alignItems="flex-end">
              {socialLinks.map((link, idx) => (
                <Button
                  key={idx}
                  component={Link}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="text"
                  sx={{ minWidth: 0, p: 0, justifyContent: 'flex-end' }}
                >
                  {link.icon}
                </Button>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ContactForm;
