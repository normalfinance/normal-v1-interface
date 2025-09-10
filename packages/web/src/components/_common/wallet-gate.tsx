import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import React, { useState } from 'react';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import { usePersistStore } from '@normalfinance/state';
import { useStellarWalletsKit } from '@/hooks/stellar/use-stellar-wallets-kit';

import {
  Box,
  Paper,
  Stack,
  Button,
  Drawer,
  Tooltip,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';
import CopyIconButton from '@/components/copy-icon-button';
import { Scrollbar } from '@/components/template/scrollbar';
import ConnectedWallet from '@/components/_common/drawer-components/connected-wallet';
import TermsOfServiceDialog from '@/components/_common/drawer-components/terms-of-service-dialog';

interface WalletGateProps {
  children: React.ReactNode;
  buttonText?: string;
  fullWidth?: boolean;
  variant?: 'contained' | 'soft' | 'outlined';
  color?: 'info' | 'success' | 'primary' | 'secondary' | 'error' | 'warning';
}


/* ------------------------------------------------------------------ */
/* ② Connected: simple summary / logout                               */
/* ------------------------------------------------------------------ */
function WalletConnected({ address }: { address: string }) {
  const { t } = useTranslate();
  // const { data: tokenBalances, isLoading: balancesLoading } = useUserTokens();

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
      <Stack direction="row" width={1} justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">{format.fTruncate(address, 25)}</Typography>
        <CopyIconButton value={address} alert={t('Address copied')} />
      </Stack>
      {/* TODO: replace balance with tokenBalances */}
      <ConnectedWallet balance={0} percentageChange={0} tokens={[]} positions={[]} activity={[]} />
    </Box>
  );
}

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  buttonText = 'Connect Wallet',
  fullWidth = true,
  variant = 'contained',
  color = 'info',
}) => {
  const persist = usePersistStore();
  const { t } = useTranslate();
  const { connectWallet, publicKey, isConnected, disconnectWallet } = useStellarWalletsKit();
  const isWalletConnected = !!persist.wallet.address || isConnected;

  /* ↓ drawer UI toggle (only used when wallet is connected) -------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

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
      
      // After successful connection, store the wallet info in our state
      if (publicKey) {
        await persist.connectWallet(publicKey, 'stellar-wallets-kit');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  /** Handle wallet disconnect */
  const handleDisconnectClick = async () => {
    try {
      await disconnectWallet();
      persist.disconnectWallet();
      onClose();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
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

  if (isWalletConnected) {
    return (
      <>
        {children}
        {/* Drawer for showing wallet info when connected */}
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
          {/* close (X) and disconnect button */}
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
              <IconButton onClick={onClose}>
                <Iconify icon="mingcute:close-line" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Disconnect">
              <IconButton onClick={handleDisconnectClick} sx={{ ml: 'auto' }}>
                <Iconify icon="solar:power-bold" />
              </IconButton>
            </Tooltip>
          </Box>
          <Scrollbar>
            <WalletConnected address={persist.wallet.address || publicKey || ''} />
          </Scrollbar>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant={variant}
        color={color}
        onClick={handleConnectClick}
        data-testid="wallet-gate-connect-btn"
      >
        {t(buttonText)}
      </Button>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
};

export default WalletGate;
