'use client';

import type { AppStorePersist } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { usePersistStore } from '@normalfinance/state';
import {
  verifyOtp,
  signInWithOtp,
  resetPassword,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from '@/services/auth';

import {
  Box,
  Stack,
  Alert,
  Button,
  Dialog,
  Divider,
  Checkbox,
  TextField,
  IconButton,
  Typography,
  DialogTitle,
  ToggleButton,
  DialogContent,
  Link as MuiLink,
  FormControlLabel,
  ToggleButtonGroup,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

type AuthLoginModalProps = {
  open: boolean;
  onClose: () => void;
  passwordResetSuccess?: boolean;
  resetEmail?: string | null;
};

type AuthMode = 'password' | 'magic-link';

const AuthLoginModal = ({
  open,
  onClose,
  passwordResetSuccess = false,
  resetEmail = null,
}: AuthLoginModalProps) => {
  const { t } = useTranslate();
  const setDisclaimerAccepted = usePersistStore((s: AppStorePersist) => s.setDisclaimerAccepted);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('magic-link');
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    if (passwordResetSuccess && open) {
      setAuthMode('password');
      if (resetEmail) {
        setEmail(resetEmail);
      }
    }
  }, [passwordResetSuccess, open, resetEmail]);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);

    try {
      await setDisclaimerAccepted(true);
      await signInWithGoogle();
    } catch (err) {
      console.error('Error signing in with Google:', err);
      const message = err instanceof Error ? err.message : 'Unable to start Google sign-in.';
      setError(message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim()) {
      setError(t('Please enter your email address'));
      return;
    }

    if (!captchaToken) {
      setError(t('Invalid captcha'));
      return;
    }

    if (authMode === 'password') {
      if (!password.trim()) {
        setError(t('Please enter your password'));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await setDisclaimerAccepted(true);
        if (isSignUp) {
          await signUpWithPassword(email.trim(), password, captchaToken);
          setError(t('Account created! Please check your email to verify your account.'));
          setLoading(false);
        } else {
          await signInWithPassword(email.trim(), password, captchaToken);
          onClose();
        }
      } catch (err) {
        console.error('Error signing in with password:', err);
        const message =
          err instanceof Error ? err.message : t('Unable to sign in. Please try again.');
        setError(message);
        setLoading(false);
      }
    } else {
      setLoading(true);
      setError(null);

      try {
        await signInWithOtp(email.trim(), captchaToken);
        setOtpSent(true);
        setLoading(false);
      } catch (err) {
        console.error('Error sending magic link:', err);
        const message =
          err instanceof Error ? err.message : t('Unable to send magic link. Please try again.');
        setError(message);
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async (token?: string) => {
    const codeToVerify = token ?? otpToken;
    if (!codeToVerify.trim() || codeToVerify.trim().length !== 6) {
      setError(t('Please enter the 6-digit code'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await setDisclaimerAccepted(true);
      await verifyOtp(email.trim(), codeToVerify.trim());
      onClose();
    } catch (err) {
      console.error('Error verifying OTP:', err);
      const message = err instanceof Error ? err.message : t('Invalid code. Please try again.');
      setError(message);
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setOtpToken(numericValue);
    setError(null);

    if (numericValue.length === 6) {
      handleVerifyOtp(numericValue);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(t('Please enter your email address'));
      return;
    }

    if (!captchaToken) {
      setError(t('Invalid captcha'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await resetPassword(email.trim(), captchaToken);
      console.log('Password reset request result:', result);
      setResetEmailSent(true);
      setLoading(false);
    } catch (err) {
      console.error('Error sending password reset email:', err);
      const message =
        err instanceof Error
          ? err.message
          : t('Unable to send password reset email. Please try again.');
      setError(message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setOtpToken('');
    setOtpSent(false);
    setError(null);
    setAuthMode('magic-link');
    setIsSignUp(false);
    setTosAccepted(false);
    setForgotPassword(false);
    setResetEmailSent(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <Typography variant="h6">{t('Login to Normal')}</Typography>
        <IconButton onClick={handleClose} aria-label="Close login modal">
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {passwordResetSuccess && (
            <Box
              sx={{
                backgroundColor: 'success.light',
                color: 'success.dark',
                borderRadius: 1,
                px: 2,
                py: 1,
              }}
            >
              <Typography variant="body2">
                {t('Password updated successfully! You can now login with your new password.')}
              </Typography>
            </Box>
          )}
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

          <Divider sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('or')}
            </Typography>
          </Divider>

          {!otpSent && !forgotPassword ? (
            <>
              <TextField
                label={t('Email')}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                fullWidth
                disabled={loading}
                autoComplete="email"
              />

              <ToggleButtonGroup
                value={authMode}
                exclusive
                onChange={(_, newMode) => {
                  if (newMode !== null) {
                    setAuthMode(newMode);
                    setError(null);
                  }
                }}
                fullWidth
                disabled={loading}
              >
                <ToggleButton value="password">{t('Password')}</ToggleButton>
                <ToggleButton value="magic-link">{t('Magic Link')}</ToggleButton>
              </ToggleButtonGroup>

              {authMode === 'password' && (
                <>
                  <TextField
                    label={t('Password')}
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    fullWidth
                    disabled={loading}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(null);
                      }}
                      disabled={loading}
                    >
                      {isSignUp ? t('Already have an account?') : t('Need an account?')}
                    </Button>
                    {!isSignUp && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => {
                          setForgotPassword(true);
                          setError(null);
                        }}
                        disabled={loading}
                      >
                        {t('Forgot Password?')}
                      </Button>
                    )}
                  </Box>
                </>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={handleEmailAuth}
                disabled={
                  loading ||
                  !email.trim() ||
                  (authMode === 'password' && !password.trim()) ||
                  !tosAccepted
                }
                fullWidth
              >
                {loading
                  ? t('Processing…')
                  : authMode === 'password'
                    ? isSignUp
                      ? t('Sign Up')
                      : t('Sign In')
                    : t('Send Magic Link')}
              </Button>

              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
                onSuccess={(token) => {
                  setCaptchaToken(token);
                }}
              />

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
                    {t("I understand and agree to Normal's")}{' '}
                    <MuiLink
                      href={paths.legal.tos}
                      underline="always"
                      color="secondary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Terms of Service')}
                    </MuiLink>{' '}
                    {t('and')}{' '}
                    <MuiLink
                      href={paths.legal.disclaimer}
                      underline="always"
                      color="secondary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('Disclaimer')}
                    </MuiLink>
                  </Typography>
                }
                sx={{ alignItems: 'flex-start', my: 1 }}
              />
            </>
          ) : forgotPassword ? (
            <>
              {resetEmailSent ? (
                <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {t('If an account exists for')} {email},{' '}
                    {t('we have sent a password reset link to your email address.')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {t('Please check your inbox and spam folder. The link will expire in 1 hour.')}
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setForgotPassword(false);
                      setResetEmailSent(false);
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    {t('Back to Sign In')}
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      'Enter your email address and we will send you a link to reset your password.'
                    )}
                  </Typography>
                  <TextField
                    label={t('Email')}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    fullWidth
                    disabled={loading}
                    autoComplete="email"
                  />
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleForgotPassword}
                    disabled={loading || !email.trim()}
                    fullWidth
                  >
                    {loading ? t('Sending…') : t('Send Reset Link')}
                  </Button>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setForgotPassword(false);
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    {t('Back to Sign In')}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('We sent a 6-digit code to')} {email}
              </Typography>
              <TextField
                label={t('Enter 6-digit code')}
                value={otpToken}
                onChange={(e) => handleOtpChange(e.target.value)}
                fullWidth
                disabled={loading}
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' },
                }}
                autoFocus
              />
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setOtpSent(false);
                  setOtpToken('');
                  setError(null);
                }}
                disabled={loading}
              >
                {t('Change email')}
              </Button>
            </>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{
                borderRadius: 1,
                px: 2,
                py: 1,
              }}
            >
              <Typography variant="body2">{error}</Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default AuthLoginModal;
