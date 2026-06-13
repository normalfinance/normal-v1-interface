'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useBoolean } from 'minimal-shared/hooks';
import { cdn, logger } from '@normalfinance/utils';
import { useUserActivity, useStellarConfig } from '@/hooks';
import { useBtcPortfolio } from '@/hooks/use-btc-portfolio';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLinkedWallets } from '@/services/linked-wallets';
import { useTurnkeyWallet } from '@/hooks/use-turnkey-wallet';
import { getSavingsUsdcIssuer } from '@/utils/token-selectors';
import { useSupabaseAuth } from '@/providers/SupabaseAuthProvider';
import { useAccountStatus } from '@/hooks/stellar/use-account-status';
import {
  useNormalWallet,
} from '@/hooks/stellar/use-normal-wallet';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useDefindexSavings } from '@/hooks/stellar/use-defindex-savings';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';
import { useAppStore, usePersistStore, useNetworkStore } from '@normalfinance/state';
import { clearLoginIntent, consumeLoginIntent, rememberLoginIntent } from '@/lib/loginIntent';

import { alpha, useTheme } from '@mui/material/styles';
import AddOutlined from '@mui/icons-material/AddOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SyncOutlined from '@mui/icons-material/SyncOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined';
import {
  Box,
  Stack,
  Avatar,
  Button,
  Drawer,
  Tooltip,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';

import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import NormalWalletCreate from '@/components/_common/normal-wallet-create';
import NormalWalletImport from '@/components/_common/normal-wallet-import';
import WalletSelectionModal from '@/components/_common/wallet-selection-modal';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import OnboardingWizard, { type WizardStep } from '@/components/_common/onboarding-wizard';

import { AccountButton } from './account-button';

function WalletConnected({ address, drawerOpen, bitcoinAddress }: { address: string; drawerOpen: boolean; bitcoinAddress: string | null }) {
  const { setGlobalIsLoading } = useAppStore();

  const {
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();
  const network = useNetworkStore((s) => s.network);
  const [tokensFetching, setTokensFetching] = useState(true);

  const { recentActivity } = useUserActivity(address, bitcoinAddress);
  const {
    userPosition,
    fetching: savingsFetching,
    refreshVaultInfo,
    refreshUserPosition,
  } = useDefindexSavings();

  // Effect hook to fetch all tokens when the component mounts, address changes, or network toggles
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      if (!address) return;

      setTokensFetching(true);
      setGlobalIsLoading(true);
      try {
        await getAllTokens(true);
      } catch (e) {
        logger.error(e);
      } finally {
        setGlobalIsLoading(false);
        setTokensFetching(false);
      }
    };

    const timer = setTimeout(() => {
      refreshTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [address, getAllTokens, network, setGlobalIsLoading]);

  // Refresh both vault info and user position every time the drawer opens
  useEffect(() => {
    if (drawerOpen && address) {
      refreshVaultInfo();
      refreshUserPosition();
    }
  }, [drawerOpen, address, refreshVaultInfo, refreshUserPosition]);  

  const { btcToken } = useBtcPortfolio(true);

  const allTokens = useMemo(
    () => (btcToken ? [...tokens, btcToken] : tokens),
    [tokens, btcToken]
  );

  const assetsBalance = useMemo(
    () => allTokens.reduce((acc, tkn) => acc.plus(BigNumber(tkn.balance).multipliedBy(tkn.price)), BigNumber(0)),
    [allTokens]
  );

  const savingsValue = Math.max(parseFloat(userPosition?.currentValue || '0'), 0);
  const savingsLoaded = userPosition !== null;

  if (!address) {
    return null;
  }

  return (
    <Box
      data-testid="wallet-connected"
      sx={{
        pb: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <ConnectedWallet
        address={address}
        balance={assetsBalance.toNumber()}
        savingsValue={savingsValue}
        savingsFetching={savingsFetching && !savingsLoaded}
        tokensFetching={tokensFetching}
        percentageChange={0}
        tokens={allTokens}
        activity={recentActivity}
        bitcoinAddress={bitcoinAddress}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Main Drawer component                                              */
/* ------------------------------------------------------------------ */
export type AccountDrawerProps = IconButtonProps;

export function AccountDrawer(props: AccountDrawerProps) {
  /*  stores ------------------------------------------------------ */
  const persist = usePersistStore();
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const config = useStellarConfig();
  const savingsUsdcIssuer = getSavingsUsdcIssuer(config);
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const {
    connectWallet: connectNormalWallet,
    publicKey: normalPublicKey,
    isConnected: isNormalConnected,
    disconnectWallet: disconnectNormalWallet,
  } = useNormalWallet();
  const { session, isLoading: authLoading, signOut } = useSupabaseAuth();
  const { enqueueSnackbar } = useSnackbar();

  /*  drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  const {
    value: isDisconnecting,
    onTrue: startDisconnecting,
    onFalse: stopDisconnecting,
  } = useBoolean();

  const {
    value: isNavigatingToSettings,
    onTrue: startNavigatingToSettings,
    onFalse: stopNavigatingToSettings,
  } = useBoolean();

  const avatarURL = cdn('logo/logo-single.svg');

  /* ↓ derived state ---------------------------------------------- */
  const connectedAddress = persist.wallet.address || publicKey || normalPublicKey;
  const isWalletConnected = !!connectedAddress || isConnected || isNormalConnected;

  const { addresses: turnkeyAddresses } = useTurnkeyWallet(open && !!session);
  const bitcoinAddress = turnkeyAddresses?.bitcoinAddress ?? null;

  // Only fetch account status while the drawer is open and a wallet is connected
  const { isLoading: isCheckingSetup, accountExists, hasUsdcTrustline } = useAccountStatus(
    open && connectedAddress ? connectedAddress : '',
    { assetIssuer: savingsUsdcIssuer }
  );
  const isSetupIncomplete =
    !!connectedAddress &&
    !isCheckingSetup &&
    (!accountExists || !!(savingsUsdcIssuer && !hasUsdcTrustline));

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<WizardStep | undefined>(undefined);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [showCreateNormalWallet, setShowCreateNormalWallet] = useState(false);
  const [showImportNormalWallet, setShowImportNormalWallet] = useState(false);
  const [showImportOptionInSelection, setShowImportOptionInSelection] = useState(false);
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  const handleDisconnect = async () => {
    if (isDisconnecting) {
      return;
    }

    try {
      startDisconnecting();

      const walletTypeBeforeDisconnect = persist.wallet.walletType;

      await signOut();

      if (walletTypeBeforeDisconnect === 'normal-wallet') {
        await disconnectNormalWallet();
      } else {
        await disconnectWallet();
      }

      persist.disconnectWallet();

      const WALLET_SELECTION_SEEN_KEY = 'wallet-selection-modal-seen';
      localStorage.removeItem(WALLET_SELECTION_SEEN_KEY);

      enqueueSnackbar('Logged out successfully', { variant: 'success' });

      window.location.reload();
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);

      enqueueSnackbar('Error disconnecting wallet', { variant: 'error' });
    } finally {
      stopDisconnecting();
      onClose();
    }
  };

  const userMetadata = session?.user?.user_metadata as
    | { picture?: string; avatar_url?: string; name?: string }
    | undefined;
  const userEmail = session?.user?.email ?? '';
  const userAvatar = userMetadata?.picture || userMetadata?.avatar_url || avatarURL;
  const displayName = userMetadata?.name || userEmail || ' ';

  const handleConnectStellarWallet = useCallback(async () => {
    try {
      await connectWallet();
      onClose();
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  }, [connectWallet, onClose]);

  const handlePostAuthFlow = useCallback(async () => {
    if (!session) {
      return;
    }

    // Clear any stale local wallet state if the DB record was removed
    if (normalPublicKey && isNormalConnected) {
      const linkedWallets = await getLinkedWallets();
      const isStillLinked = linkedWallets.some((w) => w.walletAddress === normalPublicKey);
      if (!isStillLinked) {
        await disconnectNormalWallet();
        persist.disconnectWallet();
      }
    }

    // Open the wizard so the user can pick their wallet
    setWizardInitialStep('linked-accounts');
    setShowLoginModal(true);
  }, [
    session,
    normalPublicKey,
    isNormalConnected,
    disconnectNormalWallet,
    persist,
  ]);

  /** Handle Normal wallet creation success */
  const handleNormalWalletCreated = async () => {
    setShowCreateNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
    onClose();
  };

  const handleNormalWalletImported = async () => {
    setShowImportNormalWallet(false);
    if (normalPublicKey) {
      await connectNormalWallet();
    }
    onClose();
  };

  const handleMainButtonClick = () => {
    if (session) {
      onOpen(); // Open drawer to show account info
    } else {
      handleConnectClick(); // Show login modal
    }
  };

  const handleConnectClick = async () => {
    if (!session) {
      rememberLoginIntent();
      setShowLoginModal(true);
      return;
    }

    await handlePostAuthFlow();
  };

  const hasHandledAuthRef = useRef(false);
  // Tracks showLoginModal without adding it as an effect dependency (avoids
  // the effect re-firing and immediately closing the modal on open).
  const showLoginModalRef = useRef(showLoginModal);
  useEffect(() => { showLoginModalRef.current = showLoginModal; }, [showLoginModal]);

  useEffect(() => {
    const passwordResetParam = searchParams.get('passwordResetSuccess');
    const emailParam = searchParams.get('email');
    if (passwordResetParam === 'true') {
      setPasswordResetSuccess(true);
      if (emailParam) {
        setResetEmail(decodeURIComponent(emailParam));
      }
      setShowLoginModal(true);
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get('setup') === 'continue') {
      setWizardInitialStep('fund-xlm');
      setShowLoginModal(true);
      router.replace(paths.savings, { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const handler = () => {
      if (!session) {
        rememberLoginIntent();
        setShowLoginModal(true);
      }
    };
    window.addEventListener('nf:open-login', handler);
    return () => window.removeEventListener('nf:open-login', handler);
  }, [session]);

  // Opens the wizard regardless of session — used when a logged-in user
  // starts an action that needs a wallet they don't have yet (lazy setup).
  useEffect(() => {
    const handler = () => setShowLoginModal(true);
    window.addEventListener('nf:open-wallet-setup', handler);
    return () => window.removeEventListener('nf:open-wallet-setup', handler);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      if (hasHandledAuthRef.current) {
        clearLoginIntent();
        hasHandledAuthRef.current = false;
      }
      setIsAutoConnecting(false);
      // Don't close the wizard if it's currently open handling its own flow
      if (!passwordResetSuccess && !showLoginModalRef.current) {
        setShowLoginModal(false);
      }
      return;
    }

    // Check loginIntent BEFORE the isWalletConnected guard.
    // If the user explicitly clicked Login, always open the wizard so they
    // can pick a wallet — even if the old wallet was auto-restored from
    // localStorage after an expired session.
    const hadIntent = consumeLoginIntent();
    if (hadIntent && !hasHandledAuthRef.current) {
      hasHandledAuthRef.current = true;
      if (!showLoginModalRef.current) {
        setShowLoginModal(true);
      }
      return;
    }

    if (isWalletConnected) {
      setIsAutoConnecting(false);
      return;
    }
  }, [authLoading, session, passwordResetSuccess, isWalletConnected]);

  return (
    <>
      {session ? (
        <AccountButton
          data-testid="account-button"
          onClick={handleMainButtonClick}
          photoURL={userAvatar}
          displayName={displayName}
          {...props}
        />
      ) : (
        <Button
          variant="contained"
          onClick={handleMainButtonClick}
          data-testid="connect-wallet-button"
          sx={{
            bgcolor: '#0A0A0F',
            color: '#fff',
            borderRadius: '999px',
            textTransform: 'none',
            fontWeight: 500,
            px: '12px',
            py: '6px',
            fontSize: '14px',
            minWidth: 'unset',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#1a1a2e', boxShadow: 'none' },
          }}
        >
          {t('Login')}
        </Button>
      )}
      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            bgcolor: '#ffffff',
            backgroundImage: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* close (X) + action icons + logout — sticky header, never scrolls */}
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 1.5,
          }}
        >
          <Tooltip title="Close">
            <IconButton
              onClick={onClose}
              data-testid="close-drawer-button"
              sx={{ color: '#6B6B76', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' } }}
            >
              <CloseOutlined sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {session && (
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 'auto', mr: 1 }}>
              <Tooltip title={isNavigatingToSettings ? t('Loading...') : t('Settings')}>
                <span>
                  <IconButton
                    size="small"
                    disabled={isNavigatingToSettings}
                    onClick={() => {
                      startNavigatingToSettings();
                      router.push(paths.settings);
                      stopNavigatingToSettings();
                      onClose();
                    }}
                    sx={{ color: '#6B6B76', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' } }}
                  >
                    {isNavigatingToSettings
                      ? <CircularProgress size={18} color="inherit" />
                      : <SettingsOutlined sx={{ fontSize: 20 }} />}
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title={t('Create New Account')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setWizardInitialStep('choose-wallet');
                    setShowLoginModal(true);
                    onClose();
                  }}
                  sx={{ color: '#6B6B76', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' } }}
                >
                  <AddOutlined sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('Switch Wallets')}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setWizardInitialStep('linked-accounts');
                    setShowLoginModal(true);
                    onClose();
                  }}
                  sx={{ color: '#6B6B76', borderRadius: '8px', '&:hover': { bgcolor: 'rgba(10,10,15,0.04)', color: '#0A0A0F' } }}
                >
                  <SyncOutlined sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {session && (
            <Tooltip title={isDisconnecting ? 'Logging out...' : 'Logout'}>
              <Button
                size="small"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                data-testid="logout-button"
                sx={{
                  bgcolor: '#0A0A0F',
                  color: '#fff',
                  borderRadius: '999px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '13px',
                  px: '12px',
                  py: '7px',
                  minWidth: 'unset',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: '#1a1a22', boxShadow: 'none' },
                  '&.Mui-disabled': { bgcolor: 'rgba(10,10,15,0.4)', color: 'rgba(255,255,255,0.6)' },
                }}
              >
                {t('Logout')}
              </Button>
            </Tooltip>
          )}
        </Box>
        {session && (
          <Scrollbar sx={{ flexGrow: 1 }}>
            <Stack spacing={2} sx={{ px: 2, pt: 2 }}>
              <Box sx={{ pb: '2px' }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={userAvatar}
                    alt={displayName}
                    sx={{ width: 44, height: 44, flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', color: '#0A0A0F' }}>
                      {displayName}
                    </Typography>
                    <Typography sx={{ fontSize: '13px', color: '#6B6B76', mt: '1px' }}>
                      {userEmail}
                    </Typography>
                  </Box>
                </Stack>
                {connectedAddress && (
                  <Box sx={{ mt: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Stack direction="row" alignItems="center" gap="8px">
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#14B8A6', flexShrink: 0 }} />
                      <Box sx={{ fontSize: '11px', color: '#6B6B76', width: 40, flexShrink: 0 }}>Stellar</Box>
                      <Box sx={{ fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: '11.5px', color: '#2A2A33', letterSpacing: '-0.01em', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {`${connectedAddress.slice(0, 8)}...${connectedAddress.slice(-6)}`}
                      </Box>
                      <CopyIconButton value={connectedAddress} alert="Stellar address copied" />
                    </Stack>
                    {bitcoinAddress && (
                      <Stack direction="row" alignItems="center" gap="8px">
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F7931A', flexShrink: 0 }} />
                        <Box sx={{ fontSize: '11px', color: '#6B6B76', width: 40, flexShrink: 0 }}>Bitcoin</Box>
                        <Box sx={{ fontFamily: '"Geist Mono", ui-monospace, monospace', fontSize: '11.5px', color: '#2A2A33', letterSpacing: '-0.01em', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {`${bitcoinAddress.slice(0, 8)}...${bitcoinAddress.slice(-6)}`}
                        </Box>
                        <CopyIconButton value={bitcoinAddress} alert="Bitcoin address copied" />
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>
              {isAutoConnecting ? (
                <Box
                  sx={{
                    px: 2,
                    py: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    {t('Connecting to your wallet...')}
                  </Typography>
                </Box>
              ) : isWalletConnected && connectedAddress ? (
                <>
                  {isSetupIncomplete && (
                    <Box
                      sx={{
                        mx: 1,
                        mb: 0.5,
                        p: 2,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <InfoOutlined sx={{ fontSize: 18, color: 'warning.main', flexShrink: 0, mt: 0.15 }} />
                          <Box>
                            <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
                              {!accountExists ? t('Activate your wallet') : t('Add USDC trustline')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {!accountExists
                                ? t('Send 1+ XLM to activate your wallet on Stellar.')
                                : t('One quick step to hold and earn USDC.')}
                            </Typography>
                          </Box>
                        </Stack>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            setWizardInitialStep(accountExists ? 'add-trustline' : 'fund-xlm');
                            setShowLoginModal(true);
                            onClose();
                          }}
                          sx={{
                            borderRadius: 1.5,
                            bgcolor: 'warning.main',
                            color: 'warning.contrastText',
                            '&:hover': { bgcolor: 'warning.dark' },
                            alignSelf: 'flex-start',
                            fontSize: '0.8rem',
                            px: 1.75,
                          }}
                        >
                          {t('Continue setup')}
                        </Button>
                      </Stack>
                    </Box>
                  )}
                  <WalletConnected address={connectedAddress} drawerOpen={open} bitcoinAddress={bitcoinAddress} />
                </>
              ) : (
                <Box sx={{ px: 1, py: 3 }}>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'warning.light',
                      borderRadius: 2,
                      p: 2.5,
                      bgcolor: alpha(theme.palette.warning.main, 0.04),
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1.5,
                            bgcolor: alpha(theme.palette.warning.main, 0.12),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <RocketLaunchOutlined sx={{ fontSize: 22, color: 'warning.dark' }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {t('Account Setup')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('Complete your setup to start investing')}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => {
                          if (session) {
                            setWizardInitialStep(accountExists ? 'add-trustline' : 'fund-xlm');
                            setShowLoginModal(true);
                          } else {
                            handleConnectClick();
                          }
                        }}
                        sx={{
                          bgcolor: 'warning.main',
                          color: 'warning.contrastText',
                          '&:hover': { bgcolor: 'warning.dark' },
                          borderRadius: 1.5,
                        }}
                      >
                        {t('Continue setup')}
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              )}
            </Stack>
          </Scrollbar>
        )}
      </Drawer>
      <OnboardingWizard
        open={showLoginModal}
        initialStep={wizardInitialStep}
        onClose={() => {
          setShowLoginModal(false);
          setWizardInitialStep(undefined);
          setPasswordResetSuccess(false);
          setResetEmail(null);
        }}
        passwordResetSuccess={passwordResetSuccess}
        resetEmail={resetEmail}
      />
      <WalletSelectionModal
        open={showWalletSelection}
        onClose={() => {
          setShowWalletSelection(false);
          setShowImportOptionInSelection(false);
        }}
        onCreateNormalWallet={() => setShowCreateNormalWallet(true)}
        onConnectNormalWallet={() => setShowImportNormalWallet(true)}
        onContinueToOtherWallets={handleConnectStellarWallet}
        showImportOption={showImportOptionInSelection}
      />
      <NormalWalletCreate
        open={showCreateNormalWallet}
        onClose={() => setShowCreateNormalWallet(false)}
        onSuccess={handleNormalWalletCreated}
      />
      <NormalWalletImport
        open={showImportNormalWallet}
        onClose={() => setShowImportNormalWallet(false)}
        onSuccess={handleNormalWalletImported}
        onBack={() => {
          setShowImportNormalWallet(false);
          setShowImportOptionInSelection(true);
          setShowWalletSelection(true);
        }}
      />
    </>
  );
}
