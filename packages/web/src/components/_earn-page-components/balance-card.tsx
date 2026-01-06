import type { CardProps } from '@mui/material/Card';

import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useAppStore } from '@normalfinance/state';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { WalletGate } from '@/components/_common/wallet-gate';

// Define a type for each balance row
export type BalanceRow = {
  label: string;
  value: number;
  formatter?: (value: number) => string;
};

type Props = CardProps & {
  title: string;
  averageYieldPercent: number;
  liquidityProvided: number;
  currentBalance: number;
  queryParams?: any; // EarnQueryParams;
};

export function BalanceCard({
  sx,
  title,
  averageYieldPercent,
  liquidityProvided,
  currentBalance,
  queryParams,
  ...other
}: Props) {
  const { t } = useTranslate();
  const theme = useTheme();

  const { setModalView } = useAppStore();

  // Automatically open dialog if query parameters are present
  useEffect(() => {
    if (queryParams?.amount) {
      setModalView('addLiquidity', true);
    }
  }, [queryParams?.amount]);

  // Helper function to render a single row.
  const row = (label: string, value: number, formatter: (value: number) => string = fCurrency) => (
    <Box
      sx={{
        display: 'flex',
        typography: 'body2',
        justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 2,
        px: 1,
      }}
    >
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {t(label)}
      </Box>
      <Box component="span">
        {formatter(value)} {label === 'Staked' && 'XLM'}
      </Box>
    </Box>
  );

  // Define default rows if none are provided via props.
  const defaultRows: BalanceRow[] = [
    { label: 'Avg. APY', value: averageYieldPercent, formatter: fCurrency },
    { label: 'Liquidity', value: liquidityProvided, formatter: fCurrency },
    { label: 'Staked', value: 0, formatter: fCurrency },
  ];

  const rowsToRender = defaultRows;

  return (
    <Card
      sx={[
        { p: 4, borderRadius: 3, border: 1, borderColor: alpha(theme.palette.grey[500], 0.32) },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
      data-testid="stake-balance-card"
    >
      <Box sx={{ mb: 2, typography: 'h5', fontSize: 20 }}>{title}</Box>

      <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ typography: 'h3' }}>{fCurrency(currentBalance)}</Box>
        {rowsToRender.map((r, i) => (
          <Box key={i}>{row(r.label, r.value, r.formatter)}</Box>
        ))}

        <Box sx={{ gap: 2, display: 'flex', mt: 2 }}>
          <WalletGate buttonText={t('Login to manage your Earn account')} fullWidth>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={() => setModalView('addLiquidity', true)}
              data-testid="add-liquidity-button"
            >
              {t('Deposit')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              // onClick={manageStake.onTrue}
              data-testid="manage-stake-button"
            >
              {t('Stake (coming soon)')}
            </Button>
          </WalletGate>
        </Box>
      </Box>
    </Card>
  );
}
