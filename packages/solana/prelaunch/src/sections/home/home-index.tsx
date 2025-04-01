import type { IndexCoin } from '@/types/indexes';
import type { BoxProps } from '@mui/material/Box';

import { MotionViewport } from '@/components/animate';
import { NewIndexForm } from '@/components/_common/new-index-form';

import Box from '@mui/material/Box';
import { Grid2, Stack } from '@mui/material';
import Container from '@mui/material/Container';

import { SectionTitle } from './components/section-title';
import { FloatLine, FloatTriangleDownIcon } from './components/svg-elements';

// ----------------------------------------------------------------------


const renderLines = () => (
  <>
    <Stack
      spacing={8}
      alignItems="center"
      sx={{
        top: 64,
        left: 80,
        position: 'absolute',
        transform: 'translateX(-50%)',
      }}
    >
      <FloatTriangleDownIcon sx={{ position: 'static', opacity: 0.12 }} />
      <FloatTriangleDownIcon
        sx={{
          width: 30,
          height: 15,
          opacity: 0.24,
          position: 'static',
        }}
      />
    </Stack>

    <FloatLine vertical sx={{ top: 0, left: 80 }} />
  </>
);

// ----------------------------------------------------------------------

export function HomeIndex({ sx, ...other }: BoxProps) {
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
    <Box component="section" sx={sx} {...other}>
      <MotionViewport sx={{ py: 10, position: 'relative' }}>
      {renderLines()}

        <Container>
          <SectionTitle
            title="Create crypto index"
            txtGradient="tokens!"
            sx={{ mb: { xs: 5, md: 8 }, textAlign: 'center' }}
          />

          {/* <Card sx={sx}> */}

          <Grid2 container spacing={3} sx={{ mt: 3 }}>
            <Grid2 size={{ xs: 12, md: 12, lg: 12 }}>
              {/* Pass the native token symbol here */}
              <NewIndexForm tokenSymbol="SOL" availableCoins={availableCoins} />
            </Grid2>
          </Grid2>
          {/* </Card> */}
        </Container>
      </MotionViewport>
    </Box>
  );
}
