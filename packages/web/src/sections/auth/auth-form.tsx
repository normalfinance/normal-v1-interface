'use client';

import type { AuthMode } from '@/lib/auth/auth-routes';
import type { FriendlyAuthError } from '@/lib/auth/auth-errors';

import NextLink from 'next/link';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { rememberLoginIntent } from '@/lib/loginIntent';
import React, { useRef, useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { friendlyAuthError, isExistingAccountSignUp } from '@/lib/auth/auth-errors';
import {
  authHref,
  safeNextPath,
  consumePostAuthNext,
  rememberPostAuthNext,
  rememberMarketingOptIn,
  DEFAULT_POST_AUTH_PATH,
} from '@/lib/auth/auth-routes';
import {
  verifyOtp,
  signInWithOtp,
  resetPassword,
  verifySignupOtp,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  resendConfirmationEmail,
} from '@/services/auth';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Alert,
  Stack,
  Button,
  Divider,
  Checkbox,
  TextField,
  IconButton,
  Typography,
  InputAdornment,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';

import { AuthConsent } from './auth-consent';
import { AuthModeSwitch } from './auth-mode-switch';

type View = 'form' | 'code' | 'forgot' | 'verify-email';
type CaptchaAction = 'submit' | 'forgot';

// The bot check runs invisibly and usually finishes before anyone can click. If
// someone is faster, their click waits for it instead of bouncing with an error.
const CAPTCHA_WAIT_MS = 30_000;

const HEADINGS: Record<AuthMode, { title: string; subtitle: string }> = {
  login: { title: 'Welcome back', subtitle: 'Log in to your wallet and savings.' },
  signup: {
    title: 'Create your account',
    subtitle: "It only takes a minute. We'll set up your wallet next.",
  },
};

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: 'var(--radius-md)' } };

const backButtonSx = { color: 'text.secondary', fontSize: '0.8125rem' };

export function AuthForm() {
  const { t } = useTranslate();
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  const { session } = useSupabaseAuth();
  const { disclaimer, setDisclaimerAccepted } = usePersistStore();

  const mode: AuthMode = pathname === paths.auth.signup ? 'signup' : 'login';
  const next = safeNextPath(searchParams.get('next'));
  const passwordWasReset = searchParams.get('passwordReset') === '1';

  const [view, setView] = useState<View>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useEmailCode, setUseEmailCode] = useState(false);
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [verifyAddress, setVerifyAddress] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [queuedAction, setQueuedAction] = useState<CaptchaAction | null>(null);
  const [challengeShown, setChallengeShown] = useState(false);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const consentRef = useRef<HTMLLabelElement>(null);
  const previousMode = useRef(mode);
  const keepEmailOnSwitch = useRef(false);

  // New accounts always tick the box themselves. Someone logging in only sees
  // it on a device where it was never accepted: Google and email codes can
  // still create an account from the login page.
  const needsConsent = mode === 'signup' || !disclaimer.accepted;
  const consentMissing = needsConsent && !agreed;
  const busy = isBusy || queuedAction !== null;
  const passwordsDiffer = mode === 'signup' && password !== confirmPassword;
  const showConfirmError = confirmChecked && passwordsDiffer;

  const btnPrimary = {
    borderRadius: 'var(--radius-md)',
    py: 1.5,
    fontWeight: 500,
    fontSize: '0.9375rem',
    boxShadow: 'none',
    bgcolor: 'var(--auth-ink)',
    color: 'var(--auth-on-ink)',
    '&:hover': { bgcolor: 'var(--auth-ink)', opacity: 0.86, boxShadow: 'none' },
    '&.Mui-disabled': {
      bgcolor: alpha(theme.palette.text.primary, 0.08),
      color: theme.palette.text.disabled,
    },
  };

  const btnOutlined = {
    borderRadius: 'var(--radius-md)',
    py: 1.5,
    fontWeight: 500,
    fontSize: '0.9375rem',
    borderColor: alpha(theme.palette.text.primary, 0.2),
    color: 'text.primary',
    '&:hover': { borderColor: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.04) },
  };

  useEffect(() => {
    if (!session) return;
    consumePostAuthNext();
    router.replace(next ?? DEFAULT_POST_AUTH_PATH);
  }, [session, next, router]);

  // Pressing Back on Google's screen restores this page from the browser's
  // back/forward cache exactly as it was left: frozen in the busy state.
  useEffect(() => {
    const unfreeze = (event: PageTransitionEvent) => {
      if (event.persisted) setIsBusy(false);
    };
    window.addEventListener('pageshow', unfreeze);
    return () => window.removeEventListener('pageshow', unfreeze);
  }, []);

  // Each mode starts clean. This form stays mounted across both pages, and Chrome
  // fills a saved login into /login, so that login, password included, would
  // otherwise appear on Sign up. The email only follows someone who already tried
  // it and was sent here by the button on the error.
  useEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    if (!keepEmailOnSwitch.current) setEmail('');
    keepEmailOnSwitch.current = false;
    setPassword('');
    setShowPassword(false);
    setConfirmPassword('');
    setConfirmChecked(false);
    setAgreed(false);
    setMarketingOptIn(false);
    setView('form');
    setUseEmailCode(false);
    setError(null);
    setEmailError(false);
    setPasswordError(false);
    setConsentError(false);
  }, [mode]);

  useEffect(() => {
    if (!queuedAction || !captchaToken) return;
    const action = queuedAction;
    setQueuedAction(null);
    runCaptchaAction(action, captchaToken);
    // Runs when the token arrives; the action reads the form as it stands then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedAction, captchaToken]);

  useEffect(() => {
    // A visible challenge waits for the person, however long they take.
    if (!queuedAction || challengeShown) return undefined;
    const timer = setTimeout(failCaptcha, CAPTCHA_WAIT_MS);
    return () => clearTimeout(timer);
  }, [queuedAction, challengeShown]);

  const failCaptcha = () => {
    setQueuedAction(null);
    setError({ message: "We couldn't verify your browser. Refresh the page and try again." });
  };

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const flagConsent = () => {
    setConsentError(true);
    const card = consentRef.current;
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.animate(
        [0, -6, 6, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
        { duration: 380, easing: 'ease-in-out' }
      );
    }
  };

  // Everything a successful sign-in needs later, when this page is already gone.
  const beginAuth = async () => {
    setIsBusy(true);
    setError(null);
    if (needsConsent) await setDisclaimerAccepted(true);
    rememberLoginIntent();
    rememberPostAuthNext(next);
    if (mode === 'signup' && marketingOptIn) rememberMarketingOptIn();
  };

  const openVerifyEmail = (address: string) => {
    setVerifyAddress(address);
    setCode('');
    setError(null);
    setView('verify-email');
  };

  const handleFailure = (err: unknown) => {
    const message = err instanceof Error ? err.message : undefined;
    const friendly = friendlyAuthError(message, 'Something went wrong. Please try again.');
    setIsBusy(false);
    if (friendly.nudge === 'verify-email') {
      const address = email.trim();
      openVerifyEmail(address);
      resendConfirmationEmail(address).catch(() => {});
      return;
    }
    setError(friendly);
  };

  const submitEmail = async (token: string) => {
    const address = email.trim();
    await beginAuth();
    try {
      if (mode === 'signup') {
        const data = await signUpWithPassword(address, password, token);
        if (isExistingAccountSignUp(data)) {
          setError({ message: 'This email already has an account.', nudge: 'login' });
          setIsBusy(false);
        } else if (!data.session) {
          openVerifyEmail(address);
          setIsBusy(false);
        }
      } else if (useEmailCode) {
        await signInWithOtp(address, token);
        setCode('');
        setView('code');
        setIsBusy(false);
      } else {
        await signInWithPassword(address, password, token);
      }
    } catch (err) {
      handleFailure(err);
    } finally {
      resetCaptcha();
    }
  };

  const sendPasswordReset = async (token: string) => {
    setIsBusy(true);
    setError(null);
    try {
      await resetPassword(email.trim(), token);
      setResetSent(true);
    } catch (err) {
      handleFailure(err);
    } finally {
      setIsBusy(false);
      resetCaptcha();
    }
  };

  const runCaptchaAction = (action: CaptchaAction, token: string) => {
    if (action === 'submit') submitEmail(token);
    else sendPasswordReset(token);
  };

  const withCaptcha = (action: CaptchaAction) => {
    if (captchaToken) runCaptchaAction(action, captchaToken);
    else setQueuedAction(action);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const missingEmail = !email.trim();
    const needsPassword = mode === 'signup' || !useEmailCode;
    const missingPassword = needsPassword && !password;
    setEmailError(missingEmail);
    setPasswordError(missingPassword);
    setConfirmChecked(true);
    setError(null);
    if (consentMissing) flagConsent();
    if (missingEmail || missingPassword || passwordsDiffer || consentMissing) return;
    withCaptcha('submit');
  };

  const handleForgotSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const missingEmail = !email.trim();
    setEmailError(missingEmail);
    setError(null);
    if (!missingEmail) withCaptcha('forgot');
  };

  const handleGoogle = async () => {
    if (consentMissing) {
      flagConsent();
      return;
    }
    await beginAuth();
    try {
      await signInWithGoogle();
    } catch (err) {
      handleFailure(err);
    }
  };

  // Six digits submit by themselves, so nobody hunts for a button on a phone.
  const handleCodeChange = async (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    setError(null);
    if (digits.length !== 6) return;
    setIsBusy(true);
    try {
      if (view === 'verify-email') await verifySignupOtp(verifyAddress, digits);
      else await verifyOtp(email.trim(), digits);
    } catch (err) {
      setCode('');
      setIsBusy(false);
      setError({
        message: err instanceof Error ? err.message : 'Invalid code. Please try again.',
      });
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendConfirmationEmail(verifyAddress);
      enqueueSnackbar(t('We sent a new code.'), { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : t('Could not send a new code.'), {
        variant: 'error',
      });
    } finally {
      setIsResending(false);
    }
  };

  const backToForm = () => {
    setView('form');
    setCode('');
    setError(null);
    setResetSent(false);
    setEmailError(false);
  };

  const renderHeading = (title: string, subtitle: React.ReactNode) => (
    <Box>
      <Typography
        component="h1"
        sx={{
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          color: 'var(--auth-ink)',
          mb: 0.75,
        }}
      >
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15 }}>
        {subtitle}
      </Typography>
    </Box>
  );

  const renderError = () =>
    error && (
      <Alert
        severity="error"
        sx={{ borderRadius: 'var(--radius-md)', alignItems: 'center' }}
        action={
          error.nudge === 'signup' || error.nudge === 'login' ? (
            <Button
              component={NextLink}
              href={authHref(error.nudge, next)}
              replace
              scroll={false}
              onClick={() => {
                keepEmailOnSwitch.current = true;
              }}
              size="small"
              color="inherit"
              sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
            >
              {error.nudge === 'signup' ? t('Create an account') : t('Log in instead')}
            </Button>
          ) : undefined
        }
      >
        {t(error.message)}
      </Alert>
    );

  const renderEmailField = () => (
    <TextField
      label={t('Email')}
      type="email"
      name="email"
      autoComplete="email"
      value={email}
      onChange={(event) => {
        setEmail(event.target.value);
        setEmailError(false);
        setError(null);
      }}
      error={emailError}
      helperText={emailError ? t('Enter your email address.') : undefined}
      fullWidth
      disabled={busy}
      sx={fieldSx}
    />
  );

  const renderCodeField = () => (
    <TextField
      label={t('6-digit code')}
      value={code}
      onChange={(event) => handleCodeChange(event.target.value)}
      fullWidth
      autoFocus
      disabled={isBusy}
      slotProps={{
        htmlInput: {
          maxLength: 6,
          inputMode: 'numeric',
          autoComplete: 'one-time-code',
          style: {
            textAlign: 'center',
            letterSpacing: '0.6em',
            fontSize: '1.5rem',
            fontWeight: 500,
          },
        },
      }}
      sx={fieldSx}
    />
  );

  const renderCheckingLabel = () =>
    challengeShown ? t('Complete the check below') : t('Checking your browser…');

  const renderPrimaryLabel = () => {
    if (queuedAction) return renderCheckingLabel();
    if (isBusy) return t('One moment…');
    if (mode === 'signup') return t('Create account');
    return useEmailCode ? t('Email me a code') : t('Log in');
  };

  const renderForm = () => {
    const showPasswordField = mode === 'signup' || !useEmailCode;

    return (
      <Stack spacing={3}>
        <AuthModeSwitch mode={mode} next={next} disabled={busy} />

        {renderHeading(t(HEADINGS[mode].title), t(HEADINGS[mode].subtitle))}

        {passwordWasReset && mode === 'login' && (
          <Alert severity="success" sx={{ borderRadius: 'var(--radius-md)' }}>
            {t('Password updated. Log in with your new password.')}
          </Alert>
        )}

        <Stack component="form" noValidate onSubmit={handleSubmit} spacing={2}>
          {renderEmailField()}

          {showPasswordField && (
            <Box>
              <TextField
                label={t('Password')}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError(false);
                  setError(null);
                }}
                error={passwordError}
                helperText={passwordError ? t('Enter your password.') : undefined}
                fullWidth
                disabled={busy}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowPassword((shown) => !shown)}
                          aria-label={showPassword ? t('Hide password') : t('Show password')}
                        >
                          <Iconify
                            icon={showPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                            width={20}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={fieldSx}
              />
              {mode === 'login' && (
                <Box sx={{ textAlign: 'right', mt: 0.5 }}>
                  <Button
                    variant="text"
                    size="small"
                    disabled={busy}
                    onClick={() => {
                      setError(null);
                      setView('forgot');
                    }}
                    sx={{ ...backButtonSx, mr: -0.75 }}
                  >
                    {t('Forgot password?')}
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {mode === 'signup' && (
            <TextField
              label={t('Confirm password')}
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              onBlur={() => {
                if (confirmPassword) setConfirmChecked(true);
              }}
              error={showConfirmError}
              helperText={
                showConfirmError
                  ? t(confirmPassword ? "Passwords don't match." : 'Enter your password again.')
                  : undefined
              }
              fullWidth
              disabled={busy}
              sx={fieldSx}
            />
          )}

          {needsConsent && (
            <AuthConsent
              cardRef={consentRef}
              checked={agreed}
              showError={consentError && !agreed}
              disabled={busy}
              onChange={(checked) => {
                setAgreed(checked);
                if (checked) setConsentError(false);
              }}
            />
          )}

          {mode === 'signup' && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={marketingOptIn}
                  disabled={busy}
                  onChange={(event) => setMarketingOptIn(event.target.checked)}
                  sx={{ p: 0.5, mr: 0.5 }}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  {t('Send me product updates (optional)')}
                </Typography>
              }
              sx={{ ml: '6px', mr: 0 }}
            />
          )}

          {renderError()}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={busy}
            sx={btnPrimary}
          >
            {renderPrimaryLabel()}
          </Button>

          {mode === 'login' && (
            <Button
              variant="text"
              size="small"
              fullWidth
              disabled={busy}
              onClick={() => {
                setUseEmailCode((usingCode) => !usingCode);
                setPasswordError(false);
                setError(null);
              }}
              sx={backButtonSx}
            >
              {useEmailCode ? t('Use my password instead') : t('Email me a code instead')}
            </Button>
          )}
        </Stack>

        <Divider>
          <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
            {t('OR')}
          </Typography>
        </Divider>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleGoogle}
          disabled={busy}
          startIcon={<Iconify icon="logos:google-icon" width={20} />}
          sx={btnOutlined}
        >
          {t('Continue with Google')}
        </Button>
      </Stack>
    );
  };

  const renderForgot = () => (
    <Stack spacing={3}>
      {renderHeading(t('Reset your password'), t("We'll email you a link to set a new one."))}
      {resetSent ? (
        <Alert severity="success" sx={{ borderRadius: 'var(--radius-md)' }}>
          {t('Check your inbox at')} <strong>{email.trim()}</strong> {t('for a reset link.')}
        </Alert>
      ) : (
        <Stack component="form" noValidate onSubmit={handleForgotSubmit} spacing={2}>
          {renderEmailField()}
          {renderError()}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={busy}
            sx={btnPrimary}
          >
            {queuedAction ? renderCheckingLabel() : t('Send reset link')}
          </Button>
        </Stack>
      )}
      <Button variant="text" size="small" onClick={backToForm} sx={backButtonSx}>
        ← {t('Back to log in')}
      </Button>
    </Stack>
  );

  const renderCode = () => {
    const isSignupCode = view === 'verify-email';
    const address = isSignupCode ? verifyAddress : email.trim();

    return (
      <Stack spacing={3}>
        {renderHeading(
          t('Check your email'),
          <>
            {t('We sent a 6-digit code to')} <strong>{address}</strong>
          </>
        )}
        {renderCodeField()}
        {isBusy && (
          <Stack alignItems="center">
            <CircularProgress size={24} />
          </Stack>
        )}
        {renderError()}
        {isSignupCode && (
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleResend}
            disabled={isResending}
            sx={btnOutlined}
          >
            {isResending ? t('Sending…') : t('Send a new code')}
          </Button>
        )}
        <Button variant="text" size="small" onClick={backToForm} sx={backButtonSx}>
          ← {isSignupCode ? t('Back') : t('Change email')}
        </Button>
      </Stack>
    );
  };

  if (session) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          {t('Loading your account…')}
        </Typography>
      </Stack>
    );
  }

  return (
    <>
      {view === 'form' && renderForm()}
      {view === 'forgot' && renderForgot()}
      {(view === 'code' || view === 'verify-email') && renderCode()}

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Turnstile
          ref={turnstileRef}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
          options={{ appearance: 'interaction-only' }}
          onSuccess={setCaptchaToken}
          onBeforeInteractive={() => setChallengeShown(true)}
          onAfterInteractive={() => setChallengeShown(false)}
          onExpire={() => setCaptchaToken(null)}
          onError={failCaptcha}
          onTimeout={failCaptcha}
        />
        <Typography variant="caption" color="text.disabled">
          {t('Protected by Cloudflare Turnstile')}
        </Typography>
      </Box>
    </>
  );
}
