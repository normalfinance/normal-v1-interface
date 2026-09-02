'use client';

import type { LinkedWallet } from '@/services/linked-wallets';

import QRCode from 'qrcode';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useStellarConfig } from '@/hooks';
import { buildAuthHeaders } from '@/utils/http';
import { supabase } from '@/lib/createSupabaseClient';
import { getSavingsUsdcIssuer } from '@/utils/token-selectors';
import { ensureChainAccount } from '@/lib/turnkey/add-account';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useTrustLine } from '@/hooks/stellar/tokens/use-trustline';
import { readExternalWalletMemo } from '@/lib/wallet-reconnect-memo';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { importMnemonicIntoTurnkey } from '@/lib/turnkey/import-mnemonic';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { usePersistStore, useStellarWalletKitStore } from '@normalfinance/state';
import { shouldAdoptIntoSlot, shouldReattachExternalOnLogin } from '@/lib/wallet-slot';
import { getTurnkeyWalletInfo, isTurnkeyStellarAddress } from '@/lib/turnkey/wallet-info';
import { linkWallet, getLinkedWallets, updateWalletName } from '@/services/linked-wallets';
import {
  useNormalWallet,
  hasStoredNormalWalletKey,
  removeStoredNormalWalletKey,
} from '@/hooks/stellar/use-normal-wallet';
import {
  verifyOtp,
  signInWithOtp,
  resetPassword,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  resendConfirmationEmail,
} from '@/services/auth';
import {
  logger,
  format,
  isTestnet,
  validateMnemonic,
  normalizeMnemonic,
  fetchAccountStrict,
  validatePrivateKey,
  createCoinbasePayOnrampURL,
} from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Tab,
  Tabs,
  Stack,
  Alert,
  Button,
  Dialog,
  Divider,
  Tooltip,
  Checkbox,
  TextField,
  IconButton,
  Typography,
  DialogContent,
  Link as MuiLink,
  CircularProgress,
  FormControlLabel,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import ModalCloseButton from '@/components/_common/modal-close-button';

import { GetStartedPicker } from './get-started-picker';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export type WizardStep =
  | 'sign-in'
  | 'verify-email'
  | 'get-started'
  | 'choose-wallet'
  | 'create-wallet'
  | 'import-wallet'
  | 'fund-xlm'
  | 'add-trustline'
  | 'all-set'
  | 'linked-accounts';

type AuthMode = 'magic-link' | 'password';
type ImportType = 'mnemonic' | 'private-key';

const TOTAL_DOTS = 6;

// Maps each step to its dot position (0-indexed, 0–5)
const STEP_DOT: Record<WizardStep, number> = {
  'sign-in': 0,
  'verify-email': 0,
  'get-started': 1,
  'choose-wallet': 1,
  'create-wallet': 2,
  'import-wallet': 2,
  'fund-xlm': 3,
  'add-trustline': 4,
  'all-set': 5,
  'linked-accounts': 5,
};

const STEP_NUMBER: Record<WizardStep, number> = {
  'sign-in': 1,
  'verify-email': 1,
  'get-started': 2,
  'choose-wallet': 2,
  'create-wallet': 3,
  'import-wallet': 3,
  'fund-xlm': 4,
  'add-trustline': 5,
  'all-set': 6,
  'linked-accounts': 6,
};

const STEP_LABEL: Record<WizardStep, string> = {
  'sign-in': 'SIGN IN',
  'verify-email': 'VERIFY EMAIL',
  'get-started': 'GET STARTED',
  'choose-wallet': 'CHOOSE WALLET',
  'create-wallet': 'CREATE WALLET',
  'import-wallet': 'IMPORT WALLET',
  'fund-xlm': 'FUND WITH XLM',
  'add-trustline': 'ADD TRUSTLINE',
  'all-set': 'ALL SET',
  'linked-accounts': 'LINKED ACCOUNTS',
};

// Steps that allow navigating back
const PREV_STEP: Partial<Record<WizardStep, WizardStep>> = {
  'choose-wallet': 'get-started',
  'create-wallet': 'choose-wallet',
  'import-wallet': 'choose-wallet',
  'add-trustline': 'fund-xlm',
};

// ---------------------------------------------------------------------------

export type OnboardingWizardProps = {
  open: boolean;
  onClose: () => void;
  passwordResetSuccess?: boolean;
  resetEmail?: string | null;
  initialStep?: WizardStep;
};

export default function OnboardingWizard({
  open,
  onClose,
  passwordResetSuccess = false,
  resetEmail = null,
  initialStep,
}: OnboardingWizardProps) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();
  const { copy } = useCopyToClipboard();
  const persist = usePersistStore();
  const config = useStellarConfig();
  const savingsUsdcIssuer = getSavingsUsdcIssuer(config);
  const { session, isLoading: authHookLoading } = useSupabaseAuth();
  const { disclaimer, setDisclaimerAccepted } = persist;

  const { importWalletFromMnemonic, importWalletFromPrivateKey, connectWalletWithoutKeypair } =
    useNormalWallet();
  // publicKey is deliberately NOT destructured: the connect handler must read
  // it from getState() after connecting, never from this (pre-connect) render.
  const { connectWallet: connectStellarWallet } = useStellarWalletsKit();
  const { addTrustLine, txBroadcasting: isAddingTrustline } = useTrustLine();

  // ── Navigation ───────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('sign-in');
  const [wizardWalletAddress, setWizardWalletAddress] = useState('');

  // ── Account status ────────────────────────────────────────────────────────
  const {
    isLoading: isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    refetch: refetchAccountStatus,
  } = useAccountStatus(wizardWalletAddress, { assetIssuer: savingsUsdcIssuer });

  // ── Auth state ────────────────────────────────────────────────────────────
  const [tosAccepted, setTosAccepted] = useState(disclaimer.accepted);
  const [showTosHelper, setShowTosHelper] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);

  // ── Create-wallet (Turnkey) state ─────────────────────────────────────────
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [walletCreateError, setWalletCreateError] = useState<string | null>(null);

  // ── Import-wallet state ───────────────────────────────────────────────────
  const [importType, setImportType] = useState<ImportType>('mnemonic');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [importMnemonicError, setImportMnemonicError] = useState('');
  const [importPrivateKeyError, setImportPrivateKeyError] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStage, setImportStage] = useState<string | null>(null);

  // ── Fund-XLM state ────────────────────────────────────────────────────────
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isCoinbaseLoading, setIsCoinbaseLoading] = useState(false);
  const [isCheckingXlm, setIsCheckingXlm] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // ── Trustline state ───────────────────────────────────────────────────────
  const [trustlineError, setTrustlineError] = useState<string | null>(null);

  // ── Linked-accounts step state ────────────────────────────────────────────
  const [turnkeyStellarAddress, setTurnkeyStellarAddress] = useState<string | null>(null);
  const [linkedWalletsForStep, setLinkedWalletsForStep] = useState<LinkedWallet[]>([]);
  const [isLoadingLinkedWallets, setIsLoadingLinkedWallets] = useState(false);
  const [linkedWalletEditingAddr, setLinkedWalletEditingAddr] = useState<string | null>(null);
  const [linkedWalletEditName, setLinkedWalletEditName] = useState('');
  const [isSavingLinkedWalletName, setIsSavingLinkedWalletName] = useState(false);
  const [connectingWalletAddr, setConnectingWalletAddr] = useState<string | null>(null);

  // ── Returning-user flag ───────────────────────────────────────────────────
  // True when the user already has a linked wallet — we skip showing the
  // fund-xlm / add-trustline / all-set screens if everything is already set up.
  const [isReturningUser, setIsReturningUser] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────
  const isTosAcceptanceMissing = !tosAccepted;
  const dotIndex = STEP_DOT[step];
  const stepNumber = STEP_NUMBER[step];
  const canGoBack = !!PREV_STEP[step];

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      setTosAccepted(disclaimer.accepted);
      setShowTosHelper(false);
      if (initialStep) {
        setStep(initialStep);
        // Seed the wallet address so fund-xlm / add-trustline screens work
        // without going through handleAfterAuth.
        if (!wizardWalletAddress && persist.wallet.address) {
          setWizardWalletAddress(persist.wallet.address);
        }
      }
    }
  }, [open, disclaimer.accepted]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (passwordResetSuccess && open) {
      setAuthMode('password');
      if (resetEmail) setEmail(resetEmail);
    }
  }, [passwordResetSuccess, open, resetEmail]);

  const hasHandledAuthRef = useRef(false);
  const syncMarketingOptIn = useCallback(async (optIn: boolean) => {
    try {
      const headers = await buildAuthHeaders();
      await fetch('/api/marketing/opt-in', {
        method: 'POST',
        headers,
        body: JSON.stringify({ optIn }),
      });
      await supabase.auth.updateUser({ data: { marketing_opt_in: optIn } });
    } catch {
      // best-effort — never block the wizard
    }
  }, []);

  const handleAfterAuth = useCallback(async () => {
    try {
      const wallets = await getLinkedWallets();
      if (marketingConsent) syncMarketingOptIn(true);

      if (wallets.length === 0) {
        // New user — asset-first. No wallet is created until they pick an asset.
        setStep('get-started');
        return;
      }

      // THE external wallet the user had connected wins over the Turnkey
      // auto-connect below (live incident 2026-08-22: "I log in, see the
      // combined assets for a second, then it all goes away"). This block
      // used to run unconditionally and OVERWROTE the slot with the Turnkey
      // wallet on every login, silently switching the wallet of anyone who
      // had connected Lobstr/Freighter — the same wallet-switch class as
      // finding #42, but on the login path instead of the self-heal.
      // `wallets` above is this account's linked list, so membership is a
      // server-side ownership check: a memo from another user on a shared
      // browser can never match.
      const externalMemo = readExternalWalletMemo();
      if (
        externalMemo &&
        shouldReattachExternalOnLogin(
          externalMemo.address,
          wallets.map((w) => w.walletAddress)
        )
      ) {
        await persist.connectWallet(externalMemo.address, externalMemo.walletType);
        onClose();
        return;
      }

      // A Turnkey wallet is the user's primary — connect it silently and never
      // block login with the account picker, even when old (pre-Turnkey)
      // linked wallets exist. Those stay reachable from the drawer's wallet
      // selection (the re-import flow) as an opt-in action, not a login toll.
      // (Post-DB-consolidation, returning users have BOTH their Turnkey wallet
      // and their old-architecture wallets linked — the picker here made every
      // login start with a modal.)
      const tk = await getTurnkeyWalletInfo();
      const tkAddress = tk?.stellarAddress ?? null;
      setTurnkeyStellarAddress(tkAddress);

      if (tkAddress) {
        try {
          await connectWalletWithoutKeypair(tkAddress);
          onClose();
          return;
        } catch (err) {
          logger.error('[OnboardingWizard] Turnkey auto-connect failed:', err);
          // fall through to the picker
        }
      }

      // Legacy-only user (no Turnkey wallet yet) — show the picker so they can
      // reconnect one of their old wallets or import it into Turnkey.
      setIsReturningUser(true);
      setStep('linked-accounts');
    } catch (err) {
      logger.error('[OnboardingWizard] handleAfterAuth error:', err);
      setStep('get-started');
    }
  }, [marketingConsent, syncMarketingOptIn, connectWalletWithoutKeypair, persist, onClose]);

  useEffect(() => {
    if (!open) return;
    // Skip auto-routing when the caller explicitly set an initialStep — they
    // already know which step to show and handleAfterAuth would override it.
    if (
      !initialStep &&
      session &&
      (step === 'sign-in' || step === 'verify-email') &&
      !authHookLoading &&
      !hasHandledAuthRef.current
    ) {
      hasHandledAuthRef.current = true;
      handleAfterAuth();
    }
    if (!session) hasHandledAuthRef.current = false;
  }, [open, session, step, authHookLoading, handleAfterAuth, initialStep]);

  // Generate QR when entering fund-xlm
  useEffect(() => {
    if (step !== 'fund-xlm' || !wizardWalletAddress) return;
    setIsGeneratingQR(true);
    QRCode.toDataURL(wizardWalletAddress, {
      width: 180,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => setQrCodeUrl(url))
      .catch(() => {})
      .finally(() => setIsGeneratingQR(false));
  }, [step, wizardWalletAddress]);

  // Auto-advance from fund-xlm when funded
  useEffect(() => {
    if (step !== 'fund-xlm' || isCheckingAccount) return;
    if (accountExists) {
      stopPolling();
      if (savingsUsdcIssuer && !hasUsdcTrustline) {
        setStep('add-trustline');
      } else if (isReturningUser) {
        onClose();
      } else {
        setStep('linked-accounts');
      }
    }
    // `onClose` is a fresh prop function each render; listing it would re-run
    // this step-routing effect every render. Keyed on the real step inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    isCheckingAccount,
    accountExists,
    hasUsdcTrustline,
    savingsUsdcIssuer,
    isReturningUser,
  ]);

  // Poll every 5s on fund-xlm
  useEffect(() => {
    if (step !== 'fund-xlm' || isCheckingAccount || accountExists) {
      stopPolling();
      return undefined;
    }
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => refetchAccountStatus(), 5000);
    }
    return () => stopPolling();
  }, [step, isCheckingAccount, accountExists]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance from add-trustline when trustline added
  useEffect(() => {
    if (step !== 'add-trustline' || !hasUsdcTrustline) return;
    if (isReturningUser) {
      onClose();
    } else {
      setStep('linked-accounts');
    }
  }, [step, hasUsdcTrustline, isReturningUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) fullReset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load wallets when entering linked-accounts step
  useEffect(() => {
    if (step !== 'linked-accounts') return undefined;
    let cancelled = false;
    const load = async () => {
      setIsLoadingLinkedWallets(true);
      try {
        const [list, tk] = await Promise.all([getLinkedWallets(), getTurnkeyWalletInfo()]);
        if (!cancelled) {
          setLinkedWalletsForStep(list);
          setTurnkeyStellarAddress(tk?.stellarAddress ?? null);
        }
      } catch (err) {
        logger.error('[OnboardingWizard] Failed to load linked wallets:', err);
      } finally {
        if (!cancelled) setIsLoadingLinkedWallets(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [step]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const persistTos = async () => {
    if (tosAccepted) await setDisclaimerAccepted(true);
  };
  const enforceTos = (): boolean => {
    if (!isTosAcceptanceMissing) return true;
    setShowTosHelper(true);
    return false;
  };

  const handleBack = () => {
    const prev = PREV_STEP[step];
    if (!prev) return;
    if (step === 'create-wallet') {
      setWalletCreateError(null);
    }
    if (step === 'import-wallet') {
      setImportMnemonic('');
      setImportPrivateKey('');
      setImportMnemonicError('');
      setImportPrivateKeyError('');
      setImportError(null);
    }
    setStep(prev);
  };

  const fullReset = () => {
    stopPolling();
    setStep('sign-in');
    setWizardWalletAddress('');
    setEmail('');
    setPassword('');
    setOtpToken('');
    setOtpSent(false);
    setAuthError(null);
    setAuthMode('password');
    setIsSignUp(false);
    setForgotPassword(false);
    setResetEmailSent(false);
    setCaptchaToken(null);
    setVerifyEmailAddress('');
    setIsResendingConfirmation(false);
    setWalletCreateError(null);
    setIsCreatingWallet(false);
    setImportMnemonic('');
    setImportPrivateKey('');
    setImportError(null);
    setQrCodeUrl('');
    setTrustlineError(null);
    setIsReturningUser(false);
    setLinkedWalletsForStep([]);
    setIsLoadingLinkedWallets(false);
    setTurnkeyStellarAddress(null);
    setLinkedWalletEditingAddr(null);
    setLinkedWalletEditName('');
    setIsSavingLinkedWalletName(false);
    hasHandledAuthRef.current = false;
  };

  const handleClose = () => {
    onClose();
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────

  const resetCaptcha = () => {
    turnstileRef.current?.reset();
    setCaptchaToken(null);
  };

  const handleGoogle = async () => {
    if (!enforceTos()) return;
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await persistTos();
      await signInWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || t('Unable to start Google sign-in.'));
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!enforceTos()) return;
    if (!email.trim()) {
      setAuthError(t('Please enter your email address'));
      return;
    }
    if (!captchaToken) {
      setAuthError(t('Please complete the captcha'));
      return;
    }
    if (authMode === 'password' && !password.trim()) {
      setAuthError(t('Please enter your password'));
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await persistTos();
      if (authMode === 'password') {
        if (isSignUp) {
          const data = await signUpWithPassword(email.trim(), password, captchaToken);
          setIsAuthLoading(false);
          if (!data.session) {
            // Email confirmation required — show verify-email step
            setVerifyEmailAddress(email.trim());
            setStep('verify-email');
          }
          // If session exists (auto-confirm), the auth effect handles navigation
        } else {
          await signInWithPassword(email.trim(), password, captchaToken);
        }
      } else {
        await signInWithOtp(email.trim(), captchaToken);
        setOtpSent(true);
        setIsAuthLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message || t('Unable to sign in. Please try again.'));
      setIsAuthLoading(false);
      resetCaptcha();
    }
  };

  const handleVerifyOtp = async (token?: string) => {
    if (!enforceTos()) return;
    const code = token ?? otpToken;
    if (!code.trim() || code.length !== 6) {
      setAuthError(t('Please enter the 6-digit code'));
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await persistTos();
      await verifyOtp(email.trim(), code.trim());
    } catch (err: any) {
      setAuthError(err.message || t('Invalid code. Please try again.'));
      setIsAuthLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, 6);
    setOtpToken(numeric);
    setAuthError(null);
    if (numeric.length === 6) handleVerifyOtp(numeric);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setAuthError(t('Please enter your email address'));
      return;
    }
    if (!captchaToken) {
      setAuthError(t('Please complete the captcha'));
      return;
    }
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await resetPassword(email.trim(), captchaToken);
      setResetEmailSent(true);
    } catch (err: any) {
      setAuthError(err.message || t('Unable to send password reset email.'));
      resetCaptcha();
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!verifyEmailAddress) return;
    setIsResendingConfirmation(true);
    try {
      await resendConfirmationEmail(verifyEmailAddress);
      enqueueSnackbar(t('Confirmation email resent!'), { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.message || t('Failed to resend confirmation email'), {
        variant: 'error',
      });
    } finally {
      setIsResendingConfirmation(false);
    }
  };

  // ── Wallet creation handler (Turnkey) ─────────────────────────────────────
  // Creates a passkey-secured Turnkey wallet with ONLY the XLM account
  // (other chains are provisioned lazily). No seed phrase to back up.
  const handleCreateTurnkeyWallet = async () => {
    if (!session?.user) {
      setWalletCreateError(t('You must be signed in to create a wallet'));
      return;
    }
    setIsCreatingWallet(true);
    setWalletCreateError(null);
    try {
      const result = await ensureChainAccount('stellar', session.user.id, session.user.email);
      if (!result.stellarAddress)
        throw new Error(t('Wallet creation did not return a Stellar address'));

      await linkWallet(result.stellarAddress);
      // #32 chunk 3: adopt into the wallet slot only when nothing is connected
      // (signup — unchanged). With an external wallet connected, the new
      // Normal wallet is a companion; the user's chosen wallet stays put
      // (invariant I1 — the last remaining slot-stealer, closed).
      if (shouldAdoptIntoSlot(persist.wallet.address)) {
        await connectWalletWithoutKeypair(result.stellarAddress);
      }
      setWizardWalletAddress(result.stellarAddress);
      enqueueSnackbar(t('Wallet created and secured with your passkey!'), { variant: 'success' });
      // Asset-first: land on "get started" (buy/receive) instead of forcing the
      // savings-specific XLM funding + trustline.
      setStep('get-started');
    } catch (err: any) {
      logger.error('[OnboardingWizard] Turnkey wallet creation failed:', err);
      setWalletCreateError(err.message || t('Failed to create wallet. Please try again.'));
    } finally {
      setIsCreatingWallet(false);
    }
  };

  // ── Import handlers ───────────────────────────────────────────────────────

  const handleImport = async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      let importedAddress: string;
      if (importType === 'mnemonic') {
        const normalized = normalizeMnemonic(importMnemonic);
        if (!validateMnemonic(normalized)) {
          setImportMnemonicError(t('Invalid recovery phrase'));
          setIsImporting(false);
          return;
        }
        const result = await importWalletFromMnemonic(normalized, undefined, undefined, {
          persistLocally: true,
        });
        importedAddress = result.publicKey;
      } else {
        const trimmed = importPrivateKey.trim();
        if (!validatePrivateKey(trimmed)) {
          setImportPrivateKeyError(t('Invalid private key (must start with S, 56 characters)'));
          setIsImporting(false);
          return;
        }
        const result = await importWalletFromPrivateKey(trimmed, undefined, {
          persistLocally: true,
        });
        importedAddress = result.publicKey;
      }
      setWizardWalletAddress(importedAddress);
      // Connect the imported wallet so the asset-first flow recognises it as the
      // active wallet (and never tries to lazily create a new one for it).
      await connectWalletWithoutKeypair(importedAddress);
      enqueueSnackbar(t('Wallet imported successfully!'), { variant: 'success' });
      setStep('get-started');
    } catch (err: any) {
      logger.error('[OnboardingWizard] Import failed:', err);
      setImportError(err.message || t('Failed to import wallet'));
    } finally {
      setIsImporting(false);
    }
  };

  // Import the mnemonic AND secure it with a Turnkey passkey (recommended path).
  // The phrase is encrypted in this browser to a Turnkey enclave key — it never
  // reaches our server. No local key is stored; signing goes through the passkey.
  const handleImportWithPasskey = async () => {
    if (!session?.user) {
      setImportError(t('You must be signed in to import a wallet'));
      return;
    }
    const normalized = normalizeMnemonic(importMnemonic);
    if (!validateMnemonic(normalized)) {
      setImportMnemonicError(t('Invalid recovery phrase'));
      return;
    }

    setIsImporting(true);
    setImportError(null);
    try {
      // 1 — derive + link + connect locally; keypair stays in memory only
      const result = await importWalletFromMnemonic(normalized, undefined, undefined, {
        persistLocally: false,
      });
      setWizardWalletAddress(result.publicKey);

      // 2 — import the same phrase into Turnkey (passkey ceremony if first time)
      const STAGE_LABELS: Record<string, string> = {
        passkey: t('Create your passkey…'),
        preparing: t('Preparing secure import…'),
        authorize: t('Approve with your passkey…'),
        encrypting: t('Encrypting your phrase…'),
        importing: t('Approve import with your passkey…'),
      };
      const tk = await importMnemonicIntoTurnkey({
        mnemonic: normalized,
        supabaseUserId: session.user.id,
        userEmail: session.user.email,
        expectedStellarAddress: result.publicKey,
        onStage: (stage) => setImportStage(STAGE_LABELS[stage] ?? null),
      });

      if (!tk.stellarMatch) {
        // Should be impossible (identical derivation paths) — keep the wallet
        // usable and let the user fall back to the password option.
        setImportError(
          t(
            'Passkey setup did not match this wallet. You can retry, or import with a password below.'
          )
        );
        return;
      }

      // Passkey signs from now on — retire any locally stored key
      removeStoredNormalWalletKey();
      enqueueSnackbar(t('Wallet imported and secured with your passkey!'), { variant: 'success' });
      setStep('fund-xlm');
    } catch (err: any) {
      logger.error('[OnboardingWizard] Passkey import failed:', err);
      setImportError(
        err.message ||
          t('Failed to set up passkey signing. You can retry, or import with a password below.')
      );
    } finally {
      setIsImporting(false);
      setImportStage(null);
    }
  };

  // ── Stellar connect ───────────────────────────────────────────────────────

  const handleConnectStellarWallet = async () => {
    try {
      await connectStellarWallet();
      // Read the address from getState(): the values captured in this closure
      // are from the render BEFORE the connect, so on a fresh signup they are
      // still EMPTY (staging 2026-08-22: the activation step appeared with no
      // QR code, because the QR is keyed on this address). Same trap the kit
      // hook documents for its own connect path.
      const addr =
        usePersistStore.getState().wallet.address ||
        useStellarWalletKitStore.getState().publicKey ||
        '';
      if (addr) setWizardWalletAddress(addr);

      if (step === 'linked-accounts') {
        enqueueSnackbar(t('Wallet connected!'), { variant: 'success' });
        handleClose();
        return;
      }

      // Only send the user to "fund with XLM" when the wallet ACTUALLY needs
      // activating. This used to be unconditional, so an already-funded
      // wallet (the normal case when someone connects Lobstr) was told to
      // activate itself. A failed probe asserts nothing (#74 rule): treat it
      // as fine and let the readiness notices raise a real problem later.
      let needsActivation = false;
      if (addr) {
        try {
          needsActivation = !(await fetchAccountStrict(addr, config));
        } catch {
          needsActivation = false;
        }
      }
      if (needsActivation) {
        setStep('fund-xlm');
      } else {
        enqueueSnackbar(t('Wallet connected!'), { variant: 'success' });
        handleClose();
      }
    } catch (err: any) {
      logger.error('[OnboardingWizard] Stellar connect failed:', err);
      enqueueSnackbar(err.message || t('Failed to connect wallet'), { variant: 'error' });
    }
  };

  // ── Fund XLM handlers ─────────────────────────────────────────────────────

  const handleCheckXlm = async () => {
    setIsCheckingXlm(true);
    try {
      await refetchAccountStatus();
    } finally {
      setIsCheckingXlm(false);
    }
  };

  const handleCoinbaseXlm = async () => {
    if (!wizardWalletAddress) return;
    const win = window.open('', '_blank');
    setIsCoinbaseLoading(true);
    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();
      if (!authSession) {
        win?.close();
        return;
      }
      const headers = await buildAuthHeaders();
      const r = await fetch('/api/coinbase/session', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ address: wizardWalletAddress, asset: 'XLM' }),
      });
      const json = await r.json();
      const { token: sessionToken, error, message: errorMessage } = json;
      if (error || !sessionToken) {
        win?.close();
        logger.error('[OnboardingWizard] Coinbase session error:', error);
        let errorMsg = errorMessage || t('Failed to start Coinbase session');
        try {
          const inner = typeof error === 'string' ? JSON.parse(error) : error;
          errorMsg = inner?.message || inner?.error_description || inner?.error || String(error);
        } catch {
          errorMsg = String(errorMessage || error || errorMsg);
        }
        enqueueSnackbar(errorMsg, { variant: 'error' });
        return;
      }
      const url = createCoinbasePayOnrampURL({
        amountUsd: '5',
        assetSymbol: 'XLM',
        sessionToken,
        fiat: 'USD',
        sandbox: isTestnet(),
        path: 'buy/select-asset',
        redirectUrl: `${window.location.origin}${paths.savings}?setup=continue`,
      });
      if (win) {
        win.opener = null;
        win.location.href = url;
      }
    } catch (err: any) {
      win?.close();
      logger.error('[OnboardingWizard] Coinbase error:', err);
      enqueueSnackbar(err?.message || t('Failed to open Coinbase'), { variant: 'error' });
    } finally {
      setIsCoinbaseLoading(false);
    }
  };

  // ── Trustline handler ─────────────────────────────────────────────────────

  const handleAddTrustline = async () => {
    if (!savingsUsdcIssuer) {
      setTrustlineError(t('USDC issuer not configured'));
      return;
    }
    setTrustlineError(null);
    try {
      await addTrustLine('USDC', savingsUsdcIssuer);
      enqueueSnackbar(t('USDC trustline added!'), { variant: 'success' });
      await refetchAccountStatus();
    } catch (err: any) {
      setTrustlineError(err.message || t('Failed to add trustline'));
    }
  };

  // ── Shared styles ─────────────────────────────────────────────────────────

  const btnPrimary = {
    borderRadius: '12px',
    py: 1.5,
    fontWeight: 600,
    fontSize: '0.9375rem',
    bgcolor: 'text.primary',
    color: 'background.paper',
    '&:hover': { bgcolor: 'text.secondary' },
    '&.Mui-disabled': {
      bgcolor: alpha(theme.palette.text.primary, 0.12),
      color: alpha(theme.palette.text.primary, 0.4),
    },
  };

  const btnOutlined = {
    borderRadius: '12px',
    py: 1.5,
    fontWeight: 500,
    fontSize: '0.9375rem',
    borderColor: alpha(theme.palette.text.primary, 0.2),
    color: 'text.primary',
    '&:hover': { borderColor: 'text.primary', bgcolor: alpha(theme.palette.text.primary, 0.04) },
  };

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderSignIn = () => (
    <Stack spacing={2.5}>
      {passwordResetSuccess && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {t('Password updated! You can now sign in with your new password.')}
        </Alert>
      )}

      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('Welcome to Normal')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("Sign in or create an account. We'll set up your wallet next.")}
        </Typography>
      </Box>

      {showTosHelper && isTosAcceptanceMissing && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          {t('Please accept the Terms of Service to continue')}
        </Alert>
      )}

      {!otpSent && !forgotPassword ? (
        <>
          <TextField
            label={t('Email')}
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setAuthError(null);
            }}
            fullWidth
            disabled={isAuthLoading}
            placeholder="you@email.com"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          {authMode === 'magic-link' ? (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tosAccepted}
                    onChange={(e) => {
                      setShowTosHelper(!e.target.checked);
                      setTosAccepted(e.target.checked);
                    }}
                    sx={{ p: 0.5, mr: 0.5 }}
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    {t('I agree to the ')}
                    <MuiLink
                      href={paths.legal.tos}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="inherit"
                      underline="always"
                    >
                      {t('Terms of Service')}
                    </MuiLink>
                    {t(' and ')}
                    <MuiLink
                      href={paths.legal.pp}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="inherit"
                      underline="always"
                    >
                      {t('Privacy Policy')}
                    </MuiLink>
                    {t('.')}
                  </Typography>
                }
                sx={{ alignItems: 'flex-start', mr: 0 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleEmailAuth}
                disabled={isAuthLoading || !email.trim() || isTosAcceptanceMissing}
                sx={btnPrimary}
              >
                {isAuthLoading ? t('Sending…') : t('Continue with email')}
              </Button>
            </>
          ) : (
            <>
              <TextField
                label={t('Password')}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError(null);
                }}
                fullWidth
                disabled={isAuthLoading}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: -1 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError(null);
                  }}
                  disabled={isAuthLoading}
                  sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                >
                  {isSignUp ? t('Already have an account?') : t('Need an account?')}
                </Button>
                {!isSignUp && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setForgotPassword(true);
                      setAuthError(null);
                    }}
                    disabled={isAuthLoading}
                    sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                  >
                    {t('Forgot password?')}
                  </Button>
                )}
              </Stack>
              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={tosAccepted}
                      onChange={(e) => {
                        setShowTosHelper(!e.target.checked);
                        setTosAccepted(e.target.checked);
                      }}
                      sx={{ p: 0.5, mr: 0.5 }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      {t('I agree to the ')}
                      <MuiLink
                        href={paths.legal.tos}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="inherit"
                        underline="always"
                      >
                        {t('Terms of Service')}
                      </MuiLink>
                      {t(' and ')}
                      <MuiLink
                        href={paths.legal.pp}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="inherit"
                        underline="always"
                      >
                        {t('Privacy Policy')}
                      </MuiLink>
                      {t('.')}
                    </Typography>
                  }
                  sx={{ alignItems: 'flex-start', mr: 0 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      sx={{ p: 0.5, mr: 0.5 }}
                    />
                  }
                  label={
                    <Typography variant="body2" color="text.secondary">
                      {t('Send me product updates (optional).')}
                    </Typography>
                  }
                  sx={{ alignItems: 'flex-start', mr: 0 }}
                />
              </Stack>
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleEmailAuth}
                disabled={
                  isAuthLoading || !email.trim() || !password.trim() || isTosAcceptanceMissing
                }
                sx={btnPrimary}
              >
                {isAuthLoading ? t('Processing…') : isSignUp ? t('Create account') : t('Sign in')}
              </Button>
            </>
          )}

          <Button
            variant="text"
            size="small"
            fullWidth
            onClick={() => setAuthMode(authMode === 'magic-link' ? 'password' : 'magic-link')}
            sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
          >
            {authMode === 'magic-link' ? t('Use password instead') : t('Use magic link instead')}
          </Button>

          <Divider sx={{ my: 0.5 }}>
            <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
              OR
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleGoogle}
            disabled={isAuthLoading || isTosAcceptanceMissing}
            startIcon={<Iconify icon="logos:google-icon" width={20} />}
            sx={btnOutlined}
          >
            {t('Continue with Google')}
          </Button>
        </>
      ) : forgotPassword ? (
        <>
          {resetEmailSent ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {t('Check your inbox at')} <strong>{email}</strong> {t('for a reset link.')}
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {t("Enter your email and we'll send a reset link.")}
              </Typography>
              <TextField
                label={t('Email')}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAuthError(null);
                }}
                fullWidth
                disabled={isAuthLoading}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleForgotPassword}
                disabled={isAuthLoading || !email.trim()}
                sx={btnPrimary}
              >
                {isAuthLoading ? t('Sending…') : t('Send reset link')}
              </Button>
            </>
          )}
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setForgotPassword(false);
              setResetEmailSent(false);
              setAuthError(null);
            }}
            sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
          >
            ← {t('Back to sign in')}
          </Button>
        </>
      ) : (
        <>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            {t('We sent a 6-digit code to')} <strong>{email}</strong>
          </Alert>
          <TextField
            label={t('6-digit code')}
            value={otpToken}
            onChange={(e) => handleOtpChange(e.target.value)}
            fullWidth
            disabled={isAuthLoading}
            slotProps={{
              htmlInput: {
                maxLength: 6,
                style: {
                  textAlign: 'center',
                  letterSpacing: '0.6em',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                },
              },
            }}
            autoFocus
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          {isAuthLoading && (
            <Stack alignItems="center">
              <CircularProgress size={24} />
            </Stack>
          )}
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setOtpSent(false);
              setOtpToken('');
              setAuthError(null);
            }}
            sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
          >
            ← {t('Change email')}
          </Button>
        </>
      )}

      {authError && (
        <Alert
          severity={authError.includes('created') ? 'success' : 'error'}
          sx={{ borderRadius: 2 }}
        >
          {authError}
        </Alert>
      )}

      <Turnstile
        ref={turnstileRef}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''}
        onSuccess={(tk) => setCaptchaToken(tk)}
      />

      <Typography variant="caption" color="text.disabled" align="center" display="block">
        {t('Protected by Cloudflare Turnstile.')}
      </Typography>
    </Stack>
  );

  const renderVerifyEmail = () => (
    <Stack spacing={2.5}>
      <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
          }}
        >
          <Iconify icon="solar:letter-bold" width={36} sx={{ color: '#fff' }} />
        </Box>
        <Box textAlign="center">
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t('Check your email')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('We sent a confirmation link to')} <strong>{verifyEmailAddress}</strong>.{' '}
            {t('Click the link to activate your account.')}
          </Typography>
        </Box>
      </Stack>

      <Alert
        severity="info"
        icon={<Iconify icon="solar:info-circle-bold" width={20} />}
        sx={{ borderRadius: 2 }}
      >
        <Typography variant="body2">
          {t('Open the link in')} <strong>{t('this browser')}</strong>
          {t(" so you're signed in automatically.")}
        </Typography>
      </Alert>

      <Stack spacing={1.5}>
        <Button
          fullWidth
          variant="outlined"
          size="large"
          onClick={handleResendConfirmation}
          disabled={isResendingConfirmation}
          startIcon={
            isResendingConfirmation ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:restart-bold" width={18} />
            )
          }
          sx={btnOutlined}
        >
          {isResendingConfirmation ? t('Resending…') : t('Resend confirmation email')}
        </Button>
        <Button
          fullWidth
          variant="text"
          size="small"
          onClick={() => {
            setStep('sign-in');
            setVerifyEmailAddress('');
            setAuthError(null);
          }}
          sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
        >
          ← {t('Back to sign in')}
        </Button>
      </Stack>
    </Stack>
  );

  // Asset-first landing for new users — the shared picker (choose an asset → buy
  // or receive; wallet provisioned lazily). "Bring your own wallet" drops to the
  // create/import screen.
  const renderGetStarted = () => (
    <GetStartedPicker onBringOwnWallet={() => setStep('choose-wallet')} />
  );

  const renderChooseWallet = () => (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('How do you want to start?')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('Your wallet, your keys. You can switch later.')}
        </Typography>
      </Box>

      <Stack spacing={1.5}>
        {/* Create Normal Wallet */}
        <Box
          onClick={() => {
            setWalletCreateError(null);
            setStep('create-wallet');
          }}
          sx={{
            p: 2,
            borderRadius: 2,
            cursor: 'pointer',
            border: `1.5px solid ${theme.palette.success.main}`,
            bgcolor: alpha(theme.palette.success.main, 0.03),
            '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.07) },
            transition: 'background 0.15s',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: alpha(theme.palette.success.main, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:shield-keyhole-bold" width={22} sx={{ color: 'success.dark' }} />
            </Box>
            <Box flex={1} minWidth={0}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {t('Create a Normal account')}
                </Typography>
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.2,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      color: 'success.dark',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.65rem',
                    }}
                  >
                    RECOMMENDED
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t(
                  'Secured by your passkey (Face ID / fingerprint). No seed phrase to write down.'
                )}
              </Typography>
            </Box>
            <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
          </Stack>
        </Box>

        {/* Import Wallet */}
        <Box
          onClick={() => setStep('import-wallet')}
          sx={{
            p: 2,
            borderRadius: 2,
            cursor: 'pointer',
            border: `1.5px solid ${theme.palette.divider}`,
            '&:hover': {
              borderColor: theme.palette.text.primary,
              bgcolor: alpha(theme.palette.text.primary, 0.02),
            },
            transition: 'all 0.15s',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: alpha(theme.palette.text.primary, 0.06),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:key-bold" width={20} sx={{ color: 'text.primary' }} />
            </Box>
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" fontWeight={700}>
                {t('Import an existing wallet')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Bring in a wallet with your 24-word phrase or private key.')}
              </Typography>
            </Box>
            <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
          </Stack>
        </Box>

        {/* Connect Crypto Wallet */}
        <Box
          onClick={handleConnectStellarWallet}
          sx={{
            p: 2,
            borderRadius: 2,
            cursor: 'pointer',
            border: `1.5px solid ${alpha(theme.palette.warning.main, 0.6)}`,
            bgcolor: alpha(theme.palette.warning.main, 0.02),
            '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
            transition: 'background 0.15s',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:card-bold" width={20} sx={{ color: 'warning.dark' }} />
            </Box>
            <Box flex={1} minWidth={0}>
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {t('Connect a crypto wallet')}
                </Typography>
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.2,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.warning.main, 0.12),
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      color: 'warning.dark',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      fontSize: '0.65rem',
                    }}
                  >
                    ADVANCED
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {t('Freighter, Lobstr, Ledger, and WalletConnect.')}
              </Typography>
            </Box>
            <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
          </Stack>
        </Box>
      </Stack>

      <Button
        variant="text"
        size="small"
        fullWidth
        onClick={handleClose}
        sx={{ color: 'text.disabled', fontWeight: 500 }}
      >
        {t('Skip for now — set up a wallet later')}
      </Button>
    </Stack>
  );

  const renderCreateWallet = () => (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('Create your wallet')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'Your wallet is secured by your passkey — Face ID, fingerprint, or device PIN. Nothing to write down, nothing to lose.'
          )}
        </Typography>
      </Box>

      {walletCreateError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {walletCreateError}
        </Alert>
      )}

      <Stack spacing={1.25}>
        {[
          {
            icon: 'solar:shield-keyhole-bold',
            text: t('Keys live in secure hardware — never on this device or our servers'),
          },
          {
            icon: 'solar:smartphone-bold',
            text: t('Approve transactions with one tap using your passkey'),
          },
          {
            icon: 'solar:key-bold',
            text: t('Your recovery phrase can be exported any time if you ever want it'),
          },
        ].map((item) => (
          <Stack key={item.icon} direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '9px',
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify icon={item.icon} width={18} sx={{ color: 'success.dark' }} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ pt: 0.75 }}>
              {item.text}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Stack direction="row" justifyContent="space-between" spacing={1.5} sx={{ pt: 1 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={isCreatingWallet}
          sx={{ ...btnOutlined, px: 3 }}
        >
          {t('Back')}
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateTurnkeyWallet}
          disabled={isCreatingWallet}
          startIcon={
            isCreatingWallet ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:shield-keyhole-bold" width={18} />
            )
          }
          sx={{ ...btnPrimary, flex: 1 }}
        >
          {isCreatingWallet ? t('Creating…') : t('Create with passkey')}
        </Button>
      </Stack>
    </Stack>
  );

  const renderImportWallet = () => (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('Import an existing wallet')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('Enter your recovery phrase or private key.')}
        </Typography>
      </Box>

      {importError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {importError}
        </Alert>
      )}

      <Tabs
        value={importType}
        onChange={(_, v) => {
          setImportType(v);
          setImportMnemonic('');
          setImportPrivateKey('');
          setImportMnemonicError('');
          setImportPrivateKeyError('');
          setImportError(null);
        }}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('Private key')} value="private-key" />
        <Tab label={t('Recovery phrase')} value="mnemonic" />
      </Tabs>

      {importType === 'mnemonic' ? (
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder={t('word1 word2 word3…')}
          value={importMnemonic}
          onChange={(e) => {
            setImportMnemonic(e.target.value);
            setImportMnemonicError('');
            setImportError(null);
          }}
          error={!!importMnemonicError}
          helperText={importMnemonicError || t('Enter your 12 or 24 word recovery phrase')}
          disabled={isImporting}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      ) : (
        <TextField
          multiline
          rows={3}
          fullWidth
          placeholder="SXXXXX…"
          value={importPrivateKey}
          onChange={(e) => {
            setImportPrivateKey(e.target.value);
            setImportPrivateKeyError('');
            setImportError(null);
          }}
          error={!!importPrivateKeyError}
          helperText={
            importPrivateKeyError || t('Your private key starts with S and is 56 characters')
          }
          disabled={isImporting}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      )}

      <Stack direction="row" justifyContent="space-between" spacing={1.5}>
        <Button
          variant="outlined"
          onClick={handleBack}
          disabled={isImporting}
          sx={{ ...btnOutlined, px: 3 }}
        >
          {t('Back')}
        </Button>
        <Button
          variant="contained"
          sx={{ ...btnPrimary, flex: 1 }}
          onClick={importType === 'mnemonic' ? handleImportWithPasskey : handleImport}
          disabled={
            isImporting ||
            (importType === 'mnemonic' ? !importMnemonic.trim() : !importPrivateKey.trim())
          }
          startIcon={
            isImporting ? (
              <CircularProgress size={16} color="inherit" />
            ) : importType === 'mnemonic' ? (
              <Iconify icon="solar:shield-keyhole-bold" width={18} />
            ) : null
          }
        >
          {isImporting
            ? (importStage ?? t('Importing…'))
            : importType === 'mnemonic'
              ? t('Import & secure with passkey')
              : t('Import wallet')}
        </Button>
      </Stack>

      {importType === 'mnemonic' && (
        <>
          <Typography variant="caption" color="text.disabled" align="center" display="block">
            {t(
              'Your phrase is encrypted on this device and secured by your passkey — no password needed to sign.'
            )}
          </Typography>
          <Button
            variant="text"
            size="small"
            fullWidth
            onClick={handleImport}
            disabled={isImporting || !importMnemonic.trim()}
            sx={{ color: 'text.secondary', fontWeight: 500 }}
          >
            {t('Import with a password instead (stored on this device)')}
          </Button>
        </>
      )}
    </Stack>
  );

  const renderFundXlm = () => {
    // Returning user: hide the UI while we check if account is already funded.
    // The auto-advance effect will close the wizard or move to add-trustline.
    if (isReturningUser && (isCheckingAccount || accountExists)) {
      return (
        <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            {t('Checking your account…')}
          </Typography>
        </Stack>
      );
    }

    return (
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {t('Send 1+ XLM to activate')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('Stellar accounts need a small XLM balance to exist on-chain. One-time setup.')}
          </Typography>
        </Box>

        {/* QR + address in same bordered box */}
        <Box
          sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}
        >
          <Stack alignItems="center" sx={{ p: 2.5, bgcolor: alpha(theme.palette.grey[500], 0.04) }}>
            <Box
              sx={{
                width: 160,
                height: 160,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isGeneratingQR ? (
                <CircularProgress size={36} />
              ) : qrCodeUrl ? (
                <Box
                  component="img"
                  src={qrCodeUrl}
                  alt="Wallet QR"
                  sx={{ width: 160, height: 160 }}
                />
              ) : null}
            </Box>
          </Stack>
          <Divider />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.25 }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mr: 1,
              }}
            >
              {wizardWalletAddress ? format.fTruncate(wizardWalletAddress, 28) : ''}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="solar:copy-outline" width={14} />}
              onClick={async () => {
                const ok = await copy(wizardWalletAddress);
                if (ok) enqueueSnackbar(t('Address copied'), { variant: 'success' });
                else enqueueSnackbar(t('Copy failed — please copy manually'), { variant: 'error' });
              }}
              sx={{
                borderRadius: 1.5,
                flexShrink: 0,
                fontSize: '0.8rem',
                py: 0.5,
                px: 1.25,
                borderColor: alpha(theme.palette.text.primary, 0.2),
              }}
            >
              {t('Copy')}
            </Button>
          </Stack>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={isCoinbaseLoading}
          onClick={handleCoinbaseXlm}
          startIcon={
            isCoinbaseLoading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <Box
                component="img"
                src="https://avatars.githubusercontent.com/u/1885080?s=200&v=4"
                sx={{ width: 18, height: 18, borderRadius: '50%' }}
              />
            )
          }
          sx={btnPrimary}
        >
          {isCoinbaseLoading ? t('Opening Coinbase…') : t('Buy XLM with card — via Coinbase')}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          size="large"
          disabled={isCheckingXlm || isCheckingAccount}
          onClick={handleCheckXlm}
          startIcon={isCheckingXlm || isCheckingAccount ? <CircularProgress size={16} /> : null}
          sx={btnOutlined}
        >
          {isCheckingXlm || isCheckingAccount ? t('Checking…') : t('I already sent XLM')}
        </Button>

        <Typography variant="caption" color="text.disabled" align="center" display="block">
          {t('Send only XLM on the Stellar network. Other assets may be lost.')}
        </Typography>
      </Stack>
    );
  };

  const renderAddTrustline = () => (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('Add the USDC trustline')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'A one-time on-chain step that lets your wallet hold USDC. Reserves a small XLM amount.'
          )}
        </Typography>
      </Box>

      {/* Info table */}
      <Box
        sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}
      >
        {[
          { label: t('Asset'), value: 'USDC' },
          {
            label: t('Issuer'),
            value: savingsUsdcIssuer ? format.fTruncate(savingsUsdcIssuer, 14) : '—',
          },
          { label: t('Network fee'), value: '~0.00001 XLM' },
          { label: t('Reserved'), value: '0.5 XLM' },
        ].map(({ label, value }, idx, arr) => (
          <Stack
            key={label}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              px: 2.5,
              py: 1.5,
              borderBottom: idx < arr.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {value}
            </Typography>
          </Stack>
        ))}
      </Box>

      {trustlineError && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {trustlineError}
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" spacing={1.5}>
        <Button
          variant="outlined"
          onClick={() => setStep('fund-xlm')}
          sx={{ ...btnOutlined, px: 3 }}
        >
          {t('Back')}
        </Button>
        <Button
          variant="contained"
          sx={{ ...btnPrimary, flex: 1 }}
          onClick={handleAddTrustline}
          disabled={isAddingTrustline}
          startIcon={isAddingTrustline ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {isAddingTrustline ? t('Adding…') : t('Add USDC trustline')}
        </Button>
      </Stack>
    </Stack>
  );

  const renderAllSet = () => (
    <Stack spacing={3} alignItems="center" sx={{ py: 1 }}>
      {/* Gradient circle with checkmark */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(129, 140, 248, 0.4)',
        }}
      >
        <Iconify icon="solar:check-circle-bold" width={40} sx={{ color: '#fff' }} />
      </Box>

      <Box textAlign="center">
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t("You're all set.")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(
            'Your Normal wallet is live and ready to earn. Make your first USDC deposit and start collecting yield.'
          )}
        </Typography>
      </Box>

      <Stack spacing={1.5} sx={{ width: '100%', pt: 1 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => {
            handleClose();
            window.location.href = paths.savings;
          }}
          sx={btnPrimary}
        >
          {t('Deposit USDC →')}
        </Button>
        <Button fullWidth variant="outlined" size="large" onClick={handleClose} sx={btnOutlined}>
          {t('Explore my wallet')}
        </Button>
      </Stack>
    </Stack>
  );

  const handleUseWallet = async (walletAddress: string) => {
    setConnectingWalletAddr(walletAddress);
    try {
      // No local key and not Turnkey-managed → the user must re-import
      if (!hasStoredNormalWalletKey() && !(await isTurnkeyStellarAddress(walletAddress))) {
        setWizardWalletAddress(walletAddress);
        setStep('import-wallet');
        return;
      }
      await connectWalletWithoutKeypair(walletAddress);
      enqueueSnackbar(t('Wallet switched'), { variant: 'success' });
      onClose();
    } catch (err: any) {
      enqueueSnackbar(err?.message || t('Failed to switch wallet'), { variant: 'error' });
    } finally {
      setConnectingWalletAddr(null);
    }
  };

  const handleSaveLinkedWalletName = async (walletAddress: string) => {
    setIsSavingLinkedWalletName(true);
    try {
      await updateWalletName(walletAddress, linkedWalletEditName);
      setLinkedWalletsForStep((prev) =>
        prev.map((w) =>
          w.walletAddress === walletAddress ? { ...w, walletName: linkedWalletEditName || null } : w
        )
      );
      setLinkedWalletEditingAddr(null);
      setLinkedWalletEditName('');
      enqueueSnackbar(t('Account name saved'), { variant: 'success' });
    } catch (err: any) {
      enqueueSnackbar(err?.message || t('Failed to save account name'), { variant: 'error' });
    } finally {
      setIsSavingLinkedWalletName(false);
    }
  };

  const renderLinkedAccounts = () => {
    const noKeyReturning = isReturningUser && !hasStoredNormalWalletKey();

    return (
      <Stack spacing={2.5}>
        {!isReturningUser ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #60a5fa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(129, 140, 248, 0.4)',
              }}
            >
              <Iconify icon="solar:check-circle-bold" width={36} sx={{ color: '#fff' }} />
            </Box>
            <Box textAlign="center">
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {t("You're all set!")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('Your wallet is live and ready to earn. Your linked account is shown below.')}
              </Typography>
            </Box>
          </Stack>
        ) : (
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {t('Linked accounts')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {noKeyReturning
                ? t('Select an account to reconnect your wallet key.')
                : t('Your wallet accounts linked to this profile.')}
            </Typography>
          </Box>
        )}

        {/* One-click entry with the passkey-secured Turnkey wallet */}
        {!isLoadingLinkedWallets && isReturningUser && turnkeyStellarAddress && (
          <Box
            onClick={() => handleUseWallet(turnkeyStellarAddress)}
            sx={{
              p: 2,
              borderRadius: 2,
              cursor: 'pointer',
              border: `1.5px solid ${theme.palette.success.main}`,
              bgcolor: alpha(theme.palette.success.main, 0.04),
              '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.08) },
              transition: 'background 0.15s',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {connectingWalletAddr === turnkeyStellarAddress ? (
                  <CircularProgress size={18} sx={{ color: 'success.dark' }} />
                ) : (
                  <Iconify
                    icon="solar:shield-keyhole-bold"
                    width={22}
                    sx={{ color: 'success.dark' }}
                  />
                )}
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {t('Continue with Turnkey')}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: 'monospace' }}
                >
                  {format.fTruncate(turnkeyStellarAddress, 20)}
                </Typography>
              </Box>
              <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
            </Stack>
          </Box>
        )}

        {isLoadingLinkedWallets ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {linkedWalletsForStep.map((wallet) => (
              <Box
                key={wallet.id}
                sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, p: 2 }}
              >
                {linkedWalletEditingAddr === wallet.walletAddress ? (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={linkedWalletEditName}
                      onChange={(e) => setLinkedWalletEditName(e.target.value)}
                      placeholder={t('Account name')}
                      slotProps={{ htmlInput: { maxLength: 50 } }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveLinkedWalletName(wallet.walletAddress);
                        if (e.key === 'Escape') {
                          setLinkedWalletEditingAddr(null);
                          setLinkedWalletEditName('');
                        }
                      }}
                    />
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleSaveLinkedWalletName(wallet.walletAddress)}
                      disabled={isSavingLinkedWalletName}
                    >
                      {isSavingLinkedWalletName ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon="solar:check-circle-bold" width={20} />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setLinkedWalletEditingAddr(null);
                        setLinkedWalletEditName('');
                      }}
                      disabled={isSavingLinkedWalletName}
                    >
                      <Iconify icon="solar:close-circle-bold" width={20} />
                    </IconButton>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                      {wallet.walletName || t('Unnamed account')}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setLinkedWalletEditingAddr(wallet.walletAddress);
                        setLinkedWalletEditName(wallet.walletName || '');
                      }}
                    >
                      <Iconify icon="solar:pen-bold" width={16} />
                    </IconButton>
                  </Stack>
                )}

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: 'monospace' }}
                >
                  {format.fTruncate(wallet.walletAddress, 28)}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                  {wallet.walletAddress === persist.wallet.address ? (
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.success.main, 0.12),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                      }}
                    >
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        {t('Active')}
                      </Typography>
                    </Box>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={connectingWalletAddr === wallet.walletAddress}
                      onClick={() => handleUseWallet(wallet.walletAddress)}
                      sx={{ borderRadius: 1.5, fontSize: '0.8rem' }}
                    >
                      {connectingWalletAddr === wallet.walletAddress ? (
                        <CircularProgress size={14} color="inherit" sx={{ mr: 0.5 }} />
                      ) : null}
                      {noKeyReturning ? t('Reconnect') : t('Use wallet')}
                    </Button>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        <Divider>
          <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
            {t('Add another wallet')}
          </Typography>
        </Divider>

        <Stack spacing={1}>
          <Box
            onClick={() => setStep('import-wallet')}
            sx={{
              p: 1.5,
              borderRadius: 2,
              cursor: 'pointer',
              border: `1px solid ${theme.palette.divider}`,
              '&:hover': {
                borderColor: theme.palette.text.primary,
                bgcolor: alpha(theme.palette.text.primary, 0.02),
              },
              transition: 'all 0.15s',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  bgcolor: alpha(theme.palette.text.primary, 0.06),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Iconify icon="solar:key-bold" width={18} sx={{ color: 'text.primary' }} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={600}>
                  {t('Import a Normal wallet')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('24-word phrase or private key')}
                </Typography>
              </Box>
              <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
            </Stack>
          </Box>

          <Box
            onClick={handleConnectStellarWallet}
            sx={{
              p: 1.5,
              borderRadius: 2,
              cursor: 'pointer',
              border: `1.5px solid ${alpha(theme.palette.warning.main, 0.5)}`,
              bgcolor: alpha(theme.palette.warning.main, 0.02),
              '&:hover': { bgcolor: alpha(theme.palette.warning.main, 0.06) },
              transition: 'background 0.15s',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Iconify icon="solar:card-bold" width={18} sx={{ color: 'warning.dark' }} />
              </Box>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" fontWeight={600}>
                  {t('Connect a crypto wallet')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('Freighter, Lobstr, Ledger, and WalletConnect')}
                </Typography>
              </Box>
              <Iconify icon="mingcute:right-line" sx={{ color: 'text.disabled', flexShrink: 0 }} />
            </Stack>
          </Box>
        </Stack>

        <Stack spacing={1.5}>
          {!isReturningUser && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={() => {
                handleClose();
                window.location.href = paths.savings;
              }}
              sx={btnPrimary}
            >
              {t('Deposit USDC →')}
            </Button>
          )}
          <Button fullWidth variant="outlined" size="large" onClick={handleClose} sx={btnOutlined}>
            {!isReturningUser ? t('Explore my wallet') : t('Done')}
          </Button>
        </Stack>
      </Stack>
    );
  };

  const renderContent = () => {
    // Already have a session — handleAfterAuth is running. Show a spinner
    // instead of flashing the sign-in form while we wait for the redirect.
    if (step === 'sign-in' && (session || authHookLoading)) {
      return (
        <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" color="text.secondary">
            {t('Loading your account…')}
          </Typography>
        </Stack>
      );
    }

    switch (step) {
      case 'sign-in':
        return renderSignIn();
      case 'verify-email':
        return renderVerifyEmail();
      case 'get-started':
        return renderGetStarted();
      case 'choose-wallet':
        return renderChooseWallet();
      case 'create-wallet':
        return renderCreateWallet();
      case 'import-wallet':
        return renderImportWallet();
      case 'fund-xlm':
        return renderFundXlm();
      case 'add-trustline':
        return renderAddTrustline();
      case 'all-set':
        return renderAllSet();
      case 'linked-accounts':
        return renderLinkedAccounts();
      default:
        return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: 480,
            maxWidth: '95vw',
            borderRadius: '20px',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      {/* Step indicator header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2.5,
          pt: 2.5,
          pb: 0,
        }}
      >
        {/* Dots */}
        <Stack direction="row" spacing={0.6} alignItems="center" sx={{ flexShrink: 0 }}>
          {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: i <= dotIndex ? 'text.primary' : alpha(theme.palette.text.primary, 0.15),
                transition: 'background-color 0.3s',
              }}
            />
          ))}
        </Stack>

        {/* Step label */}
        <Typography
          variant="caption"
          sx={{
            flex: 1,
            fontWeight: 600,
            letterSpacing: 0.3,
            color: 'text.secondary',
            fontSize: '0.7rem',
          }}
        >
          {t('{{step}}/6 — {{label}}', { step: stepNumber, label: STEP_LABEL[step] })}
        </Typography>

        {/* Back arrow */}
        <Tooltip title={canGoBack ? t('Go back') : ''}>
          <span>
            <IconButton
              size="small"
              onClick={handleBack}
              disabled={!canGoBack}
              sx={{
                color: 'text.secondary',
                '&.Mui-disabled': { color: alpha(theme.palette.text.primary, 0.2) },
              }}
            >
              <Iconify icon="mingcute:left-line" width={16} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Forward arrow (disabled — navigation via buttons) */}
        <IconButton size="small" disabled sx={{ color: alpha(theme.palette.text.primary, 0.2) }}>
          <Iconify icon="mingcute:right-line" width={16} />
        </IconButton>

        {/* Close */}
        <ModalCloseButton onClick={handleClose} sx={{ ml: 0.5 }} />
      </Box>

      <DialogContent sx={{ px: 3, pt: 2.5, pb: 3 }}>{renderContent()}</DialogContent>
    </Dialog>
  );
}
