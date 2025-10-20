'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import { useTranslate } from '@/locales';
import { SimpleLayout } from '@/layouts/simple';
import { RouterLink } from '@/routes/components';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { varBounce, MotionContainer } from '@/components/template/animate';
import { cdn } from '@/utils/cdn';

// ----------------------------------------------------------------------

export function NotFoundView() {
  const { t } = useTranslate();
  return (
    <SimpleLayout
      slotProps={{
        content: { compact: true },
      }}
    >
      <Container component={MotionContainer}>
        <m.div variants={varBounce('in')}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {t('Sorry, page not found!')}
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>
            {t(
              'Sorry, we couldn’t find the page you’re looking for. Perhaps you’ve mistyped the URL? Be sure to check your spelling.'
            )}
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Image
            src={cdn('placeholders/404.svg')}
            alt="404 - Page not found"
            width={400}
            height={300}
            style={{ margin: '40px 0 80px 0' }}
          />
        </m.div>

        <Button component={RouterLink} href="/" size="large" variant="contained">
          {t('Go to home')}
        </Button>
      </Container>
    </SimpleLayout>
  );
}
