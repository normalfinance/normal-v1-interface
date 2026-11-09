'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { resetPassword } from '@/services/auth';
import { Turnstile } from '@marsidev/react-turnstile';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { INK, FAINT, MUTED, BRAND_COLORS } from '@/theme/brand-colors';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';

import { useSnackbar } from '@/components/template/snackbar';
import { HAIRLINE, BLOCK_SX, INK_BUTTON_SX } from '@/components/_common/brand';

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
    <Box sx={{ ...BLOCK_SX, maxWidth: 480 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 500, color: INK, mb: 0.5 }}>
        {t('Reset password')}
      </Typography>
      <Typography sx={{ fontSize: 13, color: MUTED, mb: 2.5 }}>
        {t('Click below to receive a password reset link at your email address.')}
      </Typography>

      {!resetEmailSent ? (
        <Stack spacing={2}>
          {/* The address the link goes to: words, not a code (Mono is only
              for addresses and hashes on chain). */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              py: 1.25,
              borderTop: HAIRLINE,
              borderBottom: HAIRLINE,
            }}
          >
            <Typography sx={{ fontSize: 14, color: MUTED }}>{t('Email')}</Typography>
            <Typography
              sx={{
                minWidth: 0,
                fontSize: 14,
                fontWeight: 500,
                color: INK,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email ?? ''}
            </Typography>
          </Box>

          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
            onSuccess={(token) => {
              setCaptchaToken(token);
            }}
          />

          <Button
            variant="contained"
            onClick={handleSendResetLink}
            disabled={isSubmitting || !captchaToken}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              ...INK_BUTTON_SX,
              fontWeight: 500,
              fontSize: 14,
              py: 1.5,
              textTransform: 'none',
              '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.08)', color: FAINT },
            }}
          >
            {isSubmitting ? t('Sending...') : t('Send reset link')}
          </Button>
        </Stack>
      ) : (
        // Done: the green panel of the app's endings (colour for meaning).
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 2,
            bgcolor: BRAND_COLORS.mint.tint,
          }}
        >
          <CheckCircleRounded sx={{ fontSize: 20, color: BRAND_COLORS.mint.deep, mt: '1px' }} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: INK, mb: 0.5 }}>
              {t("We've sent a password reset link to")} {user?.email}
            </Typography>
            <Typography sx={{ fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
              {t('Please check your inbox and spam folder. The link will expire in 1 hour.')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
