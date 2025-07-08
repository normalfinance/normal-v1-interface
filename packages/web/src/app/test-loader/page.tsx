'use client';

import { useState } from 'react';
import NProgress from 'nprogress';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { SplashScreen } from '@/components/template/loading-screen';

// ----------------------------------------------------------------------

export default function TestLoaderPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartLoading = () => {
    setIsLoading(true);
    NProgress.start();

    setTimeout(() => {
      setIsLoading(false);
      NProgress.done();
    }, 4000);
  };

  return (
    <>
      {isLoading && <SplashScreen />}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Button variant="contained" onClick={handleStartLoading} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Start Loading'}
        </Button>
      </Box>
    </>
  );
}
