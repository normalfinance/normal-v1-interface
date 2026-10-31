'use client';

import { useTranslate } from '@/locales';
import { ModalType } from '@normalfinance/types';
import { useAppStore } from '@normalfinance/state';
import { useAssetActionsContext } from '@/providers/AssetActionsProvider';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { WalletGate } from '@/components/_common/wallet-gate';

function OnrampButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        p: '14px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FFFFFF',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
        '&:hover': {
          borderColor: 'rgba(10,10,15,0.14)',
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 'var(--radius-md)',
          bgcolor: '#F4F4F7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: '14px', fontWeight: 500, color: '#0A0A0F', lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: '12px', color: '#6B6B76', mt: '2px' }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ ml: 'auto', color: 'rgba(10,10,15,0.25)', fontSize: '18px', flexShrink: 0 }}>
        →
      </Box>
    </Box>
  );
}

export function SavingsOnrampCard() {
  const { t } = useTranslate();
  const { setModalView } = useAppStore();
  const { startAction } = useAssetActionsContext();

  return (
    <Box
      sx={{
        p: { xs: '20px', md: '24px' },
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(10,10,15,0.08)',
        bgcolor: '#FFFFFF',
      }}
    >
      <Typography sx={{ fontSize: '15px', fontWeight: 500, color: '#0A0A0F', mb: '4px' }}>
        {t('Need USDC?')}
      </Typography>
      <Typography sx={{ fontSize: '13px', color: '#6B6B76', mb: '16px' }}>
        {t('Add funds to start earning.')}
      </Typography>

      <Stack spacing={1.5}>
        <WalletGate
          buttonText={t('Login to deposit cash')}
          fullWidth
          variant="soft"
          requireWalletConnection={false}
        >
          <OnrampButton
            icon={<AccountBalanceOutlinedIcon sx={{ fontSize: 20, color: '#0A0A0F' }} />}
            label={t('Deposit cash')}
            description={t('Bank transfer or card via MoneyGram')}
            onClick={() => setModalView(ModalType.ON_RAMP, true)}
          />
        </WalletGate>

        <WalletGate buttonText={t('Login to deposit crypto')} fullWidth variant="soft">
          <OnrampButton
            icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20, color: '#0A0A0F' }} />}
            label={t('Deposit crypto')}
            description={t('Send from any external wallet')}
            onClick={() => startAction('receive')}
          />
        </WalletGate>
      </Stack>
    </Box>
  );
}
