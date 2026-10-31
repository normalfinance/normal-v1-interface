'use client';

import { useTranslate } from '@/locales';
import { useTabs } from 'minimal-shared/hooks';
import { DashboardContent } from '@/layouts/dashboard';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { AppPageHeader, SegmentedControl } from '@/components/_common/brand';

import { SettingsGeneral } from '../settings-general';
import { SettingsAccounts } from '../settings-accounts';
import { SettingsSecurity } from '../settings-security';
import { DeleteAccountCard } from '../delete-account-card';

// ----------------------------------------------------------------------

const TABS = [
  { value: 'general', label: 'General', icon: <PersonOutlinedIcon sx={{ fontSize: 17 }} /> },
  {
    value: 'accounts',
    label: 'Accounts',
    icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 17 }} />,
  },
  { value: 'security', label: 'Security', icon: <LockOutlinedIcon sx={{ fontSize: 17 }} /> },
];

export function UserSettingsView() {
  const { t } = useTranslate();
  const tabs = useTabs('general');

  return (
    <DashboardContent>
      <AppPageHeader
        title={t('Settings')}
        subtitle={t('Manage your account, wallets and security preferences.')}
      />

      <SegmentedControl
        value={tabs.value as string}
        onChange={(value) => tabs.onChange(null as any, value)}
        options={TABS.map((tab) => ({ value: tab.value, label: t(tab.label), icon: tab.icon }))}
        sx={{ mb: 3 }}
      />

      {/* Tab content */}
      {tabs.value === 'general' && <SettingsGeneral />}
      {tabs.value === 'accounts' && <SettingsAccounts />}
      {tabs.value === 'security' && (
        <>
          <SettingsSecurity />
          <DeleteAccountCard />
        </>
      )}
    </DashboardContent>
  );
}
