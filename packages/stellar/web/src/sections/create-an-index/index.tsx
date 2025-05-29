'use client';

import Grid2 from '@mui/material/Grid2';
import { DashboardContent } from '@/layouts/dashboard';
import { Stack, Typography } from '@mui/material';
import { NewIndexForm } from '@normalfinance/ui/src';
import { IndexCoin } from '@/types/indexes';

export default function CreateAnIndexView() {
  // Example data for available coins
  const availableCoins: IndexCoin[] = [
    {
      id: 1,
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Bitcoin.svg',
      name: 'Bitcoin',
      shortName: 'BTC',
      price: 83138.18,
      marketCap: 1645860388284.49,
    },
    {
      id: 2,
      url: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg',
      name: 'Ethereum',
      shortName: 'ETH',
      price: 2125.67,
      marketCap: 255750237413.69,
    },
    {
      id: 3,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/74.png',
      name: 'Dogecoin',
      shortName: 'DOGE',
      price: 0.1683,
      marketCap: 24968320305.07,
    },
    {
      id: 4,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/52.png',
      name: 'XRP',
      shortName: 'XRP',
      price: 2.12,
      marketCap: 123450670499.25,
    },
    {
      id: 5,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1974.png',
      name: 'Propy',
      shortName: 'PRO',
      price: 0.8076,
      marketCap: 80765439.01,
    },
    {
      id: 6,
      url: 'https://s2.coinmarketcap.com/static/img/coins/64x64/21159.png',
      name: 'Ondo',
      shortName: 'ONDO',
      price: 0.822,
      marketCap: 2588249971.72,
    },
  ];

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={1}>
        <Typography variant="h4" color="text.primary">
          Create a Crypto Index
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Automate or diversify your crypto investing by creating a custom crypto index token.
        </Typography>
      </Stack>
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 8, lg: 7 }}>
          {/* Pass the native token symbol here */}
          <NewIndexForm tokenSymbol="SOL" availableCoins={availableCoins} />
        </Grid2>
        <Grid2 size={{ xs: 12, md: 4 }}></Grid2>
      </Grid2>
    </DashboardContent>
  );
}
