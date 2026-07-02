'use client';

import { useTranslate } from '@/locales';
import { useTabs } from 'minimal-shared/hooks';
import { DashboardContent } from '@/layouts/dashboard';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { SettingsGeneral } from '../settings-general';
import { SettingsAccounts } from '../settings-accounts';
import { SettingsSecurity } from '../settings-security';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'general', label: 'General', icon: <PersonOutlinedIcon sx={{ fontSize: 17 }} /> },
  { value: 'accounts', label: 'Accounts', icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 17 }} /> },
  { value: 'security', label: 'Security', icon: <LockOutlinedIcon sx={{ fontSize: 17 }} /> },
];

export function UserSettingsView() {
  const { t } = useTranslate();
  const tabs = useTabs('general');

  return (
    <DashboardContent maxWidth="xl">
      {/* Page title */}
      <Stack spacing={0.5} sx={{ mb: '24px' }}>
        <Typography sx={{ fontSize: '22px', fontWeight: 700, color: '#0A0A0F', letterSpacing: '-0.02em' }}>
          {t('Settings')}
        </Typography>
        <Typography sx={{ fontSize: '14px', color: 'rgba(10,10,15,0.5)' }}>
          {t('Manage your account, wallets and security preferences.')}
        </Typography>
      </Stack>

      {/* Pill tab bar */}
      <Box
        sx={{
          display: 'inline-flex',
          gap: '4px',
          p: '4px',
          borderRadius: '12px',
          bgcolor: '#F4F4F7',
          mb: '24px',
        }}
      >
        {TABS.map((tab) => (
          <Box
            key={tab.value}
            component="button"
            onClick={() => tabs.onChange(null as any, tab.value)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              px: '16px',
              py: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: tabs.value === tab.value ? 600 : 500,
              bgcolor: tabs.value === tab.value ? '#FFFFFF' : 'transparent',
              color: tabs.value === tab.value ? '#0A0A0F' : 'rgba(10,10,15,0.5)',
              boxShadow: tabs.value === tab.value ? '0 1px 3px rgba(10,10,15,0.1)' : 'none',
              transition: 'all 150ms ease',
            }}
          >
            {tab.icon}
            {t(tab.label)}
          </Box>
        ))}
      </Box>

      {/* Tab content */}
      {tabs.value === 'general' && <SettingsGeneral />}
      {tabs.value === 'accounts' && <SettingsAccounts />}
      {tabs.value === 'security' && <SettingsSecurity />}
    </DashboardContent>
  );
}
