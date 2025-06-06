// import { useState, useCallback } from 'react';

// mui
import { paths } from '@/routes/paths';
import { DashboardContent } from '@/layouts/dashboard';
import { CustomBreadcrumbs } from '@/components/custom-breadcrumbs';
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

// ----------------------------------------------------------------------

export default function CreateLiquidityPositionView() {
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
        heading={'Liquidity'}
        links={[
          { name: 'Your positions', href: paths.overview },
          { name: 'New position', href: paths.overview },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />
      {/* <PageHeader title={<Trans>New position</Trans>} />
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
