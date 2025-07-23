'use client';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { usePersistStore } from '@normalfinance/state';
import { useBufferEvents, useInsuranceFundEvents } from '@/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import { CardHeader } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import { BufferEventsTableCard } from './buffer-events-table-card';
import { InsuranceFundEventsTableCard } from './insurance-fund-events-table-card';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    value: 'insurance',
    label: 'Insurance Fund',
    icon: <Iconify width={24} icon="solar:ticket-sale-bold" />,
  },
  {
    value: 'buffer',
    label: 'Buffer',
    icon: <Iconify width={24} icon="solar:align-vertical-spacing-bold" />,
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

  const { events: bufferEvents } = useBufferEvents();
  const { events: insuranceFundEvents } = useInsuranceFundEvents();

  const store = usePersistStore();

  const [selectedTab, setSelectedTab] = useState('insurance');

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  const userEvents = store.wallet.address
    ? insuranceFundEvents.filter((e) => e.user === store.wallet.address)
    : [];

  return (
    <Card sx={{ mb: 3, height: 'auto' }} data-testid="insurance-actions-table">
      <CardHeader title={t('Recent events')} sx={{ mb: 2 }} />
      <Box
        sx={{
          width: 1,
          zIndex: 9,
          px: { md: 3 },
          display: 'flex',
          bgcolor: 'background.paper',
          justifyContent: { xs: 'center', md: 'flex-start' },
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
      {selectedTab === 'buffer' && <BufferEventsTableCard events={bufferEvents} />}
      {selectedTab === 'user' && <InsuranceFundEventsTableCard events={userEvents} />}
    </Card>
  );
}
