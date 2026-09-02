'use client';

import { logger } from '@/utils/logger';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from '@/services/auth';
import { clearLoginIntent } from '@/lib/loginIntent';
import { createSupabaseClientWithUrlDetection } from '@/lib/createSupabaseClient';

import { Box, Stack, Button, TextField, Typography, CircularProgress } from '@mui/material';

const supabase = createSupabaseClientWithUrlDetection();

type Status = 'pending' | 'ready' | 'loading' | 'success' | 'error';

const ResetPasswordPage = () => {
  const { t } = useTranslate();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('pending');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearLoginIntent();
    let mounted = true;

    const checkSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        if (mounted) {
          setStatus('ready');
          window.history.replaceState(null, '', window.location.pathname);
        }
        return;
      }

      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type === 'recovery') {
        try {
          const refreshToken = hashParams.get('refresh_token') || '';
          const {
            data: { session: newSession },
            error: sessionError,
          } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!mounted) return;

          if (sessionError) {
            setStatus('error');
            setError(
              sessionError.message || t('Invalid or expired reset link. Please request a new one.')
            );
          } else if (newSession) {
            setStatus('ready');
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            setStatus('error');
            setError(t('Unable to establish session. Please try again.'));
          }
        } catch (err) {
          if (!mounted) return;
          logger.error('Error setting session:', err);
          setStatus('error');
          setError(t('Invalid or expired reset link. Please request a new one.'));
        }
      } else if (!hash) {
        if (mounted) {
          setStatus('error');
          setError(
            t(
              'Invalid reset link. Please make sure you clicked the link directly from your email, or request a new reset link.'
            )
          );
        }
      } else {
        if (mounted) {
          setStatus('error');
          setError(t('Invalid reset link. Missing required parameters.'));
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setStatus('ready');
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    void checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError(t('Please enter a new password'));
      return;
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters long'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('Passwords do not match'));
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      await updatePassword(password);
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const userEmail = currentSession?.user?.email || '';
      setStatus('success');
      setTimeout(() => {
        const redirectUrl = userEmail
          ? `/?passwordResetSuccess=true&email=${encodeURIComponent(userEmail)}`
          : '/?passwordResetSuccess=true';
        router.replace(redirectUrl);
      }, 2000);
    } catch (err) {
      setStatus('error');
      const message =
        err instanceof Error ? err.message : t('Unable to update password. Please try again.');
      setError(message);
    }
  };

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
      <Box sx={{ maxWidth: 400, width: '100%' }}>
        <Stack spacing={3}>
          <Typography variant="h4" align="center">
            {t('Reset Password')}
          </Typography>

          {status === 'pending' && (
            <Stack spacing={2} alignItems="center">
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">
                {t('Verifying reset link...')}
              </Typography>
            </Stack>
          )}

          {status === 'success' && (
            <Stack spacing={2} alignItems="center">
              <Typography variant="h6" color="success.main">
                {t('Password updated successfully!')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('Redirecting...')}
              </Typography>
            </Stack>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  {t('Enter your new password below.')}
                </Typography>

                <TextField
                  label={t('New Password')}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  fullWidth
                  required
                  disabled={status !== 'ready'}
                  autoComplete="new-password"
                />

                <TextField
                  label={t('Confirm New Password')}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError(null);
                  }}
                  fullWidth
                  required
                  disabled={status !== 'ready'}
                  autoComplete="new-password"
                />

                {error && (
                  <Box
                    sx={{
                      backgroundColor: 'error.light',
                      color: 'error.dark',
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                    }}
                  >
                    <Typography variant="body2">{error}</Typography>
                  </Box>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={status !== 'ready'}
                >
                  {status !== 'ready' ? t('Updating...') : t('Update Password')}
                </Button>
              </Stack>
            </form>
          )}

          {status === 'error' && (
            <Stack spacing={2}>
              <Box
                sx={{
                  backgroundColor: 'error.light',
                  color: 'error.dark',
                  borderRadius: 1,
                  px: 2,
                  py: 1,
                }}
              >
                <Typography variant="body2">{error}</Typography>
              </Box>
              <Button variant="outlined" fullWidth onClick={() => router.replace('/')}>
                {t('Back to Home')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default ResetPasswordPage;
