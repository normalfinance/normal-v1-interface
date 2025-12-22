'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { useSnackbar } from '@/components/template/snackbar';
import { resetPassword } from '@/services/auth';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

export function SettingsSecurity() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSendResetLink = async () => {
    if (!user?.email) {
      enqueueSnackbar(t('Email address is required'), { variant: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPassword(user.email);
      setResetEmailSent(true);
      enqueueSnackbar(t('Password reset email sent'), { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to send reset email'), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader title={t('Reset Password')} />
      <CardContent>
        {!resetEmailSent ? (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {t('Click below to receive a password reset link at your email address.')}
            </Typography>
            <TextField
              fullWidth
              label={t('Email')}
              value={user?.email || ''}
              disabled
            />
            <Button
              variant="contained"
              onClick={handleSendResetLink}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            >
              {isSubmitting ? t('Sending...') : t('Send Reset Link')}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography>
              {t("We've sent a password reset link to")} {user?.email}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('Please check your inbox and spam folder. The link will expire in 1 hour.')}
            </Typography>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
