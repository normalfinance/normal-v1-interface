'use client';

import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { exchangeCodeForSession } from '@/services/auth';
import { useRouter, useSearchParams } from 'next/navigation';

import { Box, Stack, Alert, Button, Typography, CircularProgress } from '@mui/material';

type Status = 'pending' | 'success' | 'error';

const AuthCallbackPage = () => {
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState('Completing sign-in...');
  const [isPkceError, setIsPkceError] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) {
      setStatus('error');
      setMessage('Missing authorization code.');
      return;
    }

    const run = async () => {
      try {
        await exchangeCodeForSession(code);
        setStatus('success');
        setMessage('Signed in. Redirecting...');
        router.replace(next);
      } catch (error) {
        setStatus('error');
        const errorMessage = error instanceof Error ? error.message : 'Unable to complete sign-in.';
        const lc = errorMessage.toLowerCase();
        if (lc.includes('pkce') || lc.includes('code verifier') || lc.includes('code_verifier')) {
          setIsPkceError(true);
          setMessage(
            'This confirmation link was opened in a different browser than where you signed up. Please open the link in the original browser, or request a new confirmation email.'
          );
        } else {
          setMessage(errorMessage);
        }
      }
    };

    void run();
  }, [router, searchParams]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 440, width: '100%' }}>
        {status === 'pending' && <CircularProgress />}
        {status === 'error' ? (
          <>
            <Alert
              severity={isPkceError ? 'warning' : 'error'}
              sx={{ borderRadius: 2, width: '100%' }}
            >
              {message}
            </Alert>
            {isPkceError && (
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {t(
                  'Tip: open this link in the browser where you created your account, or go back and request a new confirmation email.'
                )}
              </Typography>
            )}
            <Button
              variant="outlined"
              onClick={() => router.replace('/')}
              sx={{ borderRadius: 2, mt: 1 }}
            >
              {t('Back to sign in')}
            </Button>
          </>
        ) : (
          <Typography variant="h6">{message}</Typography>
        )}
      </Stack>
    </Box>
  );
};

export default AuthCallbackPage;
