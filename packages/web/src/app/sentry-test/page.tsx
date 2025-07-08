'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useTranslate } from '@/locales';
import { SimpleLayout } from '@/layouts/simple';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

export default function SentryTestPage() {
  const { t } = useTranslate();
  return (
    <SimpleLayout>
      <Container>
        <Typography variant="h4" sx={{ mb: 2 }}>
          {t('Sentry Test Page')}
        </Typography>
        <Typography sx={{ mb: 2 }}>
          {t('Click the buttons below to test Sentry error reporting.')}
        </Typography>

        <Button
          variant="contained"
          onClick={() => {
            throw new Error('Sentry Test Client Error');
          }}
          sx={{ mr: 2 }}
        >
          {t('Throw Client Error')}
        </Button>

        <Button
          variant="contained"
          color="secondary"
          onClick={async () => {
            const response = await fetch('/api/sentry-test');
            const text = await response.text();
            console.log(text);
          }}
        >
          {t('Throw Server Error (via API route)')}
        </Button>

        <Button
          variant="contained"
          color="error"
          sx={{ ml: 2 }}
          onClick={() => {
            Sentry.captureMessage('This is a test message from the client side', {
              level: 'info',
              fingerprint: ['test-fingerprint'],
              tags: {
                environment: 'development',
              },
              extra: {
                custom_data: 'This is a custom data',
              },
              user: {
                id: '123',
                email: 'test@test.com',
              },
            });
          }}
        >
          {t('Capture Message')}
        </Button>

        <SentryTestComponent />
      </Container>
    </SimpleLayout>
  );
}

function SentryTestComponent() {
  useEffect(() => {
    Sentry.captureMessage('This is a sentry test load from the client side');
  }, []);
  return null;
}
