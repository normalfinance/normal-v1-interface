'use client';;
import { useTranslate } from '@/locales';

import { m } from 'framer-motion';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from '@/routes/components';

import { SimpleLayout } from '@/layouts/simple';
import { ServerErrorIllustration } from '@/assets/illustrations';

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
          <Typography variant="h3" sx={{ mb: 2 }}>{t('500 Internal server error')}</Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>{t('There was an error, please try again later.')}</Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <ServerErrorIllustration sx={{ my: { xs: 5, sm: 10 } }} />
        </m.div>

        <Button component={RouterLink} href="/" size="large" variant="contained">{t('Go to home')}</Button>
      </Container>
    </SimpleLayout>
  );
}
