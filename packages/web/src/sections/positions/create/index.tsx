'use client';

// import { useState, useCallback } from 'react';

import type { Token } from '@/types/token';

// mui
import { paths } from '@/routes/paths';
import { DashboardContent } from '@/layouts/dashboard';

import { Grid2 } from '@mui/material';

import { CustomBreadcrumbs } from '@/components/template/custom-breadcrumbs';
import { CreatePosition } from '@/components/_common/positions/create-position';
// import CreateLiquidityPositionProgressTab from '@/components/create-liquidity-position-progress-tab';
// import CreateLiquidityPositionStepOne from '@/components/create-liquidity-position-step-one';
// import CreateLiquidityPositionStepTwo from '@/components/create-liquidity-position-step-two';
// import CreateLiquidityPositionStepThree from '@/components/create-liquidity-position-step-three';
// import CreateLiquidityPositionTabs from '@/components/create-liquidity-position-tabs';

// ----------------------------------------------------------------------

const TABS = [
  {
    value: 'step1',
    label: 'Select token pair and fees',
    count: 22,
  },
  {
    value: 'step2',
    label: 'Set price range',
    count: 12,
  },
  {
    value: 'step3',
    label: 'Enter deposit amounts',
    count: 10,
  },
];

const tokensList: Token[] = [
  {
    id: 1,
    url: 'https://token-icons.s3.amazonaws.com/eth.png',
    name: 'Ethereum',
    shortname: 'ETH',
    owned: true,
    countstatus: 0.02106,
    pricestatus: 2814.25,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 2,
    url: 'https://coin-images.coingecko.com/coins/images/6319/large/usdc.png?1696506694',
    name: 'USDC',
    shortname: 'USDC',
    owned: false,
    countstatus: 0,
    pricestatus: 0.9998,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 3,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    name: 'Tether',
    shortname: 'USDT',
    owned: false,
    countstatus: 0,
    pricestatus: 0.9999,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },

  {
    id: 4,
    url: 'https://coin-images.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1696507857',
    name: 'Wrapped Bitcoin',
    shortname: 'WBTC',
    owned: false,
    countstatus: 0,
    pricestatus: 95799.17,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 5,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    shortname: 'WETH',
    owned: false,
    countstatus: 0,
    pricestatus: 2806.75,
    featured: true,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
  {
    id: 6,
    url: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    name: 'Wrapped Ether',
    shortname: 'WETH',
    owned: false,
    countstatus: 0,
    pricestatus: 2806.75,
    featured: false,
    address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  },
];

// ----------------------------------------------------------------------

export default function CreatePositionView() {
  // const [currentTab, setCurrentTab] = useState('step1');

  // const handleChangeTab = useCallback(
  //   (event: React.SyntheticEvent | undefined, newValue: string) => {
  //     setCurrentTab(newValue);
  //   },
  //   []
  // );

  // const handleSubmitStepOne = useCallback((tokenA: string, tokenB: string, feeTier: string) => {
  //   console.log({ tokenA, tokenB, feeTier });
  //   setCurrentTab('step2');
  // }, []);

  // const handleSubmitStepTwo = useCallback((tokenA: string, tokenB: string, feeTier: string) => {
  //   console.log({ tokenA, tokenB, feeTier });
  //   setCurrentTab('step3');
  // }, []);

  // const handleReset = () => {
  //   setCurrentTab('step1');
  // };

  return (
    <DashboardContent maxWidth="xl">
      <CustomBreadcrumbs
        heading="Liquidity"
        links={[
          { name: 'Your positions', href: paths.overview },
          { name: 'New position', href: paths.overview },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />
      <Grid2 container spacing={3} sx={{ mt: 3 }}>
        <Grid2 size={{ xs: 12, md: 12 }}>
          <CreatePosition tokens={tokensList} />
        </Grid2>
      </Grid2>
      {/* <CustomBreadcrumbs
        heading="Liquidity"
        links={[
          { name: 'Your positions', href: paths.overview },
          { name: 'New position', href: paths.overview },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />
       <PageHeader title={<Trans>New position</Trans>} />
      <Stack
        flexGrow={1}
        spacing={1.5}
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
      >
        <Button
          color="inherit"
          variant="contained"
          startIcon={<Iconify icon="solar:restart-bold" />}
          onClick={handleReset}
        >
          <Trans>Reset</Trans>
        </Button>
      </Stack>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <CreateLiquidityPositionTabs tabs={[]} onTab={null} />
        </Grid>

        <Grid item xs={12} md={8}>
          {currentTab === 'step1' && (
            <CreateLiquidityPositionStepOne onNext={handleSubmitStepOne} />
          )}

          {currentTab === 'step2' && (
            <>
              <CreateLiquidityPositionProgressTab
                tab="step1"
                onEdit={() => handleChangeTab(undefined, 'step1')}
              >
                <p>Step 1</p>
              </CreateLiquidityPositionProgressTab>

              <CreateLiquidityPositionStepTwo onNext={handleSubmitStepTwo} />
            </>
          )}

          {currentTab === 'step3' && (
            <>
              <CreateLiquidityPositionProgressTab
                tab="step1"
                onEdit={() => handleChangeTab(undefined, 'step1')}
              >
                <p>Step 1</p>
              </CreateLiquidityPositionProgressTab>

              <CreateLiquidityPositionProgressTab
                tab="step2"
                onEdit={() => handleChangeTab(undefined, 'step2')}
              >
                <p>Step 2</p>
              </CreateLiquidityPositionProgressTab>

              <CreateLiquidityPositionStepThree onNext={handleSubmitStepOne} />
            </>
          )}
        </Grid>
      </Grid> */}
    </DashboardContent>
  );
}
