'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { useSnackbar } from '@/components/template/snackbar';
import { updatePassword, resetPassword } from '@/services/auth';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';

import { Iconify } from '@/components/template/iconify';

export function SettingsSecurity() {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useSupabaseAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!oldPassword) {
      newErrors.oldPassword = t('Old password is required');
    }

    if (!newPassword) {
      newErrors.newPassword = t('New password is required');
    } else if (newPassword.length < 6) {
      newErrors.newPassword = t('Password must be at least 6 characters');
    } else if (newPassword === oldPassword) {
      newErrors.newPassword = t('New password must differ from old password');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('Please confirm your password');
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = t('Passwords do not match');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(newPassword);
      enqueueSnackbar(t('Password updated successfully'), { variant: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to update password'), { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!user?.email) {
      enqueueSnackbar(t('Email address is required'), { variant: 'error' });
      return;
    }

    try {
      await resetPassword(user.email);
      enqueueSnackbar(t('Password reset email sent'), { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.message || t('Failed to send reset email'), { variant: 'error' });
    }
  };

  return (
    <Card>
      <CardHeader title={t('Change Password')} />
      <CardContent>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label={t('Old Password')}
            type={showOldPassword ? 'text' : 'password'}
            value={oldPassword}
            onChange={(e) => {
              setOldPassword(e.target.value);
              if (errors.oldPassword) {
                setErrors({ ...errors, oldPassword: undefined });
              }
            }}
            error={!!errors.oldPassword}
            helperText={errors.oldPassword}
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    <Iconify icon={showOldPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label={t('New Password')}
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (errors.newPassword) {
                setErrors({ ...errors, newPassword: undefined });
              }
            }}
            error={!!errors.newPassword}
            helperText={errors.newPassword}
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    <Iconify icon={showNewPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label={t('Confirm New Password')}
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                setErrors({ ...errors, confirmPassword: undefined });
              }
            }}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
            disabled={isSubmitting}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                    disabled={isSubmitting}
                  >
                    <Iconify
                      icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ cursor: 'pointer' }}
            >
              {t('Forgot password?')}
            </Link>

            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
            >
              {isSubmitting ? t('Updating...') : t('Update Password')}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

