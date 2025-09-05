'use client';

import type { PoolPosition } from '@/hooks';
import type { Activity } from '@/types/activity';
import type { StateToken as Token } from '@normalfinance/types';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useTabs } from 'minimal-shared/hooks';
import { varAlpha } from 'minimal-shared/utils';
import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

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

import { enqueueSnackbar, useSnackbar } from 'notistack';
import AmountDialog from '@/components/deposit-amount-dialog';
import { detectWalletEnv, assertTestnetAndAccountMatch } from '@/lib/mgi/preflight';
import { runDepositFlow, runWithdrawFlow } from '@/lib/mgi/client';

// ----------------------------------------------------------------------
export interface ConnectedWalletProps {
  address: string;
  balance?: number;
  percentageChange?: number;
  tokens?: Token[];
  positions?: PoolPosition[];
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
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const actionButtons = [
    {
      label: 'Send',
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => {
        // trackEvent('button_clicked', {
        //   label: 'Manage Stake',
        //   location: 'Insurance',
        // });
        router.push(`${paths.swap}?tab=send`);
      },
    },
    {
      label: 'Receive',
      icon: 'mingcute:add-line',
      onClick: () => {
        // trackEvent('button_clicked', {
        //   label: 'Manage Stake',
        //   location: 'Insurance',
        // });
        setShowReceiveModal(true);
      },
    },
  ];

  const tabs = useTabs('tokens');

  const TAB_ITEMS = [
    { value: 'tokens', label: 'Tokens' },
    { value: 'positions', label: 'Positions' },
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
        enqueueSnackbar('Enter a valid USDC amount', { variant: 'warning' });
        return;
      }

      if (kind === 'deposit') {
        await runDepositFlow(addr, amount, () => {
          enqueueSnackbar('MoneyGram ready — awaiting your cash deposit', { variant: 'info' });
        });
      } else {
        await runWithdrawFlow(addr, amount, () => {
          enqueueSnackbar('MoneyGram ready — send USDC when prompted', { variant: 'info' });
        });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.message || `MoneyGram ${kind} failed`, { variant: 'error' });
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
                {btn.label}
              </Box>
            </Button>
          ))}
        </Stack>
      </Stack>

      <Stack direction="row" width={1} spacing={1} alignItems="stretch" py={1}>
        <Box sx={{ flex: 1, display: 'flex' }}>
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<Iconify icon="mdi:cash-plus" />}
            onClick={openBuyDialog}
            disabled={mgiBusy}
            sx={{ borderRadius: 2, height: '100%', textTransform: 'none' }}
          >
            Buy crypto with fiat
          </Button>
        </Box>

        <Box sx={{ flex: 1, display: 'flex' }}>
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            size="large"
            startIcon={<Iconify icon="mdi:cash-minus" />}
            onClick={openWithdrawDialog}
            disabled={mgiBusy}
            sx={{ borderRadius: 2, height: '100%', textTransform: 'none' }}
          >
            Withdraw to cash
          </Button>
        </Box>
      </Stack>

      {/* Deposit dialog */}
      <AmountDialog
        open={buyDialogOpen}
        onCancel={closeBuyDialog}
        onConfirm={async (val) => {
          closeBuyDialog();
          await startMgi('deposit', address, val);
        }}
        defaultAmount=""
        min={1}
        max={900}
      />

      {/* Withdraw dialog */}
      <AmountDialog
        open={withdrawDialogOpen}
        onCancel={closeWithdrawDialog}
        onConfirm={async (val) => {
          closeWithdrawDialog();
          await startMgi('withdraw', address, val);
        }}
        defaultAmount=""
        min={1}
        max={900}
      />
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
      {tabs.value === 'tokens' && <TokensTab tokens={tokens?.filter((tkn) => tkn.balance > 0)} />}
      {tabs.value === 'positions' && (
        <PositioinsTab
          positions={positions ?? []}
          xlmPrice={BigNumber(tokens?.find((tkn) => tkn.symbol === 'XLM')?.usdValue || 0)}
        />
      )}
      {tabs.value === 'activity' && <ActivityTab activity={activity} />}

      <ReceiveModal
        open={showReceiveModal}
        onClose={() => {
          // trackEvent('button_clicked', {
          //   label: 'Learn more',
          //   location: 'Home',
          // });
          setShowReceiveModal(false);
        }}
      />
    </Stack>
  );
}
