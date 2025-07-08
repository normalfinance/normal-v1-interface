'use client';

import { useEffect } from 'react';
import { SimpleLayout } from '@/layouts/simple';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import * as Sentry from '@sentry/nextjs';

export default function SentryTestPage() {
  return (
    <SimpleLayout>
      <Container>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Sentry Test Page
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Click the buttons below to test Sentry error reporting.
        </Typography>

        <Button
          variant="contained"
          onClick={() => {
            throw new Error('Sentry Test Client Error');
          }}
          sx={{ mr: 2 }}
        >
          Throw Client Error
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
          Throw Server Error (via API route)
        </Button>

        <Button
          variant="contained"
          color="error"
          sx={{ ml: 2 }}
          onClick={() => {
            Sentry.captureMessage('This is a test message from the client side');
          }}
        >
          Capture Message
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
