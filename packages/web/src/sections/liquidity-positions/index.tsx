import { DashboardContent } from '@/layouts/dashboard';

// ----------------------------------------------------------------------

export default function LiquidityPositionsView() {
  // const { positions } = useLPs();
  // const { pools } = usePools();

  // const table = useTable();

  return (
    <DashboardContent maxWidth="xl">
      {/* <PageHeader
        title={<Trans>Your positions</Trans>}
        subheader={<Trans>Liquidity you've provided to pools</Trans>}
      /> */}

      {/* <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <LiquidityPositions positions={positions} />
        </Grid>

        <Grid item xs={12} md={4}>
          <TopPoolsByTVL pools={pools.slice(0, 10)} />
        </Grid>

        <Grid item xs={12} md={8}>
          <Alert severity="info">
            <AlertTitle sx={{ textTransform: 'capitalize' }}>
              <Trans>Looking for your closed positions?</Trans>
            </AlertTitle>

            <Typography variant="body2">
              <Trans>You can see them by using the filter at the top of the page.</Trans>
            </Typography>
          </Alert>
        </Grid>
      </Grid> */}
    </DashboardContent>
  );
}
