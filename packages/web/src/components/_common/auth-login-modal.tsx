'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { signInWithGoogle } from '@/services/auth';

type AuthLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

const AuthLoginModal = ({ open, onClose }: AuthLoginModalProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Error signing in with Google:', err);
      const message = err instanceof Error ? err.message : 'Unable to start Google sign-in.';
      setError(message);
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            px: 3,
            py: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Login to Normal</Typography>
        <IconButton onClick={onClose} aria-label="Close login modal">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <Typography color="text.secondary">
            Continue with Google to access your wallet options.
          </Typography>
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            onClick={handleGoogle}
            disabled={loading}
            startIcon={<Iconify icon="logos:google-icon" width={24} />}
          >
            {loading ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
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
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default AuthLoginModal;
