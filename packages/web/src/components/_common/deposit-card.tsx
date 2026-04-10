import type { CardProps } from '@mui/material';

import React from 'react';
import { useTranslate } from '@/locales';
import { ModalType } from '@normalfinance/types';
import { useAppStore } from '@normalfinance/state';

import { Box, Button } from '@mui/material';

import { WalletGate } from './wallet-gate';
import { Iconify } from '../template/iconify';

interface DepositCardProps extends CardProps {}

const DepositCard: React.FC<DepositCardProps> = ({ ...other }) => {
  const { t } = useTranslate();

  const { setModalView } = useAppStore();

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: 2,
      }}
    >
      <WalletGate
        buttonText="Login to deposit cash"
        fullWidth
        variant="soft"
        requireWalletConnection={false}
      >
        <Button
          variant="soft"
          color="success"
          fullWidth
          size="large"
          startIcon={<Iconify icon="solar:wad-of-money-bold" />}
          onClick={() => setModalView(ModalType.ON_RAMP, true)}
        >
          {t('Deposit cash')}
        </Button>
      </WalletGate>

      <WalletGate buttonText="Login to deposit crypto" fullWidth variant="soft">
        <Button
          variant="soft"
          color="primary"
          fullWidth
          size="large"
          startIcon={<Iconify icon="solar:wallet-bold" />}
          onClick={() => setModalView(ModalType.DEPOSIT_CRYPTO, true)}
        >
          {t('Deposit crypto')}
        </Button>
      </WalletGate>
    </Box>
  );
};

export default DepositCard;
