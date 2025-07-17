import type { Connector } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { useBoolean } from 'minimal-shared/hooks';
import React, { useState, useEffect } from 'react';
import { CURRENT_TOS_VERSION } from '@normalfinance/types';
import useNativeTokenBalance from '@/hooks/stellar/use-native-token-balance';
import { hana, xbull, lobstr, freighter, usePersistStore } from '@normalfinance/state';

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
/* tiny wallet tile (re-used in the grid)                              */
/* ------------------------------------------------------------------ */
function WalletOption({
  connector,
  allowed,
  onClick,
}: {
  connector: Connector;
  allowed: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslate();

  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        display: 'flex',
        p: '10px',
        my: '4px',
        textAlign: 'center',
        cursor: allowed ? 'pointer' : 'default',
        opacity: allowed ? 1 : 0.4,
        borderRadius: '8px',
        gap: 2,
        alignItems: 'center',
      }}
    >
      <img src={connector.iconUrl} width={48} height={48} alt={connector.name} />
      <Typography variant="h6" sx={{ mt: 0.5 }}>
        {connector.name}
      </Typography>
      {!allowed && (
        <Typography variant="body2" color="text.secondary">
          {t('Not installed')}
        </Typography>
      )}
    </Paper>
  );
}

/* ------------------------------------------------------------------ */
/* ① Disconnected: list the wallets                                   */
/* ------------------------------------------------------------------ */
function WalletDisconnected({
  connectors,
  onSelect,
}: {
  connectors: Connector[];
  onSelect: (c: Connector) => void;
}) {
  const [allowed, setAllowed] = useState<Connector[]>([]);
  const [disallowed, setDisallowed] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslate();

  useEffect(() => {
    (async () => {
      const ok: Connector[] = [];
      const no: Connector[] = [];

      for (const c of connectors) {
        if (await c.isConnected()) {
          ok.push(c);
        } else {
          no.push(c);
        }
      }
      setAllowed(ok);
      setDisallowed(no);
      setLoading(false);
    })();
  }, [connectors]);

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
      <Typography variant="subtitle1" sx={{ mb: 3 }} textAlign="left">
        {t('Connect your wallet')}
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <Box gap={2} width="100%" sx={{ backgroundColor: 'grey.200', p: 1, borderRadius: 1.5 }}>
          {[...allowed, ...disallowed].map((c) => (
            <WalletOption
              key={c.id}
              connector={c}
              allowed={allowed.includes(c)}
              onClick={() => allowed.includes(c) && onSelect(c)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* ② Connected: simple summary / logout                               */
/* ------------------------------------------------------------------ */
function WalletConnected({ address }: { address: string }) {
  const { data } = useNativeTokenBalance();

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
        <CopyIconButton value={address} alert="Address copied" />
      </Stack>
      <ConnectedWallet
        balance={Number(data?.data) || 0}
        percentageChange={0}
        tokens={[]}
        positions={[]}
        activity={[]}
      />
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
  const isConnected = !!persist.wallet.address;

  /* ↓ drawer UI toggle ------------------------------------------- */
  const { value: open, onTrue: onOpen, onFalse: onClose } = useBoolean();

  /* ↓ connectors -------------------------------------------------- */
  const connectors: Connector[] = [freighter(), xbull(), lobstr(), hana()];

  const connect = (c: Connector) => persist.connectWallet(c.id);
  const disconnect = () => persist.disconnectWallet();

  const disclaimerVersion = usePersistStore((s: any) => s.disclaimer.version);
  const [showTos, setShowTos] = useState(false);

  /** Open drawer OR show ToS dialog, depending on acceptance */
  const handleMainButtonClick = () => {
    if (disclaimerVersion < CURRENT_TOS_VERSION) {
      setShowTos(true);
    } else {
      onOpen();
    }
  };

  /** Called whenever the ToS modal closes (Accept or Decline).
   *  If they accepted, open the wallet drawer right away. */
  const handleTosClose = () => {
    setShowTos(false);

    // read the latest store value directly (no hooks inside a callback)
    const latestVersion = usePersistStore.getState().disclaimer.version;
    if (latestVersion >= CURRENT_TOS_VERSION) {
      onOpen(); // open the drawer immediately
    }
  };

  if (isConnected) return <>{children}</>;

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant={variant}
        color={color}
        onClick={handleMainButtonClick}
        data-testid="wallet-gate-connect-btn"
      >
        {buttonText}
      </Button>

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
            <IconButton onClick={onClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Tooltip>

          {isConnected && (
            <Tooltip title="Disconnect">
              <IconButton
                onClick={() => {
                  disconnect();
                  onClose();
                }}
                sx={{ ml: 'auto' }}
              >
                <Iconify icon="solar:power-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Scrollbar>
          {isConnected ? (
            <WalletConnected address={persist.wallet.address!} />
          ) : (
            <WalletDisconnected
              connectors={connectors}
              onSelect={async (c) => {
                await connect(c);
                onClose();
              }}
            />
          )}
        </Scrollbar>
      </Drawer>
      <TermsOfServiceDialog open={showTos} onClose={handleTosClose} />
    </>
  );
};

export default WalletGate;
