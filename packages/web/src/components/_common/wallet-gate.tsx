import React, { useState } from 'react';
import { usePersistStore } from '@normalfinance/state';
import { Button, Dialog } from '@mui/material';
import { AccountDrawer } from '@/layouts/components/account-drawer';

interface WalletGateProps {
  children: React.ReactNode;
  buttonText?: string;
  fullWidth?: boolean;
  variant?: 'contained' | 'soft' | 'outlined';
  color?: 'info' | 'success' | 'primary' | 'secondary' | 'error' | 'warning';
}

export const WalletGate: React.FC<WalletGateProps> = ({
  children,
  buttonText = 'Connect Wallet',
  fullWidth = true,
  variant = 'contained',
  color = 'info',
}) => {
  const persist = usePersistStore();
  const isConnected = !!persist.wallet.address;
  const [open, setOpen] = useState(false);

  if (isConnected) return <>{children}</>;

  return (
    <>
      <Button
        fullWidth={fullWidth}
        variant={variant}
        color={color}
        onClick={() => setOpen(true)}
        data-testid="wallet-gate-connect-btn"
      >
        {buttonText}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <AccountDrawer onClick={() => setOpen(false)} />
      </Dialog>
    </>
  );
};

export default WalletGate;
