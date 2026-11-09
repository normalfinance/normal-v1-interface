'use client';

import type { ReactNode } from 'react';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { indexEnabled } from '@/lib/index/flag';
import { INK, MUTED } from '@/theme/brand-colors';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import AddRounded from '@mui/icons-material/AddRounded';
import SyncAltRounded from '@mui/icons-material/SyncAltRounded';
import SouthWestRounded from '@mui/icons-material/SouthWestRounded';
import NorthEastRounded from '@mui/icons-material/NorthEastRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import DonutSmallOutlined from '@mui/icons-material/DonutSmallOutlined';
import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';

import { IconTile } from '@/components/_common/icon-tile';

// ----------------------------------------------------------------------

type MoveItem = {
  key: string;
  label: string;
  detail: string;
  icon: ReactNode;
};

const ITEMS: MoveItem[] = [
  {
    key: 'buy',
    label: 'Add money',
    detail: 'Buy with a card or bank',
    icon: <AddRounded />,
  },
  {
    key: 'send',
    label: 'Send',
    detail: 'To any address',
    icon: <NorthEastRounded />,
  },
  {
    key: 'receive',
    label: 'Receive',
    detail: 'Show your address',
    icon: <SouthWestRounded />,
  },
  {
    key: 'swap',
    label: 'Swap',
    detail: 'Exchange one asset for another',
    icon: <SwapHorizRounded />,
  },
  {
    key: 'sell',
    label: 'Cash out',
    detail: 'Sell to your bank',
    icon: <AccountBalanceOutlined />,
  },
];

// Indexes, only where they are switched on (lib/index/flag.ts): on a phone
// this menu is the only way to them, the sidebar being desktop only.
const INDEX_ITEM: MoveItem = {
  key: 'indexes',
  label: 'Buy an index',
  detail: 'Several coins in one purchase',
  icon: <DonutSmallOutlined />,
};

/**
 * The app's one primary action, like a bank app's "Payment or transfer": every
 * way money moves, in one menu. The flows are the existing ones; Swap is a page.
 */
export function MoveMoneyMenu({ variant = 'button' }: { variant?: 'button' | 'tab' }) {
  const router = useRouter();
  const { startAction } = useAssetActionsContext();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const close = () => setAnchor(null);

  const select = (key: string) => {
    close();
    if (key === 'swap') router.push(paths.swap);
    else if (key === 'indexes') router.push(paths.indexes.root);
    else startAction(key as 'buy' | 'sell' | 'send' | 'receive');
  };

  const trigger =
    variant === 'tab' ? (
      <ButtonBase
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%', color: INK }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 32,
            borderRadius: 'var(--radius-md)',
            bgcolor: INK,
            color: '#FFFFFF',
          }}
        >
          <SyncAltRounded sx={{ fontSize: 20 }} />
        </Box>
        <Typography component="span" sx={{ fontSize: 11, fontWeight: 500 }}>
          Move
        </Typography>
      </ButtonBase>
    ) : (
      <Button
        variant="contained"
        size="medium"
        startIcon={<SyncAltRounded />}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        Move money
      </Button>
    );

  return (
    <>
      {trigger}
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={close}
        anchorOrigin={{ vertical: variant === 'tab' ? 'top' : 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: variant === 'tab' ? 'bottom' : 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: variant === 'tab' ? -1 : 1, minWidth: 280 } } }}
      >
        {(indexEnabled() ? [...ITEMS, INDEX_ITEM] : ITEMS).map((item) => (
          <MenuItem key={item.key} onClick={() => select(item.key)} sx={{ gap: 1.5, py: 1 }}>
            <IconTile tone="soft" size={36}>
              {item.icon}
            </IconTile>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 500, color: INK }}>
                {item.label}
              </Typography>
              <Typography sx={{ fontSize: 13, color: MUTED }}>{item.detail}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
