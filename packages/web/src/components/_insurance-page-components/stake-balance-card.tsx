import type { CardProps } from '@mui/material/Card';

import { useBoolean } from '@/hooks';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { Divider } from '@mui/material';
import Button from '@mui/material/Button';

import InsuranceFundStakingDialog from './insurance-fund-staking-dialog';

// Define a type for each balance row
export type BalanceRow = {
  label: string;
  value: number;
  formatter?: (value: number) => string;
};

type Props = CardProps & {
  title: string;
  yieldPercent: number;
  staked: number;
  currentBalance: number;
};

export function StakeBalance({ sx, title, yieldPercent, staked, currentBalance, ...other }: Props) {
  const { t } = useTranslate();

  const manageStake = useBoolean();

  // Helper function to render a single row.
  const row = (label: string, value: number, formatter: (value: number) => string = fCurrency) => (
    <Box
      sx={{
        display: 'flex',
        typography: 'body2',
        justifyContent: 'space-between',
      }}
    >
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {label}
      </Box>
      <Box component="span">{formatter(value)}</Box>
    </Box>
  );

  // Define default rows if none are provided via props.
  const defaultRows: BalanceRow[] = [
    { label: 'Staked', value: staked, formatter: fCurrency },
    { label: 'Earned', value: yieldPercent, formatter: fCurrency },
  ];

  const rowsToRender = defaultRows;

  return (
    <Card sx={[{ p: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box sx={{ mb: 1, typography: 'subtitle2' }}>{title}</Box>

      <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ typography: 'h3' }}>{fCurrency(currentBalance)}</Box>
        {rowsToRender.map((r, i) => (
          <Box key={i}>{row(r.label, r.value, r.formatter)}</Box>
        ))}

        <Divider />

        <Box sx={{ gap: 2, display: 'flex' }}>
          <Button fullWidth variant="contained" color="primary" onClick={manageStake.onTrue}>
            {t('Manage stake')}
          </Button>
        </Box>
        <InsuranceFundStakingDialog open={manageStake.value} onClose={manageStake.onFalse} />
      </Box>
    </Card>
  );
}
