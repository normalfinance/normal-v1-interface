'use client';

import type { LiquidityPosition } from '@/hooks';
import type { Activity } from '@/types/activity';
import type { Token } from '@normalfinance/types';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';
import { useTabs } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';
import { useAppStore } from '@normalfinance/state';
import { runDepositFlow, runWithdrawFlow } from '@/lib/mgi/client';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import TokensTab from './tokens-tab';
import ActivityTab from './activity-tab';
import PositionsTab from './positions-tab';
import ReceiveModal from '../receive-modal';
import { CustomTabsSwapSend } from '../swap-send-card-custom-card';

// ----------------------------------------------------------------------
export interface ConnectedWalletProps {
  address: string;
  balance?: number;
  percentageChange?: number;
  tokens?: Token[];
  positions?: LiquidityPosition[];
  activity?: Activity[];
}

export default function ConnectedWallet({
  address,
  balance,
  percentageChange,
  tokens,
  positions,
  activity,
}: ConnectedWalletProps) {
  const { t } = useTranslate();
  const theme = useTheme();
  const router = useRouter();

  const { modalState, setModalView } = useAppStore();

  const actionButtons = [
    {
      label: 'Deposit',
      icon: 'mingcute:add-line',
      onClick: () => {
        setModalView('deposit', true);
      },
    },
    {
      label: 'Withdraw',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => {
        router.push(`${paths.invest}?tab=send`);
      },
    },
  ];

  const tabs = useTabs('assets');

  const TAB_ITEMS = [
    { value: 'assets', label: 'Assets' },
    { value: 'earn', label: 'Earn' },
    { value: 'activity', label: 'Activity' },
  ] as const;

  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [mgiBusy, setMgiBusy] = useState(false);

  const openBuyDialog = () => setBuyDialogOpen(true);
  const openWithdrawDialog = () => setWithdrawDialogOpen(true);
  const closeBuyDialog = () => setBuyDialogOpen(false);
  const closeWithdrawDialog = () => setWithdrawDialogOpen(false);

  // common start (preflight + flow wrapper)
  async function startMgi(kind: 'deposit' | 'withdraw', addr: string, amountStr: string) {
    setMgiBusy(true);
    try {
      const env = await detectWalletEnv();
      assertTestnetAndAccountMatch(env, addr);

      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        enqueueSnackbar(t('Enter a valid USDC amount'), { variant: 'warning' });
        return;
      }

      if (kind === 'deposit') {
        await runDepositFlow(addr, amount, () => {
          enqueueSnackbar(t('MoneyGram ready — awaiting your cash deposit'), { variant: 'info' });
        });
      } else {
        await runWithdrawFlow(addr, amount, () => {
          enqueueSnackbar(t('MoneyGram ready — send USDC when prompted'), { variant: 'info' });
        });
      }
    } catch (e: any) {
      enqueueSnackbar(t('MoneyGram {{kind}} failed', { kind }), { variant: 'error' });
    } finally {
      setMgiBusy(false);
    }
  }

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
                    rotate: '-90deg',
                  }}
                />
                {t(btn.label)}
              </Box>
            </Button>
          ))}
        </Stack>
      </Stack>

      {/* Deposit dialog */}
      {/* <AmountDialog
        open={buyDialogOpen}
        onCancel={closeBuyDialog}
        onConfirm={async (val) => {
          closeBuyDialog();
          await startMgi('deposit', address, val);
        }}
        defaultAmount=""
        min={1}
        max={900}
        kind="deposit"
        tokenLabel="USDC"
      /> */}

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
      {tabs.value === 'tokens' && (
        <TokensTab tokens={tokens?.filter((tkn) => BigNumber(tkn.balance).gt(0))} />
      )}
      {tabs.value === 'positions' && <PositionsTab positions={positions ?? []} />}
      {tabs.value === 'activity' && <ActivityTab activity={activity} />}

      <ReceiveModal
        open={modalState.receive}
        onClose={() => {
          setModalView('receive', false);
        }}
      />
    </Stack>
  );
}
