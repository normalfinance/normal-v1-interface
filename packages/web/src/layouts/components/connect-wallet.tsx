import type { DialogProps } from '@mui/material';
import type { Connector } from '@normalfinance/types';

import { useTranslate } from '@/locales';
import { useState, useEffect, useCallback } from 'react';
import { logger } from '@normalfinance/utils';

import {
  Box,
  Paper,
  Dialog,
  Typography,
  DialogTitle,
  DialogContent,
  CircularProgress,
} from '@mui/material';

// ----------------------------------------------------------------------

interface Props extends DialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  walletAddress?: string | undefined;
  connectors: Connector[];
  connect: (connector: Connector) => Promise<void>;
}

export function ConnectWallet({
  open,
  setOpen,
  walletAddress,
  connectors,
  connect,
  ...other
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Connector | undefined>(undefined);
  const [allowedConnectors, setAllowedConnectors] = useState<Connector[]>([]);
  const [disallowedConnectors, setDisallowedConnectors] = useState<Connector[]>([]);
  const [loadingConnectors, setLoadingConnectors] = useState(true);
  const { t } = useTranslate();

  useEffect(() => {
    const checkConnectors = async () => {
      setLoadingConnectors(true);
      const allowed: Connector[] = [];
      const disallowed: Connector[] = [];
      for (const connector of connectors) {
        const isAllowed = await connector.isConnected();
        if (isAllowed) {
          allowed.push(connector);
        } else {
          disallowed.push(connector);
        }
      }
      setAllowedConnectors(allowed);
      setDisallowedConnectors(disallowed);
      setLoadingConnectors(false);
    };
    checkConnectors();
  }, [connectors]);

  /**
   * Handles wallet connection.
   * Initiates the connection process for the selected connector.
   *
   * @param {Connector} connector - The wallet connector to connect with.
   */
  const handleConnect = useCallback(
    async (connector: Connector) => {
      setLoading(true);
      try {
        await connect(connector);
      } catch (error) {
        logger.log('Wallet connection failed:', error);
      } finally {
        setLoading(false);
        setOpen(false);
      }
    },
    [connect, setOpen]
  );

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" {...other}>
      <DialogTitle>{t('Connect Wallet')}</DialogTitle>
      <DialogContent sx={{ overflow: 'unset' }}>
        <Box display="grid" gap={2} gridTemplateColumns="repeat(2, 1fr)" sx={{ p: 3 }}>
          {!loadingConnectors ? (
            <>
              {allowedConnectors.map((connector) => (
                <OptionComponent
                  key={connector.id}
                  connector={connector}
                  selected={selected === connector}
                  onClick={() => {
                    setSelected(connector);
                    handleConnect(connector);
                  }}
                  allowed
                />
              ))}
              {disallowedConnectors.map((connector) => (
                <OptionComponent
                  key={connector.id}
                  connector={connector}
                  selected={selected === connector}
                  onClick={() => setSelected(connector)}
                  allowed={false}
                />
              ))}
            </>
          ) : (
            <CircularProgress />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

type OptionComponentProps = {
  connector: Connector;
  onClick: () => void;
  selected: boolean;
};

/**
 * OptionComponent
 * Renders an individual wallet option with hover effects and selection state.
 *
 * @param {OptionComponentProps} props - Contains wallet connector, click handler, and selection status.
 * @returns {JSX.Element} The wallet option component.
 */
const OptionComponent = ({
  connector,
  onClick,
  selected,
  allowed,
}: OptionComponentProps & { allowed: boolean }) => {
  const { t } = useTranslate();
  return (
    <Paper
      key={connector.id}
      variant="outlined"
      sx={{ py: 2.5, textAlign: 'center' }}
      onClick={allowed ? onClick : undefined}
    >
      <img src={connector.iconUrl} width="37" height="37" alt={connector.name} />

      <Typography variant="h6" sx={{ mt: 0.5 }}>
        {connector.name}
      </Typography>

      {!allowed && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('Not installed')}
        </Typography>
      )}
    </Paper>
  );
};
