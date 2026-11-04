'use client';

import type { Session } from '@supabase/supabase-js';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { supabase } from '@/lib/createSupabaseClient';
import { AuthShell } from '@/sections/auth/auth-shell';
import { exchangeCodeForSession } from '@/services/auth';
import { needsSecondFactor } from '@/lib/auth/two-factor';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { TwoFactorChallenge } from '@/sections/auth/two-factor-challenge';
import {
  authHref,
  safeNextPath,
  consumePostAuthNext,
  DEFAULT_POST_AUTH_PATH,
} from '@/lib/auth/auth-routes';

import { Box, Stack, Alert, Button, Typography, CircularProgress } from '@mui/material';

import { useSnackbar } from '@/components/template/snackbar';

type Status = 'pending' | 'code' | 'success' | 'error';

// A spinner must never be the end of the road: past this, offer a way out.
const SLOW_SIGN_IN_MS = 20_000;

const AuthCallbackPage = () => {
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState('');
  const [isPkceError, setIsPkceError] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const startedRef = useRef(false);
  const nextRef = useRef<string>(DEFAULT_POST_AUTH_PATH);

  const enterApp = useCallback(() => {
    setStatus('success');
    router.replace(nextRef.current);
  }, [router]);

  // Someone with 2FA isn't signed in yet, so nothing may say they are. They enter
  // their code here: sending them to /login first only added a slow page load.
  const continueWith = useCallback(
    (session: Session | null) => {
      if (session && needsSecondFactor(session.user, session.access_token)) setStatus('code');
      else enterApp();
    },
    [enterApp]
  );

  useEffect(() => {
    // A sign-in code works once, and React runs effects twice in development:
    // the second exchange failed and flashed a false "different browser" warning.
    if (startedRef.current) return;
    startedRef.current = true;

    const code = searchParams.get('code');
    nextRef.current =
      safeNextPath(searchParams.get('next')) ?? consumePostAuthNext() ?? DEFAULT_POST_AUTH_PATH;

    if (!code) {
      setStatus('error');
      setMessage('Missing authorization code.');
      return;
    }

    const run = async () => {
      try {
        continueWith(await exchangeCodeForSession(code));
      } catch (error) {
        // Reloading this page reuses a spent code. The person is already signed
        // in by then, so that isn't a failure.
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          continueWith(session);
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
  }, [continueWith, searchParams]);

  // The code screen verifies through the app's client, so this is how the page
  // hears the session was upgraded.
  useEffect(() => {
    if (status !== 'code') return undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'MFA_CHALLENGE_VERIFIED') enterApp();
    });
    return () => subscription.unsubscribe();
  }, [status, enterApp]);

  useEffect(() => {
    if (status !== 'pending') return undefined;
    const timer = setTimeout(() => setIsSlow(true), SLOW_SIGN_IN_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const leaveToLogin = async () => {
    await signOut();
    router.replace(authHref('login', nextRef.current));
  };

  return (
    <AuthShell>
      <Stack spacing={2} alignItems="center">
        {status === 'code' && (
          <Box sx={{ width: '100%' }}>
            <TwoFactorChallenge
              onCancel={leaveToLogin}
              onRecovered={async () => {
                await leaveToLogin();
                enqueueSnackbar(t('Two-factor authentication is off. Log in to continue.'), {
                  variant: 'success',
                });
              }}
            />
          </Box>
        )}
        {(status === 'pending' || status === 'success') && (
          <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              {status === 'success' ? t('Loading your account…') : t('Completing sign-in…')}
            </Typography>
          </Stack>
        )}
        {status === 'error' && (
          <>
            <Alert
              severity={isPkceError ? 'warning' : 'error'}
              sx={{ borderRadius: 'var(--radius-lg)', width: '100%' }}
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
              sx={{ borderRadius: 'var(--radius-lg)', mt: 1 }}
            >
              {t('Back to log in')}
            </Button>
          </>
        )}
        {status === 'pending' && isSlow && (
          <>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {t('This is taking longer than usual.')}
            </Typography>
            <Button
              variant="outlined"
              href={paths.auth.login}
              sx={{ borderRadius: 'var(--radius-lg)' }}
            >
              {t('Back to log in')}
            </Button>
          </>
        )}
      </Stack>
    </AuthShell>
  );
};

export default AuthCallbackPage;
