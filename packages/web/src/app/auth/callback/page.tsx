'use client';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/createSupabaseClient';
import { exchangeCodeForSession } from '@/services/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeNextPath, consumePostAuthNext, DEFAULT_POST_AUTH_PATH } from '@/lib/auth/auth-routes';

import { Box, Stack, Alert, Button, Typography, CircularProgress } from '@mui/material';

type Status = 'pending' | 'success' | 'error';

// A spinner must never be the end of the road: past this, offer a way out.
const SLOW_SIGN_IN_MS = 20_000;

const AuthCallbackPage = () => {
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState('Completing sign-in...');
  const [isPkceError, setIsPkceError] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    // A sign-in code works once, and React runs effects twice in development:
    // the second exchange failed and flashed a false "different browser" warning.
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    const next =
      safeNextPath(searchParams.get('next')) ?? consumePostAuthNext() ?? DEFAULT_POST_AUTH_PATH;

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
        // Reloading this page reuses a spent code. The person is already signed
        // in by then, so that isn't a failure.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          router.replace(next);
          return;
        }

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

  useEffect(() => {
    if (status !== 'pending') return undefined;
    const timer = setTimeout(() => setIsSlow(true), SLOW_SIGN_IN_MS);
    return () => clearTimeout(timer);
  }, [status]);

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
              onClick={() => router.replace(paths.auth.login)}
              sx={{ borderRadius: 2, mt: 1 }}
            >
              {t('Back to log in')}
            </Button>
          </>
        ) : (
          <Typography variant="h6">{message}</Typography>
        )}
        {status === 'pending' && isSlow && (
          <>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('This is taking longer than usual.')}
            </Typography>
            <Button variant="outlined" href={paths.auth.login} sx={{ borderRadius: 2 }}>
              {t('Back to log in')}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
};

export default AuthCallbackPage;
