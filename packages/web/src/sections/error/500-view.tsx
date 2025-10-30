'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import { cdn } from '@/utils/cdn';
import { useTranslate } from '@/locales';
import { SimpleLayout } from '@/layouts/simple';
import { RouterLink } from '@/routes/components';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { varBounce, MotionContainer } from '@/components/template/animate';

// ----------------------------------------------------------------------

export function View500() {
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
            {t('500 Internal server error')}
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>
            {t('There was an error, please try again later.')}
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Image
            src={cdn('placeholders/server-error.svg')}
            alt="500 - Server error"
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
