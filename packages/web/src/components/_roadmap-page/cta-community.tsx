'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import * as React from 'react';
import { paths } from '@/routes/paths';

import { Box, Stack, Button, Container, Typography } from '@mui/material';
import { cdn } from '@normalfinance/utils';

export type CtaCommunityProps = React.ComponentPropsWithoutRef<'section'> & {
  heading?: string;
  description?: string;
  twitterUrl?: string;
  discordUrl?: string;
  twitterLabel?: string;
  discordLabel?: string;
  image?: string;
  sx?: SxProps<Theme>;
};

export const CtaCommunity: React.FC<CtaCommunityProps> = ({
  heading = 'Join the Normal community to help us achieve our mission.',
  description = '',
  twitterUrl = paths.socials.twitter,
  discordUrl = paths.socials.discord,
  twitterLabel = 'Follow us on X (Twitter)',
  discordLabel = 'Join our Discord',
  image = cdn('homepage/cta-bg.webp'),
  sx,
  ...sectionProps
}) => (
  <Box
    component="section"
    sx={{
      position: 'relative',
      overflow: 'hidden',
      px: '5%',
      py: { xs: 6, md: 12, lg: 14 },
      color: 'common.white',
      bgcolor: 'grey.100',
      ...sx,
    }}
    {...sectionProps}
  >
    <Container sx={{ position: 'relative', zIndex: 1 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 3,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <Box
          component="img"
          src={image}
          alt=""
          sx={{
            position: 'absolute',
            inset: 0,
            width: 1,
            height: 1,
            objectFit: 'cover',
          }}
        />
      </Box>

      <Stack
        spacing={3}
        alignItems="center"
        textAlign="center"
        sx={{
          position: 'relative',
          zIndex: 2,
          px: { xs: '24px', md: '64px' },
          py: { xs: '32px', md: '80px' },
        }}
      >
        <Typography variant="h3" fontWeight={500} sx={{ fontSize: { xs: '24px', md: '40px' } }}>
          {heading}
        </Typography>

        {description ? (
          <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 720 }}>
            {description}
          </Typography>
        ) : null}

        <Stack
          direction="row"
          spacing={2}
          sx={{ flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}
        >
          <Button
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              border: '1px solid #6E4BFF',
              backgroundColor: '#E0D9FF',
              color: '#6E4BFF',
              fontWeight: 500,
            }}
          >
            {twitterLabel}
          </Button>

          <Button
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              border: '1px solid #6E4BFF',
              backgroundColor: '#E0D9FF',
              color: '#6E4BFF',
              fontWeight: 500,
            }}
          >
            {discordLabel}
          </Button>
        </Stack>
      </Stack>
    </Container>
  </Box>
);

CtaCommunity.displayName = 'CtaCommunity';
