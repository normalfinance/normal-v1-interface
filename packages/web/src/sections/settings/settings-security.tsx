'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { resetPassword } from '@/services/auth';
import { Turnstile } from '@marsidev/react-turnstile';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useSnackbar } from '@/components/template/snackbar';
import { Iconify } from '@/components/template/iconify';

// ----------------------------------------------------------------------

export function SettingsSecurity() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleSendResetLink = async () => {
    if (!user?.email) {
      enqueueSnackbar(t('Email address is required'), { variant: 'error' });
      return;
    }

    if (!captchaToken) {
      enqueueSnackbar(t('Invalid captcha'), { variant: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(user.email, captchaToken);
      setResetEmailSent(true);
      enqueueSnackbar(t('Password reset email sent'), { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to send reset email'), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        p: '22px',
        borderRadius: '22px',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FFFFFF',
        maxWidth: 480,
      }}
    >
      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: '#0A0A0F', mb: '4px' }}>
        {t('Reset Password')}
      </Typography>
      <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', mb: '20px' }}>
        {t('Click below to receive a password reset link at your email address.')}
      </Typography>

      {!resetEmailSent ? (
        <Stack spacing={2}>
          {/* Email display */}
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 500, color: 'rgba(10,10,15,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', mb: '8px' }}>
              {t('Email')}
            </Typography>
            <Box
              sx={{
                px: '14px',
                py: '12px',
                borderRadius: '12px',
                bgcolor: '#FAFAFB',
                border: '1px solid rgba(10,10,15,0.08)',
              }}
            >
              <Typography sx={{ fontSize: '13px', color: 'rgba(10,10,15,0.5)', fontFamily: '"Geist Mono", "Courier New", monospace' }}>
                {user?.email || '—'}
              </Typography>
            </Box>
          </Box>

          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
            onSuccess={(token) => { setCaptchaToken(token); }}
          />

          <Button
            variant="contained"
            onClick={handleSendResetLink}
            disabled={isSubmitting || !captchaToken}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              borderRadius: '12px',
              bgcolor: '#0A0A0F',
              fontWeight: 700,
              fontSize: '14px',
              py: '12px',
              textTransform: 'none',
              letterSpacing: '-0.01em',
              '&:hover': { bgcolor: '#1a1a25' },
              '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: 'rgba(10,10,15,0.3)' },
            }}
          >
            {isSubmitting ? t('Sending...') : t('Send Reset Link')}
          </Button>
        </Stack>
      ) : (
        <Box
          sx={{
            display: 'flex',
            gap: '12px',
            p: '16px',
            borderRadius: '14px',
            bgcolor: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          <Iconify icon="solar:check-circle-bold" width={20} sx={{ color: 'success.main', flexShrink: 0, mt: '1px' }} />
          <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 500, color: '#0A0A0F', mb: '4px' }}>
              {t("We've sent a password reset link to")} {user?.email}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.5)', lineHeight: 1.5 }}>
              {t('Please check your inbox and spam folder. The link will expire in 1 hour.')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
