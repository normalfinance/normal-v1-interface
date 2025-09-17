'use client';

import Image from 'next/image';
import { useTranslate } from '@/locales';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type SpecificNotFoundProps = {
  type: 'pool' | 'index' | 'default';
  title?: string;
  description?: string;
};

const notFoundConfig = {
  pool: {
    src: '/assets/illustrations/placeholders/pool-not-found.svg',
    defaultTitle: 'Pool Not Found',
    defaultDescription: "The pool you're looking for doesn't exist",
  },
  index: {
    src: '/assets/illustrations/placeholders/index-not-found.svg',
    defaultTitle: 'Index Not Found',
    defaultDescription: "The index you're looking for doesn't exist",
  },
  default: {
    src: '/assets/illustrations/placeholders/404.svg',
    defaultTitle: 'Page Not Found',
    defaultDescription: "Sorry, we couldn't find the page you're looking for.",
  },
};

export function SpecificNotFound({ type, title, description }: SpecificNotFoundProps) {
  const { t } = useTranslate();
  const config = notFoundConfig[type];

  return (
    <DashboardContent maxWidth="xl">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          py: 5,
          px: 2.5,
          minHeight: 400,
        }}
      >
        <Image
          src={config.src}
          alt={title || config.defaultTitle}
          width={300}
          height={200}
          style={{ marginBottom: 24 }}
        />

        <Typography
          variant="h4"
          sx={{
            mb: 1,
            color: 'text.primary',
            fontWeight: 600,
          }}
        >
          {title ? t(title) : t(config.defaultTitle)}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          {description ? t(description) : t(config.defaultDescription)}
        </Typography>
      </Box>
    </DashboardContent>
  );
}
