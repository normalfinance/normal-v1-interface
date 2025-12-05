'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';

import { exchangeCodeForSession } from '@/services/auth';

type Status = 'pending' | 'success' | 'error';

const AuthCallbackPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState('Completing sign-in...');

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
        const messageText = error instanceof Error ? error.message : 'Unable to complete sign-in.';
        setMessage(messageText);
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
      <Stack spacing={2} alignItems="center">
        {status === 'pending' && <CircularProgress />}
        <Typography variant="h6">{message}</Typography>
      </Stack>
    </Box>
  );
};

export default AuthCallbackPage;
