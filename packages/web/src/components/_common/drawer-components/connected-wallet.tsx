'use client';

import type { PoolPosition } from '@/hooks';
import type { Activity } from '@/types/activity';
import type { StateToken as Token } from '@normalfinance/types';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useBlux } from '@bluxcc/react';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useTabs } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';
import { ENABLE_BLUX_AUTH } from '@/lib/blux-config';
import { fPercent, fCurrencyCompact } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import TokensTab from './tokens-tab';
import ActivityTab from './activity-tab';
import ReceiveModal from '../receive-modal';
import PositioinsTab from './positions-tab';
import { CustomTabsSwapSend } from '../swap-send-card-custom-card';

// ----------------------------------------------------------------------
export interface ConnectedWalletProps {
  balance?: number;
  percentageChange?: number;
  tokens?: Token[];
  positions?: PoolPosition[];
  activity?: Activity[];
}

export default function ConnectedWallet({
  balance,
  percentageChange,
  tokens,
  positions,
  activity,
}: ConnectedWalletProps) {
  const { t } = useTranslate();
  const theme = useTheme();
  const router = useRouter();
  const blux = useBlux();
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  console.log('📱 ConnectedWallet: Rendered with Blux data', {
    bluxEnabled: ENABLE_BLUX_AUTH,
    bluxReady: blux?.isReady,
    bluxAuthenticated: blux?.isAuthenticated,
    bluxUser: blux?.user,
  });

  // Show Blux user info if using Blux authentication
  const showBluxInfo = ENABLE_BLUX_AUTH && blux?.isAuthenticated && blux?.user;

  const actionButtons = [
    {
      label: 'Send',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => {
        router.push(`${paths.swap}?tab=send`);
      },
    },
    {
      label: 'Receive',
      icon: 'mingcute:add-line',
      onClick: () => setShowReceiveModal(true),
    },
  ];

  const tabs = useTabs('tokens');

  const TAB_ITEMS = [
    { value: 'tokens', label: 'Tokens' },
    { value: 'positions', label: 'Positions' },
    { value: 'activity', label: 'Activity' },
  ] as const;

  return (
    <Stack spacing={2} sx={{ width: 1 }} mt={2}>
      {/* Blux User Info Section */}
      {showBluxInfo && (
        <Stack
          sx={{
            width: 1,
            borderRadius: '12px',
            border: `1px solid ${theme.palette.primary.main}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            p: 2,
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Stack flex={1}>
              <Typography variant="subtitle2" color="text.primary">
                {blux?.user?.email || t('Blux User')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Connected via')} {blux?.user?.wallet?.name || 'Blux'}
              </Typography>
            </Stack>
            <Stack spacing={0.5} alignItems="center">
              <Iconify icon="mingcute:shield-check-line" width={16} color="primary.main" />
              <Typography variant="caption" color="primary.main">
                {t('Verified')}
              </Typography>
            </Stack>
          </Stack>

          {/* Connected Wallet */}
          {blux?.user?.wallet && (
            <Stack spacing={1} mt={1}>
              <Typography variant="caption" color="text.secondary">
                {t('Connected Wallet')}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{
                  p: 1,
                  borderRadius: '8px',
                  backgroundColor: alpha(theme.palette.grey[500], 0.08),
                }}
              >
                <Iconify icon="mingcute:wallet-4-line" width={16} color="primary.main" />
                <Typography variant="caption" color="primary.main" flex={1}>
                  {blux.user.wallet.name}
                </Typography>
                <Typography variant="caption" color="primary.main">
                  {t('Active')}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Stack>
      )}

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
          <Tab key={tab.value} value={tab.value} label={t(tab.label)} />
        ))}
      </CustomTabsSwapSend>

      {/* ------- tab panels ---------------------------------------- */}
      {tabs.value === 'tokens' && <TokensTab tokens={tokens} />}
      {tabs.value === 'pools' && <PositioinsTab positions={positions ?? []} />}
      {tabs.value === 'activity' && <ActivityTab activity={activity} />}

      <ReceiveModal open={showReceiveModal} onClose={() => setShowReceiveModal(false)} />
    </Stack>
  );
}
