import type { PoolPosition } from '@/hooks';

import { useTranslate } from '@/locales';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import PositionItem from './position-item';

// ----------------------------------------------------------------------

export type PositionsTableProps = {
  positions: PoolPosition[];
};

// ----------------------------------------------------------------------

export function PositionsTable({ positions }: PositionsTableProps) {
  const theme = useTheme();
  const { t } = useTranslate('auto');

  const actionButtons = [
    {
      label: t('Add liquidity'),
      icon: 'mingcute:add-line',
      href: '/positions/create',
    },
  ];

  return (
    <>
      <Stack direction="row" spacing={1} width="100%">
        {actionButtons.map((btn, idx) => (
          <Button key={idx} fullWidth variant="soft" color="success" size="large" href={btn.href}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
            >
              <Iconify
                icon={btn.icon}
                width={14}
                sx={{
                  color: theme.palette.primary.dark,
                  cursor: 'pointer',
                  rotate: '-90deg',
                }}
              />
              {btn.label}
            </Box>
          </Button>
        ))}
      </Stack>

      {positions.map((position, idx) => (
        <PositionItem key={idx} pool={{ name: '', fee: 3 }} position={position} />
      ))}
    </>
  );
}
