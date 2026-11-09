'use client';

import type { ReactNode } from 'react';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useRouter } from '@/routes/hooks';
import { indexEnabled } from '@/lib/index/flag';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';
import { INK, HOVER, MUTED, PAPER, HAIRLINE_STRONG } from '@/theme/brand-colors';

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

// Indexes, only where they are switched on (lib/index/flag.ts): buying one
// is a way money moves, beside the Indexes tab and sidebar entry.
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
export function MoveMoneyMenu({ variant = 'button' }: { variant?: 'button' | 'outlined' }) {
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
    variant === 'outlined' ? (
      // The phone's top bar: an outlined button, never a filled block (Niko
      // 2026-11-09: the black Move tab in the bottom bar had to go).
      <ButtonBase
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          gap: 0.75,
          height: 36,
          px: 1.5,
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          color: INK,
          bgcolor: PAPER,
          border: `1px solid ${HAIRLINE_STRONG}`,
          '& svg': { fontSize: 18 },
          '&:hover': { bgcolor: HOVER },
          '&.Mui-focusVisible': { outline: `2px solid ${INK}`, outlineOffset: 2 },
        }}
      >
        <SyncAltRounded />
        Move money
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
        // Both triggers sit in the top bar, so the menu always opens below.
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 280 } } }}
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
