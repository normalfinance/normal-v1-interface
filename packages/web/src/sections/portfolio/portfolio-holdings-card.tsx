'use client';

import type { ReactNode } from 'react';

import { useState } from 'react';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { useRouter } from 'next/navigation';
import { ModalType } from '@normalfinance/types';
import { fCurrency } from '@/utils/format-number';
import { useAppStore } from '@normalfinance/state';
import { getCryptoIconUrl } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import SyncAltOutlined from '@mui/icons-material/SyncAltOutlined';
import SavingsOutlined from '@mui/icons-material/SavingsOutlined';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';
import CallMadeOutlined from '@mui/icons-material/CallMadeOutlined';
import AttachMoneyOutlined from '@mui/icons-material/AttachMoneyOutlined';
import CallReceivedOutlined from '@mui/icons-material/CallReceivedOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';

import ReceiveModal from '@/components/_common/receive-modal';
import { ReceiveAssetPicker } from '@/components/_common/receive-asset-picker';
import { NetworkBadge, getAssetNetwork } from '@/components/_common/network-badge';

import { MONO, CARD_SX, getHoldingColor } from './_shared';

import type { HoldingData } from './_shared';

// ----------------------------------------------------------------------
const HOLDINGS_COLS = 'minmax(0,1.8fr) 1fr 1fr 1fr 1fr';

const COL_HEADER_SX = {
  fontSize: '11px',
  fontWeight: 500,
  color: 'rgba(10,10,15,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
};

type ActionChooserOption = { label: string; icon: ReactNode; onClick: () => void };

function ActionChooserDialog({
  open,
  title,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  actions: ActionChooserOption[];
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 2, p: 1 } } }}
    >
      <DialogTitle sx={{ p: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose} aria-label="close dialog">
            <CloseOutlined sx={{ fontSize: 20 }} />
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
              startIcon={action.icon}
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

// ----------------------------------------------------------------------
interface HoldingsCardProps {
  holdingsData: HoldingData[];
  totalBalance: number;
  onBtcReceive?: () => void;
  hasBitcoinWallet?: boolean;
}

export function HoldingsCard({ holdingsData, totalBalance, onBtcReceive, hasBitcoinWallet }: HoldingsCardProps) {
  const { t } = useTranslate();
  const router = useRouter();
  const { setModalView } = useAppStore();

  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [receiveContext, setReceiveContext] = useState<'deposit' | 'receive' | null>(null);
  const [receivePickerOpen, setReceivePickerOpen] = useState(false);
  const [pendingReceiveContext, setPendingReceiveContext] = useState<'deposit' | 'receive'>('receive');

  const openReceiveModal = (context: 'deposit' | 'receive') => {
    setTransferDialogOpen(false);
    setDepositDialogOpen(false);
    if (hasBitcoinWallet) {
      setPendingReceiveContext(context);
      setReceivePickerOpen(true);
    } else {
      setReceiveContext(context);
    }
  };

  const handlePickerSelectStellar = () => {
    setReceivePickerOpen(false);
    setReceiveContext(pendingReceiveContext);
  };

  const handlePickerSelectBitcoin = () => {
    setReceivePickerOpen(false);
    onBtcReceive?.();
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
    { label: t('Transfer'), icon: <SyncAltOutlined sx={{ fontSize: 14 }} />, onClick: () => setTransferDialogOpen(true) },
    { label: t('Deposit'), icon: <AddOutlined sx={{ fontSize: 14 }} />, onClick: () => setDepositDialogOpen(true) },
    { label: t('Savings'), icon: <SavingsOutlined sx={{ fontSize: 14 }} />, onClick: () => router.push(paths.savings) },
    { label: t('Swap'), icon: <SwapVertOutlined sx={{ fontSize: 14 }} />, onClick: () => router.push(paths.swap) },
  ];

  const transferActions: ActionChooserOption[] = [
    { label: t('Send'), icon: <CallMadeOutlined sx={{ fontSize: 20 }} />, onClick: openSendModal },
    { label: t('Receive'), icon: <CallReceivedOutlined sx={{ fontSize: 20 }} />, onClick: () => openReceiveModal('receive') },
  ];

  const depositActions: ActionChooserOption[] = [
    { label: t('Deposit cash'), icon: <AttachMoneyOutlined sx={{ fontSize: 20 }} />, onClick: openDepositCashModal },
    { label: t('Deposit crypto'), icon: <AccountBalanceWalletOutlined sx={{ fontSize: 20 }} />, onClick: () => openReceiveModal('deposit') },
  ];

  return (
    <>
      <Box sx={{ ...CARD_SX, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ mb: '20px' }}>
          <Box sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', mb: '14px' }}>
            {t('Holdings')}
          </Box>

          {/* Action buttons */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {actionButtons.map((btn) => (
              <Box
                key={btn.label}
                component="button"
                onClick={btn.onClick}
                sx={{
                  appearance: 'none',
                  border: '1px solid rgba(10,10,15,0.08)',
                  borderRadius: '12px',
                  padding: '10px 6px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '7px',
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
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    bgcolor: '#F4F4F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0A0A0F',
                    transition: 'all .15s ease',
                  }}
                >
                  {btn.icon}
                </Box>
                {btn.label}
              </Box>
            ))}
          </Box>
        </Box>

        {holdingsData.length === 0 ? (
          <Box sx={{ color: 'rgba(10,10,15,0.4)', fontSize: '14px', py: '24px' }}>
            {t('No holdings yet')}
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 520 }}>
              {/* Column headers */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: HOLDINGS_COLS,
                  px: '8px',
                  pb: '10px',
                  mb: '2px',
                  borderBottom: '1px solid rgba(10,10,15,0.06)',
                  gap: '12px',
                }}
              >
                <Box sx={COL_HEADER_SX}>{t('Asset')}</Box>
                <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Balance')}</Box>
                <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Price')}</Box>
                <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Value')}</Box>
                <Box sx={{ ...COL_HEADER_SX, textAlign: 'right' }}>{t('Allocation')}</Box>
              </Box>

              {/* Rows */}
              {holdingsData.map((h, i) => {
                const pct =
                  totalBalance > 0
                    ? BigNumber(h.value).dividedBy(totalBalance).multipliedBy(100).toFixed(1)
                    : '0.0';
                const balanceDisplay = BigNumber(h.token.balance).toFixed(
                  h.token.decimals > 4 ? 4 : h.token.decimals
                );
                const color = getHoldingColor(h.token, i);

                const isSavings = h.token.contract === '__savings__';
                const handleRowClick = isSavings
                  ? () => router.push(paths.savings)
                  : () => router.push(paths.assets.details(h.token.symbol));

                return (
                  <Box
                    key={h.token.contract}
                    onClick={handleRowClick}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: HOLDINGS_COLS,
                      alignItems: 'center',
                      gap: '12px',
                      px: '8px',
                      py: '13px',
                      borderBottom: '1px solid rgba(10,10,15,0.05)',
                      cursor: 'pointer',
                      '&:last-child': { borderBottom: 'none' },
                      '&:hover': { bgcolor: 'rgba(10,10,15,0.02)', borderRadius: '10px' },
                    }}
                  >
                    {/* Asset */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                      <Avatar
                        src={h.token.icon || getCryptoIconUrl(h.token.symbol)}
                        alt={h.token.symbol}
                        sx={{ width: 34, height: 34, flexShrink: 0 }}
                      />
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Box sx={{ fontSize: '14px', fontWeight: 400, color: '#0A0A0F', lineHeight: 1.3 }}>
                            {h.token.symbol}
                          </Box>
                          {!isSavings && <NetworkBadge network={getAssetNetwork(h.token)} />}
                        </Box>
                        <Box sx={{ fontSize: '12px', color: 'rgba(10,10,15,0.4)', lineHeight: 1.3 }}>
                          {h.token.name}
                        </Box>
                      </Box>
                    </Box>

                    {/* Balance */}
                    <Box sx={{ ...MONO, fontSize: '13px', fontWeight: 400, color: '#0A0A0F', textAlign: 'right' }}>
                      {balanceDisplay}
                    </Box>

                    {/* Price */}
                    <Box sx={{ ...MONO, fontSize: '13px', fontWeight: 400, color: 'rgba(10,10,15,0.6)', textAlign: 'right' }}>
                      {fCurrency(h.token.price)}
                    </Box>

                    {/* Value */}
                    <Box sx={{ ...MONO, fontSize: '13px', fontWeight: 400, color: '#0A0A0F', textAlign: 'right' }}>
                      {fCurrency(h.value)}
                    </Box>

                    {/* Allocation % + bar */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                      <Box sx={{ ...MONO, fontSize: '13px', fontWeight: 400, color: 'rgba(10,10,15,0.6)' }}>
                        {pct}%
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          maxWidth: '72px',
                          height: '3px',
                          bgcolor: 'rgba(10,10,15,0.07)',
                          borderRadius: '99px',
                          overflow: 'hidden',
                        }}
                      >
                        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, borderRadius: '99px' }} />
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
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

      <ReceiveAssetPicker
        open={receivePickerOpen}
        onClose={() => setReceivePickerOpen(false)}
        onSelectStellar={handlePickerSelectStellar}
        onSelectBitcoin={handlePickerSelectBitcoin}
      />
    </>
  );
}
