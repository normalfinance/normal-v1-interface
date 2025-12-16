'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';

import type { AppStorePersist } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { Iconify } from '@/components/template/iconify';
import { signInWithGoogle } from '@/services/auth';

type AuthLoginModalProps = {
  open: boolean;
  onClose: () => void;
};

const AuthLoginModal = ({ open, onClose }: AuthLoginModalProps) => {
  const { t } = useTranslate();
  const setDisclaimerAccepted = usePersistStore((s: AppStorePersist) => s.setDisclaimerAccepted);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      // Persist TOS acceptance before signing in
      await setDisclaimerAccepted(true);
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
        <Stack spacing={2}>
          <Typography color="text.secondary">
            {t('Continue with Google to access your wallet options.')}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                data-testid="tos-checkbox"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                {t('I understand and agree to the')}{' '}
                <MuiLink
                  href={`${paths.docs}/other/legal/terms-of-service`}
                  underline="always"
                  color="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Normal Terms of Service')}
                </MuiLink>{' '}
                {t('and')}{' '}
                <MuiLink
                  href={`${paths.docs}/other/legal/disclaimer`}
                  underline="always"
                  color="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('Normal Protocol Disclaimer')}
                </MuiLink>
              </Typography>
            }
            sx={{ alignItems: 'flex-start', mt: 1 }}
          />
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            onClick={handleGoogle}
            disabled={loading || !tosAccepted}
            startIcon={<Iconify icon="logos:google-icon" width={24} />}
          >
            {loading ? t('Redirecting…') : t('Sign in with Google')}
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

