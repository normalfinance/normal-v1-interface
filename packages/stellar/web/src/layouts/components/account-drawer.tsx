'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { useBoolean } from 'minimal-shared/hooks';
import { SignOutButton } from '@/components/_common/sign-out-button';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { usePathname } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { AnimateBorder } from 'src/components/animate';

import { UpgradeBlock } from './nav-upgrade';
import { AccountButton } from './account-button';

// ----------------------------------------------------------------------

export type AccountDrawerProps = IconButtonProps & {
  balance?: number | undefined;
  walletAddress?: string | undefined;
  connectWallet: () => void;
  disconnectWallet: () => void;
};

export function AccountDrawer({
  balance,
  walletAddress,
  connectWallet,
  disconnectWallet,
  sx,
  ...other
}: AccountDrawerProps) {
  const pathname = usePathname();

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const renderAvatar = () => (
    <AnimateBorder
      sx={{ mb: 2, p: '6px', width: 96, height: 96, borderRadius: '50%' }}
      slotProps={{
        primaryBorder: { size: 120, sx: { color: 'primary.main' } },
      }}
    >
      <Avatar src={walletAddress ?? ''} alt={walletAddress ?? ''} sx={{ width: 1, height: 1 }}>
        {walletAddress ?? ''}
      </Avatar>
    </AnimateBorder>
  );

  // const renderList = () => (
  //   <MenuList
  //     disablePadding
  //     sx={[
  //       (theme) => ({
  //         py: 3,
  //         px: 2.5,
  //         borderTop: `dashed 1px ${theme.vars.palette.divider}`,
  //         borderBottom: `dashed 1px ${theme.vars.palette.divider}`,
  //         '& li': { p: 0 },
  //       }),
  //     ]}
  //   >
  //     {data.map((option) => {
  //       const rootLabel = pathname.includes('/overview') ? 'Home' : 'Dashboard';
  //       const rootHref = pathname.includes('/overview') ? '/' : paths.overview;

  //       return (
  //         <MenuItem key={option.label}>
  //           <Link
  //             component={RouterLink}
  //             href={option.label === 'Home' ? rootHref : option.href}
  //             color="inherit"
  //             underline="none"
  //             onClick={onClose}
  //             sx={{
  //               p: 1,
  //               width: 1,
  //               display: 'flex',
  //               typography: 'body2',
  //               alignItems: 'center',
  //               color: 'text.secondary',
  //               '& svg': { width: 24, height: 24 },
  //               '&:hover': { color: 'text.primary' },
  //             }}
  //           >
  //             {option.icon}

  //             <Box component="span" sx={{ ml: 2 }}>
  //               {option.label === 'Home' ? rootLabel : option.label}
  //             </Box>

  //             {option.info && (
  //               <Label color="error" sx={{ ml: 1 }}>
  //                 {option.info}
  //               </Label>
  //             )}
  //           </Link>
  //         </MenuItem>
  //       );
  //     })}
  //   </MenuList>
  // );

  return (
    <>
      <AccountButton
        onClick={onOpen}
        photoURL={walletAddress ?? ''}
        displayName={walletAddress ?? ''}
        sx={sx}
        {...other}
      />

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 320 } }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            top: 12,
            left: 12,
            zIndex: 9,
            position: 'absolute',
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>

        <Scrollbar>
          <Box
            sx={{
              pt: 8,
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
            }}
          >
            {renderAvatar()}

            <Typography variant="subtitle1" noWrap sx={{ mt: 2 }}>
              {walletAddress}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }} noWrap>
              {walletAddress}
            </Typography>
          </Box>

          {/* {renderList()} */}

          <Box sx={{ px: 2.5, py: 3 }}>
            <UpgradeBlock />
          </Box>
        </Scrollbar>

        <Box sx={{ p: 2.5 }}>
          <SignOutButton
            size="medium"
            variant="text"
            onLogout={disconnectWallet}
            sx={{ display: 'block', textAlign: 'left' }}
          />
        </Box>
      </Drawer>
    </>
  );
}
