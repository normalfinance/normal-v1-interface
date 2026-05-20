'use client';

import type { Activity } from '@/types/activity';
import type { Token } from '@normalfinance/types';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useRouter } from 'next/navigation';
import { useTabs } from 'minimal-shared/hooks';
import { ModalType } from '@normalfinance/types';
import { useAppStore } from '@normalfinance/state';
import { fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from '@/components/template/iconify';
import ReceiveModal from '@/components/_common/receive-modal';

import TokensTab from './tokens-tab';
import ActivityTab from './activity-tab';

// ----------------------------------------------------------------------
type ActionChooserOption = {
  label: string;
  icon: string;
  onClick: () => void;
};

type ActionChooserDialogProps = {
  open: boolean;
  title: string;
  actions: ActionChooserOption[];
  onClose: () => void;
};

function ActionChooserDialog({ open, title, actions, onClose }: ActionChooserDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 1 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} aria-label="close dialog">
            <Iconify icon="mingcute:close-line" width={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2, pt: 1.5 }}>
        <Stack spacing={1}>
          {actions.map((action) => (
            <Button
              key={action.label}
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={action.onClick}
              startIcon={<Iconify icon={action.icon} width={20} />}
              sx={{ justifyContent: 'flex-start', py: 1.5, px: 2, textTransform: 'none' }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

export interface ConnectedWalletProps {
  address: string;
  balance?: number;
  savingsValue?: number;
  savingsFetching?: boolean;
  percentageChange?: number;
  tokens?: Token[];
  activity?: Activity[];
}

export default function ConnectedWallet({
  address: _address,
  balance = 0,
  savingsValue = 0,
  savingsFetching = false,
  percentageChange,
  tokens,
  activity,
}: ConnectedWalletProps) {
  const { t } = useTranslate();
  const router = useRouter();
  const { setModalView } = useAppStore();
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [receiveContext, setReceiveContext] = useState<'deposit' | 'receive' | null>(null);

  const openReceiveModal = (context: 'deposit' | 'receive') => {
    setTransferDialogOpen(false);
    setDepositDialogOpen(false);
    setReceiveContext(context);
  };

  const openSendModal = () => {
    setTransferDialogOpen(false);
    setModalView(ModalType.SEND_CRYPTO, true);
  };

  const openDepositCashModal = () => {
    setDepositDialogOpen(false);
    setModalView(ModalType.ON_RAMP, true);
  };

  const actionButtons = [
    {
      label: t('Transfer'),
      icon: 'solar:transfer-horizontal-bold-duotone',
      onClick: () => setTransferDialogOpen(true),
    },
    {
      label: t('Deposit'),
      icon: 'solar:wad-of-money-bold',
      onClick: () => setDepositDialogOpen(true),
    },
    {
      label: t('Savings'),
      icon: 'mingcute:safe-box-line',
      onClick: () => {
        router.push(paths.savings);
      },
    },
    {
      label: t('Swap'),
      icon: 'solar:transfer-vertical-bold',
      onClick: () => {
        router.push(paths.swap);
      },
    },
  ];

  const transferActions: ActionChooserOption[] = [
    {
      label: t('Send'),
      icon: 'solar:upload-bold-duotone',
      onClick: openSendModal,
    },
    {
      label: t('Receive'),
      icon: 'solar:download-bold-duotone',
      onClick: () => openReceiveModal('receive'),
    },
  ];

  const depositActions: ActionChooserOption[] = [
    {
      label: t('Deposit cash'),
      icon: 'solar:wad-of-money-bold',
      onClick: openDepositCashModal,
    },
    {
      label: t('Deposit crypto'),
      icon: 'solar:wallet-bold',
      onClick: () => openReceiveModal('deposit'),
    },
  ];

  const tabs = useTabs('assets');

  const TAB_ITEMS = [
    { value: 'assets', label: t('Assets') },
    { value: 'activity', label: t('Activity') },
  ] as const;

  return (
    <Stack spacing={2} sx={{ width: 1 }} mt={2}>
      <Box
        sx={{
          width: 1,
          borderRadius: '16px',
          border: '1px solid rgba(10,10,15,0.08)',
          bgcolor: '#fff',
          p: '4px 4px 12px',
        }}
      >
        {/* Total row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: '14px', pt: '12px', pb: '12px' }}>
          <Typography sx={{ fontSize: '14px', color: '#2A2A33', fontWeight: 500 }}>
            {t('Total balance')}
          </Typography>
          {savingsFetching ? (
            <Skeleton variant="text" width={80} height={28} />
          ) : (
            <Typography sx={{ fontSize: '22px', fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.02em', fontFamily: '"Geist Mono", ui-monospace, monospace', fontFeatureSettings: '"ss01","ss02","zero"', fontVariantNumeric: 'tabular-nums' }}>
              {fCurrencyTwoDecimals(balance + savingsValue)}
            </Typography>
          )}
        </Stack>

        <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mx: '14px' }} />

        {/* Assets row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: '14px', py: '12px' }}>
          <Typography sx={{ fontSize: '13.5px', color: '#6B6B76' }}>
            {t('Assets')}
          </Typography>
          <Typography sx={{ fontSize: '15px', fontWeight: 400, fontFamily: '"Geist Mono", ui-monospace, monospace', fontFeatureSettings: '"ss01","ss02","zero"', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
            {fCurrencyTwoDecimals(balance)}
          </Typography>
        </Stack>

        <Box sx={{ height: '1px', bgcolor: 'rgba(10,10,15,0.06)', mx: '14px' }} />

        {/* Savings row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: '14px', py: '12px' }}>
          <Typography sx={{ fontSize: '13.5px', color: '#6B6B76' }}>
            {t('Savings')}
          </Typography>
          {savingsFetching ? (
            <Skeleton variant="text" width={60} height={24} />
          ) : (
            <Typography sx={{ fontSize: '15px', fontWeight: 400, fontFamily: '"Geist Mono", ui-monospace, monospace', fontFeatureSettings: '"ss01","ss02","zero"', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {fCurrencyTwoDecimals(savingsValue)}
            </Typography>
          )}
        </Stack>

        {/* Action buttons — 4-column grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', mt: '12px', mx: '8px' }}>
          {actionButtons.map((btn) => (
            <Box
              key={btn.label}
              component="button"
              onClick={btn.onClick}
              sx={{
                appearance: 'none',
                border: '1px solid rgba(10,10,15,0.08)',
                borderRadius: '12px',
                padding: '12px 6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#6B6B76',
                background: 'transparent',
                transition: 'all .15s ease',
                '&:hover': { bgcolor: 'rgba(10,10,15,0.03)', color: '#0A0A0F', borderColor: 'rgba(10,10,15,0.14)' },
                '&:hover .action-icon-box': { bgcolor: '#0A0A0F', color: '#fff' },
              }}
            >
              <Box
                className="action-icon-box"
                sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#F4F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0F', transition: 'all .15s ease' }}
              >
                <Iconify icon={btn.icon} width={14} />
              </Box>
              {btn.label}
            </Box>
          ))}
        </Box>
      </Box>

      <ActionChooserDialog
        open={transferDialogOpen}
        title={t('Transfer')}
        actions={transferActions}
        onClose={() => setTransferDialogOpen(false)}
      />

      <ActionChooserDialog
        open={depositDialogOpen}
        title={t('Deposit')}
        actions={depositActions}
        onClose={() => setDepositDialogOpen(false)}
      />

      <ReceiveModal
        open={!!receiveContext}
        context={receiveContext ?? 'deposit'}
        onClose={() => setReceiveContext(null)}
      />

      <Tabs
        value={tabs.value}
        onChange={tabs.onChange}
        variant="standard"
        sx={{
          mt: 2,
          minHeight: 0,
          borderBottom: '1px solid rgba(10,10,15,0.08)',
          '& .MuiTabs-flexContainer': { gap: '4px', padding: 0 },
          '& .MuiTab-root': {
            fontSize: '13.5px',
            fontWeight: 500,
            color: '#6B6B76',
            padding: '10px 14px',
            minHeight: 0,
            textTransform: 'none',
            transition: 'color .15s ease',
          },
          '& .MuiTab-root.Mui-selected': { color: '#0A0A0F' },
          '& .MuiTabs-indicator': {
            height: '2px',
            backgroundColor: '#0A0A0F',
            boxShadow: 'none !important',
          },
        }}
      >
        {TAB_ITEMS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
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
