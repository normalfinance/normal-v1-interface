'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import posthog from 'posthog-js';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { cdn, format, logger } from '@normalfinance/utils';
import { useUserActivity, useLiquidityPositions } from '@/hooks';
import { useAppStore, usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import { Box, Stack, Button, Drawer, Tooltip, IconButton, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';

import { AccountButton } from './account-button';

function WalletConnected({ address }: { address: string }) {
  const { setGlobalIsLoading } = useAppStore();

  const {
    tokenState: { tokens },
    getAllTokens,
  } = usePersistStore();

  const { positions } = useLiquidityPositions();

  const { recentActivity } = useUserActivity();

  // Effect hook to fetch all tokens when the component mounts or address changes
  useEffect(() => {
    const refreshTokens = async (): Promise<void> => {
      if (!address) return; // Don't fetch tokens if no address

      setGlobalIsLoading(true);
      try {
        await getAllTokens(true);
      } catch (e) {
        logger.error(e);
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
    const holdings = BigNumber(tkn.balance).multipliedBy(tkn.price);
    return acc.plus(holdings);
  }, BigNumber(0));

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

      <ConnectedWallet
        balance={totalBalance.toNumber()}
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
  const avatarURL = cdn('logo/logo-single.svg');

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
        {isWalletConnected && connectedAddress && (
          <Scrollbar>
            <WalletConnected address={connectedAddress} />
          </Scrollbar>
        )}
      </Drawer>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
}
