'use client';

import type { Token } from '@/types/token';
import type { Activity } from '@/types/activity';

import { useState } from 'react';
import { useTabs } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';
import { fPercent, fCurrencyCompact } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import PoolsTab from './pools-tab';
import TokensTab from './tokens-tab';
import ActivityTab from './activity-tab';
import { CustomTabsSwapSend } from '../swap-send-card-custom-card';

import type { PoolDetails } from '../../_pool-page-components/pool-chart/pool-chart-data';

// ----------------------------------------------------------------------
export interface ConnectedWalletProps {
  balance?: number;
  percentageChange?: number;
  tokens?: Token[];
  poolPositions?: PoolDetails[];
  activity?: Activity[];
}

export default function ConnectedWallet({
  balance,
  percentageChange,
  tokens,
  poolPositions,
  activity,
}: ConnectedWalletProps) {
  const theme = useTheme();
  const [showSwap, setShowSwap] = useState(false);

  const actionButtons = [
    {
      label: 'Send',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => setShowSwap((prev) => !prev),
    },
    {
      label: 'Receive',
      icon: 'mingcute:add-line',
      href: '/positions/create',
    },
  ];

  const tabs = useTabs('tokens');

  const TAB_ITEMS = [
    { value: 'tokens', label: 'Tokens' },
    { value: 'pools', label: 'Pools' },
    { value: 'activity', label: 'Activity' },
  ] as const;

  return (
    <Stack spacing={2} sx={{ width: 1 }} mt={2}>
      <Stack
        sx={{
          width: 1,
          borderRadius: '16px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          p: 1,
          pt: 2,
          gap: '6px',
        }}
      >
        {balance !== undefined && (
          <Typography
            variant="caption"
            color="text.primary"
            sx={{ fontSize: '40px', lineHeight: '48px', fontWeight: 600 }}
            noWrap
          >
            {fCurrencyCompact(balance)}
          </Typography>
        )}
        {percentageChange !== undefined && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box
              component="span"
              sx={{
                width: 24,
                height: 24,
                display: 'flex',
                borderRadius: '50%',
                position: 'relative',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.16),
                color: 'success.dark',
                ...theme.applyStyles('dark', {
                  color: 'success.light',
                }),
                ...(percentageChange &&
                  percentageChange < 0 && {
                    bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.16),
                    color: 'error.dark',
                    ...theme.applyStyles('dark', {
                      color: 'error.light',
                    }),
                  }),
              }}
            >
              <Iconify
                width={16}
                icon={
                  percentageChange && percentageChange < 0
                    ? 'eva:trending-down-fill'
                    : 'eva:trending-up-fill'
                }
                color={percentageChange && percentageChange < 0 ? 'error.main' : 'success.main'}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: percentageChange && percentageChange < 0 ? 'error.main' : 'success.main',
              }}
            >
              {percentageChange && percentageChange >= 0 && '+'}
              {fPercent(percentageChange && percentageChange)}
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1} width="100%" mt={2}>
          {actionButtons.map((btn, idx) => (
            <Button
              key={idx}
              fullWidth
              variant="soft"
              color="success"
              size="large"
              onClick={btn.onClick}
              href={btn.href}
            >
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
      </Stack>
      <CustomTabsSwapSend
        value={tabs.value}
        onChange={tabs.onChange}
        variant="standard"
        sx={{ bgcolor: 'background.paper', padding: 0, mt: 1 }}
        slotProps={{
          flexContainer: { gap: '8px', padding: 0 },
          tab: {
            borderRadius: '8px',
            px: '12px',
            height: '34px',
            color: theme.palette.text.primary,
          },
          selected: {},
          indicator: {
            boxShadow: 'none !important',
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {TAB_ITEMS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </CustomTabsSwapSend>

      {/* ------- tab panels ---------------------------------------- */}
      {tabs.value === 'tokens' && <TokensTab tokens={tokens} />}
      {tabs.value === 'pools' && <PoolsTab pools={pools} />}
      {tabs.value === 'activity' && <ActivityTab activity={activity} />}
    </Stack>
  );
}
