'use client';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { useTabs } from 'minimal-shared/hooks';
import { DashboardContent } from '@/layouts/dashboard';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { AppPageHeader, SegmentedControl } from '@/components/_common/brand';

import { TwoFactorCard } from '../two-factor-card';
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
  const { setValue: setTab } = tabs;

  // Read directly: useSearchParams would need a Suspense boundary around the page.
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some(({ value }) => value === tab)) setTab(tab as string);
  }, [setTab]);

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
          <TwoFactorCard />
          <DeleteAccountCard />
        </>
      )}
    </DashboardContent>
  );
}
