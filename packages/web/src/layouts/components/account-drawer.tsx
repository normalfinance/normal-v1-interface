'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import axios from 'axios';
import posthog from 'posthog-js';
import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { useBoolean } from 'minimal-shared/hooks';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { format, trackEvent } from '@normalfinance/utils';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { useUserActivity, useLiquidityPositions } from '@/hooks';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { isWalletVerifiedForSession } from '@/utils/wallet-proof';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Box, Stack, Button, Drawer, Tooltip, IconButton, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';
import { useProofDialogStore } from '@/stores/proof-dialog-store';
import { AccountButton } from './account-button';

/* ------------------------------------------------------------------ */
/* ① Disconnected: Show connect wallet button                         */
/* ------------------------------------------------------------------ */
function WalletDisconnected({ onConnectClick }: { onConnectClick: () => void }) {
  const { t } = useTranslate();

  const handleWalletHelp = () => {
    trackEvent('button_clicked', {
      label: 'Manage Stake',
      location: 'Insurance',
    });
    window.open(`${paths.docs}/getting-started/guides`, '_blank', 'noopener');
  };

  return (
    <Box
      sx={{
        p: 2,
        pt: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <Typography
          variant="subtitle1"
          sx={{ mb: 3 }}
          textAlign="left"
          data-testid="connect-wallet-title"
        >
          {t('Connect your wallet')}
        </Typography>
        <ZealyHighlight
          questId={ZEALY_QUEST_IDS.connectWallet}
          position={{ top: -22, right: -32 }}
        />
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
        {/* How to create a wallet? */}
        <Button
          fullWidth
          variant="soft"
          color="secondary"
          size="large"
          startIcon={<Iconify icon="eva:question-mark-circle-outline" />}
          onClick={handleWalletHelp}
        >
          {t('Need help creating a wallet?')}
        </Button>
        <ZealyHighlight
          questId={ZEALY_QUEST_IDS.createWallet}
          position={{ top: -10, right: -10 }}
        />
      </Box>

      {/* Connect wallet button - opens Stellar Wallets Kit popup */}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        size="large"
        onClick={onConnectClick}
        data-testid="connect-wallet-stellar-kit-button"
      >
        {t('Connect Wallet')}
      </Button>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* ② Connected: simple summary / logout                               */
/* ------------------------------------------------------------------ */
function WalletConnected({ address }: { address: string }) {
  const { t } = useTranslate();
  const { enqueueSnackbar } = useSnackbar();

  const { tokens, getAllTokens, setGlobalIsLoading } = useAppStore();

  const { positions } = useLiquidityPositions();

  const { loading, error, recentActivity } = useUserActivity();

  // Faucet
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetOff, setFaucetOff] = useState(false);

  const handleFaucetRequest = useCallback(async () => {
    try {
      setFaucetLoading(true);
      const { data } = await axios.get(`https://friendbot.stellar.org?addr=${address}`);

      if (data) {
        enqueueSnackbar(t('Account funded!'), { variant: 'success' });
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        if (e?.response?.data.detail === 'account already funded to starting balance') {
          setFaucetOff(true);
          enqueueSnackbar(t('Account already funded'), { variant: 'warning' });
        }
      }
    } finally {
      setFaucetLoading(false);
    }
  }, [address, enqueueSnackbar, t]);

  // Effect hook to fetch all tokens when the component mounts or address changes
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      if (!address) return; // Don't fetch tokens if no address

      console.log('[WALLET CONNECTED] Refreshing tokens for address:', address);
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
        console.log('[WALLET CONNECTED] Tokens fetched successfully');
        setGlobalIsLoading(false);
      } catch (e) {
        console.error('[WALLET CONNECTED] Error fetching tokens:', e);
      } finally {
        setGlobalIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      refreshTokens();
    }, 100);

    return () => clearTimeout(timer);
  }, [address, getAllTokens]);

  // Total balance
  const totalBalance = tokens.reduce((acc, tkn) => {
    const holdings = tkn.balance * tkn.usdValue;
    return acc + holdings;
  }, 0);

  if (!address) {
    return null;
  }

  return (
    <Box
      data-testid="wallet-connected"
      sx={{
        p: 2,
        pt: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'start',
      }}
    >
      <Stack direction="row" width={1} justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">{format.fTruncate(address, 25)}</Typography>
        <CopyIconButton value={address} alert="Address copied" />
      </Stack>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Button
          fullWidth
          variant="soft"
          color="info"
          size="large"
          startIcon={<Iconify icon="eva:droplet-fill" />}
          onClick={handleFaucetRequest}
          sx={{ my: 1 }}
          loading={faucetLoading}
          disabled={faucetOff}
        >
          {t('Get testnet XLM')}
        </Button>
        <ZealyHighlight questId={ZEALY_QUEST_IDS.receiveFaucet} position={{ right: -10 }} />
      </Box>
      <ConnectedWallet
        balance={totalBalance}
        percentageChange={0}
        tokens={tokens}
        positions={positions}
        activity={recentActivity}
      />
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Main Drawer component                                              */
/* ------------------------------------------------------------------ */
export type AccountDrawerProps = IconButtonProps;
export function AccountDrawer(props: AccountDrawerProps) {
  const persist = usePersistStore();
  const { t } = useTranslate();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();

  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();
  const {
    value: isDisconnecting,
    onTrue: startDisconnecting,
    onFalse: stopDisconnecting,
  } = useBoolean();

  const avatarURL = '/assets/icons/navbar/logo.webp';

  const connectedAddress = persist.wallet.address || publicKey;
  const isWalletConnected = !!connectedAddress || isConnected;

  const [verifiedTick, setVerifiedTick] = useState(0);
  const isVerified = isWalletVerifiedForSession(connectedAddress);

  const { ensureOpen } = useProofDialogStore();

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    try {
      startDisconnecting();
      persist.disconnectWallet();
      await disconnectWallet();
      posthog.reset();
      onClose();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      onClose();
    } finally {
      stopDisconnecting();
    }
  };

  useEffect(() => {
    if (connectedAddress) {
      posthog.identify(connectedAddress, { last_login: new Date() }, { signup_date: new Date() });
    }
  }, [connectedAddress]);

  useEffect(() => {
    const onVerified = (e: any) => {
      if (!connectedAddress || e?.detail?.address !== connectedAddress) return;
      setVerifiedTick((x) => x + 1); // re-render is enough
      // onOpen(); // ← comment this out if you don't want auto-open
    };
    window.addEventListener('nf:walletVerified', onVerified);
    return () => window.removeEventListener('nf:walletVerified', onVerified);
  }, [connectedAddress]);

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  const handleConnectClick = async () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
      return;
    }
    try {
      await connectWallet();
      const addr = persist.wallet.address || publicKey;
      if (addr && !isWalletVerifiedForSession(addr)) {
        ensureOpen('drawer');
      }
      onClose();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const handleMainButtonClick = () => {
    if (isWalletConnected) {
      onOpen();
      if (!isVerified) ensureOpen('drawer');
    } else {
      void handleConnectClick();
    }
  };

  const handleTosClose = async () => {
    setShowTos(false);
    const latestVersion = usePersistStore.getState().disclaimer.version;
    if (latestVersion >= CURRENT_TOS_VERSION) {
      await handleConnectClick();
    }
  };

  return (
    <>
      {isWalletConnected ? (
        <AccountButton
          data-testid="account-button"
          onClick={handleMainButtonClick}
          photoURL={avatarURL}
          displayName=" "
          {...props}
        />
      ) : (
        <Button
          variant="contained"
          color="info"
          onClick={handleMainButtonClick}
          data-testid="connect-wallet-button"
        >
          {t('Connect Wallet')}
        </Button>
      )}

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
      >
        {/* Close / Disconnect */}
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            right: 12,
            zIndex: 9,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Tooltip title="Close">
            <IconButton onClick={onClose} data-testid="close-drawer-button">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>
          {isWalletConnected && (
            <Tooltip title={isDisconnecting ? 'Disconnecting...' : 'Disconnect'}>
              <IconButton
                onClick={handleDisconnect}
                sx={{ ml: 'auto' }}
                disabled={isDisconnecting}
                data-testid="disconnect-wallet-button"
              >
                <Iconify icon="solar:power-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Scrollbar>
          {isWalletConnected && connectedAddress ? (
            isVerified ? (
              <WalletConnected address={connectedAddress} />
            ) : (
              <Box sx={{ p: 2, pt: 10 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  {t('Wallet connected. Verification required — a popup will guide you.')}
                </Typography>
                <Button sx={{ mt: 2 }} variant="contained" onClick={() => ensureOpen('drawer')}>
                  {t('Verify now')}
                </Button>
              </Box>
            )
          ) : (
            <WalletDisconnected onConnectClick={handleConnectClick} />
          )}
        </Scrollbar>
      </Drawer>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
}
