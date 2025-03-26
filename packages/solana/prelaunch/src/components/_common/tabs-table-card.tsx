'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';

import { DashboardContent } from 'src/layouts/dashboard';
import { Iconify } from 'src/components/iconify';

import { SelectTableCard } from './select-table-card';
import { SelectTableTmpCard } from './select-table-tmp-card';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  { value: 'profile', label: 'Profile', icon: <Iconify width={24} icon="solar:user-id-bold" /> },
  { value: 'followers', label: 'Followers', icon: <Iconify width={24} icon="solar:heart-bold" /> },
  {
    value: 'friends',
    label: 'Friends',
    icon: <Iconify width={24} icon="solar:users-group-rounded-bold" />,
  },
  {
    value: 'gallery',
    label: 'Gallery',
    icon: <Iconify width={24} icon="solar:gallery-wide-bold" />,
  },
];

// ----------------------------------------------------------------------

export function TabsTable() {
  const [selectedTab, setSelectedTab] = useState('profile'); // Default to first tab

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

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
        {selectedTab === 'profile' && <SelectTableCard />}
        {selectedTab === 'followers' && <SelectTableTmpCard />}
        {selectedTab === 'friends' && <SelectTableCard />}
        {selectedTab === 'gallery' && <SelectTableCard />}
      </Card>
    </DashboardContent>
  );
}
