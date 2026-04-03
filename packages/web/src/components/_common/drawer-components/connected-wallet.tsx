'use client';

import type { Activity } from '@/types/activity';
import type { Token } from '@normalfinance/types';

import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useTabs } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import TokensTab from './tokens-tab';
import ActivityTab from './activity-tab';

// ----------------------------------------------------------------------
export interface ConnectedWalletProps {
  address: string;
  balance?: number;
  percentageChange?: number;
  tokens?: Token[];
  activity?: Activity[];
}

export default function ConnectedWallet({
  address,
  balance,
  percentageChange,
  tokens,
  activity,
}: ConnectedWalletProps) {
  const { t } = useTranslate();
  const theme = useTheme();
  const router = useRouter();

  const actionButtons = [
    {
      label: 'Swap',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => {
        router.push(paths.swap);
      },
    },
    {
      label: 'Savings',
      icon: 'mingcute:safe-box-line',
      onClick: () => {
        router.push(paths.savings);
      },
    },
  ];

  const tabs = useTabs('assets');

  const TAB_ITEMS = [
    { value: 'assets', label: 'Assets' },
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
            {fCurrencyTwoDecimals(balance)}
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
                  }}
                />
                {t(btn.label)}
              </Box>
            </Button>
          ))}
        </Stack>
      </Stack>

      <Tabs
        value={tabs.value}
        onChange={tabs.onChange}
        variant="standard"
        sx={{
          bgcolor: 'background.paper',
          padding: 0,
          mt: 1,
          minHeight: 34,
          '& .MuiTabs-flexContainer': {
            gap: '8px',
            padding: 0,
            minHeight: 34,
            alignItems: 'center',
          },
          '& .MuiTab-root': {
            borderRadius: '8px',
            px: '12px',
            py: 0,
            height: 34,
            minHeight: 34,
            color: theme.palette.text.primary,
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          '& .MuiTabs-indicator': {
            boxShadow: 'none !important',
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
            height: '100%',
            zIndex: 0,
          },
          '& .Mui-selected': {
            zIndex: 1,
          },
        }}
      >
        {TAB_ITEMS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={t(tab.label)} />
        ))}
      </Tabs>

      {/* ------- tab panels ---------------------------------------- */}
      {tabs.value === 'assets' && (
        <TokensTab tokens={tokens?.filter((tkn) => BigNumber(tkn.balance).gt(0))} />
      )}
      {tabs.value === 'activity' && <ActivityTab activity={activity} />}
    </Stack>
  );
}
