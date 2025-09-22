'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { useInsuranceFundEvents } from '@/hooks';
import { usePersistStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import { CardHeader, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/template/iconify';

import { InsuranceFundEventsTableCard } from './insurance-fund-events-table-card';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    value: 'insurance',
    label: 'Insurance Fund',
    icon: <Iconify width={24} icon="solar:ticket-sale-bold" />,
  },
  {
    value: 'user',
    label: 'You',
    icon: <Iconify width={24} icon="solar:user-bold" />,
  },
];

// ----------------------------------------------------------------------

export function InsuranceActionsTable() {
  const { t } = useTranslate();
  const theme = useTheme();

  const { events: insuranceFundEvents } = useInsuranceFundEvents(10);

  const store = usePersistStore();

  const [selectedTab, setSelectedTab] = useState('insurance');

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    // trackEvent('button_clicked', {
    //   label: 'Insurnace - Recent events - Tab',
    //   location: 'Insurnace',
    // });
    setSelectedTab(newValue);
  };

  const userEvents = store.wallet.address
    ? insuranceFundEvents.filter((e) => e.user === store.wallet.address)
    : [];

  return (
    <Card
      sx={{
        mb: 3,
        height: 'auto',
        borderRadius: 3,
        border: 1,
        borderColor: alpha(theme.palette.grey[500], 0.32),
      }}
      data-testid="insurance-actions-table"
    >
      <CardHeader
        sx={{ mb: 2 }}
        title={
          <Typography variant="h5" sx={{ fontSize: 20 }}>
            {t('Recent events')}
          </Typography>
        }
      />
      <Box
        sx={{
          width: 1,
          zIndex: 9,
          px: 3,
          display: 'flex',
          bgcolor: 'background.paper',
          justifyContent: 'flex-start',
        }}
      >
        <Tabs value={t(selectedTab)} onChange={handleChangeTab}>
          {NAV_ITEMS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              icon={tab.icon}
              label={tab.label}
              data-testid={`insurance-actions-tab-${tab.value}`}
            />
          ))}
        </Tabs>
      </Box>
      {/* Render the correct component based on the selected tab */}
      {selectedTab === 'insurance' && <InsuranceFundEventsTableCard events={insuranceFundEvents} />}
      {selectedTab === 'user' && <InsuranceFundEventsTableCard events={userEvents} />}
    </Card>
  );
}
