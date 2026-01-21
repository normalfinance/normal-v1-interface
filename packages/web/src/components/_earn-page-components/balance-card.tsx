import type { CardProps } from '@mui/material/Card';

import { useTranslate } from '@/locales';
import { ModalType } from '@normalfinance/types';
import { useAppStore } from '@normalfinance/state';
import { fCurrency, fCurrencyTwoDecimals } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { WalletGate } from '@/components/_common/wallet-gate';

// Define a type for each balance row
export type BalanceRow = {
  label: string;
  value: string;
  formatter?: (value: string) => string;
};

type Props = CardProps & {
  title: string;
  totalBalance: string;
  liquidityProvided: string;
};

export function BalanceCard({ sx, title, totalBalance, liquidityProvided, ...other }: Props) {
  const { t } = useTranslate();
  const theme = useTheme();

  const { setModalView } = useAppStore();

  // Helper function to render a single row.
  const row = (label: string, value: string, formatter: (value: string) => string = fCurrency) => (
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
      <Box component="span">{formatter(value)}</Box>
    </Box>
  );

  // Define default rows if none are provided via props.
  const defaultRows: BalanceRow[] = [
    { label: 'Liquidity', value: liquidityProvided, formatter: fCurrencyTwoDecimals },
  ];

  const rowsToRender = defaultRows;

  return (
    <Card
      sx={[
        { p: 4, borderRadius: 3, border: 1, borderColor: alpha(theme.palette.grey[500], 0.32) },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
      data-testid="earn-balance-card"
    >
      <Box sx={{ mb: 2, typography: 'h5', fontSize: 20 }}>{title}</Box>

      <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ typography: 'h3' }}>{fCurrency(totalBalance)}</Box>
        {rowsToRender.map((r, i) => (
          <Box key={i}>{row(r.label, r.value, r.formatter)}</Box>
        ))}

        <Box sx={{ gap: 2, display: 'flex', mt: 2 }}>
          <WalletGate buttonText={t('Login to manage your Earn account')} fullWidth>
            <Button
              fullWidth
              variant="soft"
              color="success"
              onClick={() => setModalView(ModalType.ADD_LIQUIDITY, true)}
              data-testid="add-liquidity-button"
            >
              {t('Deposit')}
            </Button>

            <Button
              fullWidth
              variant="soft"
              color="error"
              onClick={() => setModalView(ModalType.REMOVE_LIQUIDITY, true)}
              data-testid="remove-liquidity-button"
            >
              {t('Withdraw')}
            </Button>
          </WalletGate>
        </Box>
      </Box>
    </Card>
  );
}
