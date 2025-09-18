'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import axios from 'axios';
import posthog from 'posthog-js';
import { paths } from '@/routes/paths';
import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { useBoolean } from 'minimal-shared/hooks';
import { ZEALY_QUEST_IDS } from '@/global-config';
import { useState, useEffect, useCallback } from 'react';
import { format, trackEvent, logger } from '@normalfinance/utils';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { useUserActivity, useLiquidityPositions } from '@/hooks';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Box, Stack, Button, Drawer, Tooltip, IconButton, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import ZealyHighlight from '@/components/_common/zealy/zealy-highlight';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';

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

      logger.log('[WALLET CONNECTED] Refreshing tokens for address:', address);
      setGlobalIsLoading(true);
      try {
        await getAllTokens();
        logger.log('[WALLET CONNECTED] Tokens fetched successfully');
        setGlobalIsLoading(false);
      } catch (e) {
        logger.error('[WALLET CONNECTED] Error fetching tokens:', e);
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
  /* ↓ stores ------------------------------------------------------ */
  const persist = usePersistStore();
  const { t } = useTranslate();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();

  /* ↓ drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  const {
    value: isDisconnecting,
    onTrue: startDisconnecting,
    onFalse: stopDisconnecting,
  } = useBoolean();

  /* ↓ main button uses dummy avatar ------------------------------ */
  const avatarURL = '/assets/icons/navbar/logo.webp';

  /* ↓ derived state ---------------------------------------------- */
  const connectedAddress = persist.wallet.address || publicKey;
  const isWalletConnected = !!connectedAddress || isConnected;

  const handleDisconnect = async () => {
    if (isDisconnecting) {
      return;
    }

    try {
      startDisconnecting();

      persist.disconnectWallet();

      await disconnectWallet();

      posthog.reset();

      onClose();
    } catch (error) {
      logger.error('Error disconnecting wallet:', error);

      onClose();
    } finally {
      stopDisconnecting();
    }
  };

  useEffect(() => {
    if (connectedAddress) {
      posthog.identify(
        connectedAddress,
        { last_login: new Date() }, // updates every time
        { signup_date: new Date() } // sets only once
      );
    }
  }, [connectedAddress]);

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  /** Handle connecting wallet - show Stellar Wallets Kit popup OR ToS */
  const handleConnectClick = async () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
      return;
    }

    try {
      await connectWallet();
      onClose(); // Close the drawer after connecting
    } catch (error) {
      logger.error('Error connecting wallet:', error);
    }
  };

  /** Open drawer when wallet is connected, connect when not connected */
  const handleMainButtonClick = () => {
    if (isWalletConnected) {
      onOpen(); // Open drawer to show wallet info
    } else {
      handleConnectClick(); // Connect wallet
    }
  };

  /** Called when ToS dialog closes */
  const handleTosClose = async () => {
    setShowTos(false);

    // Check if user accepted ToS, then connect wallet
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
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
          },
        }}
      >
        {/* close (X) */}
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
          {/* ← close (X) */}
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
            <WalletConnected address={connectedAddress} />
          ) : (
            <WalletDisconnected onConnectClick={handleConnectClick} />
          )}
        </Scrollbar>
      </Drawer>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
}
