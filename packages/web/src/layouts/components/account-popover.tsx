import type { IconButtonProps } from '@mui/material/IconButton';

import { usePopover } from 'minimal-shared/hooks';
import { SignOutButton } from '@/components/_common/sign-out-button';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { CustomPopover } from 'src/components/custom-popover';

import { AccountButton } from './account-button';

// ----------------------------------------------------------------------

export type AccountPopoverProps = IconButtonProps & {
  balance?: number | undefined;
  walletAddress?: string | undefined;
  connectWallet: () => void;
  disconnectWallet: () => void;
};

export function AccountPopover({
  balance,
  walletAddress,
  connectWallet,
  disconnectWallet,
  sx,
  ...other
}: AccountPopoverProps) {
  const { open, anchorEl, onClose, onOpen } = usePopover();

  const renderMenuActions = () => (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{ paper: { sx: { p: 0, width: 200 } }, arrow: { offset: 20 } }}
    >
      <Box sx={{ p: 2, pb: 1.5 }}>
        <Typography variant="subtitle2" noWrap>
          {walletAddress}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
          {balance} XLM
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 1 }}>
        <SignOutButton
          size="medium"
          variant="text"
          onLogout={disconnectWallet}
          sx={{ display: 'block', textAlign: 'left' }}
        />
      </Box>
    </CustomPopover>
  );

  return (
    <>
      <AccountButton
        onClick={onOpen}
        photoURL={walletAddress ?? ''}
        displayName={walletAddress ?? ''}
        sx={sx}
        {...other}
      />

      {renderMenuActions()}
    </>
  );
}
