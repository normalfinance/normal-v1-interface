'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { useTabs } from 'minimal-shared/hooks';
import { DashboardContent } from '@/layouts/dashboard';
import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { paths } from '@/routes/paths';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { CustomTabs } from '@/components/template/custom-tabs';

import { Iconify } from '@/components/template/iconify';

import { SettingsGeneral } from '../settings-general';
import { SettingsWallets } from '../settings-wallets';
import { SettingsSecurity } from '../settings-security';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'general',
    label: 'General',
    icon: <Iconify width={24} icon="solar:user-id-bold" />,
  },
  {
    value: 'wallets',
    label: 'Wallets',
    icon: <Iconify width={24} icon="solar:wallet-bold" />,
  },
  {
    value: 'security',
    label: 'Security',
    icon: <Iconify width={24} icon="ic:round-vpn-key" />,
  },
];

export function UserSettingsView() {
  const { t } = useTranslate();
  const tabs = useTabs('general');

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100dvh' }}>
      <DashboardContent maxWidth="xl">
        <CustomBreadcrumbs
          heading={t('Settings')}
          links={[{ name: t('Home'), href: paths.root }, { name: t('Settings') }]}
          sx={{ mb: 3 }}
        />

        <Card>
          <CustomTabs value={tabs.value} onChange={tabs.onChange} sx={{ mb: 3 }}>
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </CustomTabs>

          <Box sx={{ p: 3 }}>
            {tabs.value === 'general' && <SettingsGeneral />}
            {tabs.value === 'wallets' && <SettingsWallets />}
            {tabs.value === 'security' && <SettingsSecurity />}
          </Box>
        </Card>
      </DashboardContent>
    </Box>
  );
}
