'use client';

import { useState, useEffect } from 'react';
import { DashboardContent } from '@/layouts/dashboard';
import { usePersistStore } from '@normalfinance/state';
import { constants, fetchInsuranceEvents } from '@normalfinance/utils';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { Iconify } from '@/components/template/iconify';

import { BufferEventsTableCard } from './buffer-events-table-card';
import { InsuranceFundEventsTableCard } from './insurance-fund-events-table-card';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    value: 'insurance',
    label: 'Insurance Events',
    icon: <Iconify width={24} icon="solar:ticket-sale-bold" />,
  },
  {
    value: 'buffer',
    label: 'Buffer Events',
    icon: <Iconify width={24} icon="solar:align-vertical-spacing-bold" />,
  },
  {
    value: 'user',
    label: 'Your Events',
    icon: <Iconify width={24} icon="solar:user-bold" />,
  },
];

// ----------------------------------------------------------------------

export type InsuranceFundEvent = {
  ts: number;
  user: string;
  action: string;
  amount: number;
  insurance_vault_amount_before: number;
  if_shares_before: number;
  total_if_shares_before: number;
  if_shares_after: number;
  total_if_shares_after: number;
};

export type BufferEvent = {
  ts: number;
  user: string;
  type: string;
  amount: number;
  token: string;
};

export function InsuranceActionsTable() {
  const store = usePersistStore();

  const [selectedTab, setSelectedTab] = useState('insurance'); // Default to first tab
  const [ifEvents, setIfEvents] = useState<InsuranceFundEvent[] | undefined>(undefined);
  const [bufferEvents, setBufferEvents] = useState<BufferEvent[] | undefined>(undefined);

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  useEffect(() => {
    async function fetchData() {
      // Historical txs
      const { insuranceFund, buffer } = await fetchInsuranceEvents(
        constants.INSURANCE_FUND_ADDRESS,
        constants.BUFFER_ADDRESS
      );
      setIfEvents(insuranceFund);
      setBufferEvents(buffer);
    }

    fetchData();
  }, [fetchInsuranceEvents]);

  const userEvents = ifEvents && ifEvents.filter((e) => e.user === store.wallet.address);

  return (
    <DashboardContent>
      <Card sx={{ mb: 3, height: 'auto' }}>
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
          <Tabs value={selectedTab} onChange={handleChangeTab}>
            {NAV_ITEMS.map((tab) => (
              <Tab key={tab.value} value={tab.value} icon={tab.icon} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        {/* Render the correct component based on the selected tab */}
        {selectedTab === 'insurance' && <InsuranceFundEventsTableCard events={ifEvents} />}
        {selectedTab === 'buffer' && <BufferEventsTableCard events={bufferEvents} />}
        {selectedTab === 'user' && <InsuranceFundEventsTableCard events={userEvents} />}
      </Card>
    </DashboardContent>
  );
}
