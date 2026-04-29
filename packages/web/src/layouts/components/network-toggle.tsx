'use client';

import { m } from 'framer-motion';
import { useNetwork } from '@/hooks';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { Iconify } from '@/components/template/iconify';
import { useSnackbar } from '@/components/template/snackbar';
import { CustomPopover } from '@/components/template/custom-popover';
import { varTap, varHover, transitionTap } from '@/components/template/animate';

// ---------------------------------------------------------------------------
// Guard: hide toggle when the deployment is hard-locked to mainnet.
// Override by setting NEXT_PUBLIC_ALLOW_NETWORK_SWITCH=true.
// ---------------------------------------------------------------------------
const networkEnv = process.env.NEXT_PUBLIC_NETWORK?.toUpperCase();
const switchAllowed = process.env.NEXT_PUBLIC_ALLOW_NETWORK_SWITCH === 'true';
export const NETWORK_SWITCH_ENABLED = networkEnv !== 'MAINNET' || switchAllowed;

// ---------------------------------------------------------------------------

const NETWORK_OPTIONS = [
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
] as const;

export function NetworkToggle() {
  const { open, anchorEl, onClose, onOpen } = usePopover();
  const { network, toggleNetwork } = useNetwork();
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();

  const handleSelect = (selected: 'mainnet' | 'testnet') => {
    if (selected !== network) {
      toggleNetwork();
      enqueueSnackbar(`Network switched to ${selected === 'mainnet' ? 'Mainnet' : 'Testnet'}`, {
        variant: 'success',
      });
    }
    onClose();
  };

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="network-picker-button"
        onClick={onOpen}
        sx={[
          {
            p: 0,
            width: 40,
            height: 40,
            ...(open && { bgcolor: theme.vars.palette.action.selected }),
          },
        ]}
      >
        <Iconify icon="ph:globe" width={24} />
      </IconButton>

      <CustomPopover open={open} anchorEl={anchorEl} onClose={onClose}>
        <MenuList sx={{ width: 160, minHeight: 72 }}>
          {NETWORK_OPTIONS.map((option) => {
            const dotColor =
              option.value === 'mainnet'
                ? theme.palette.success.main
                : theme.palette.warning.main;
            return (
              <MenuItem
                key={option.value}
                selected={option.value === network}
                onClick={() => handleSelect(option.value)}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: dotColor,
                    mr: 1.5,
                    flexShrink: 0,
                  }}
                />
                {option.label}
              </MenuItem>
            );
          })}
        </MenuList>
      </CustomPopover>
    </>
  );
}
