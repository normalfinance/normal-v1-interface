import type { CardProps } from '@mui/material/Card';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { fCurrency, fRawPercent } from 'src/utils/format-number';

// Define a type for each balance row
export type BalanceRow = {
  label: string;
  value: number;
  formatter?: (value: number) => string;
};

// Define a type for action buttons
export type BalanceActionButton = {
  label: string;
  color: 'primary' | 'error' | 'warning' | 'info' | 'success';
  onClick: () => void;
  variant?: 'contained' | 'outlined' | 'text';
};

type Props = CardProps & {
  title: string;
  yieldPercent: number;
  refunded: number;
  staked: number;
  currentBalance: number;
  /**
   * Optional array of rows to display.
   * If not provided, default rows will be used:
   * - Staked (formatted as currency)
   * - Earned (formatted as currency)
   * - Yield (formatted as raw percent)
   */
  rows?: BalanceRow[];
  /**
   * Optional array of action buttons.
   */
  actionButtons?: BalanceActionButton[];
};

// Default empty functions for deposit and withdrawal
const defaultDeposit = () => {};
const defaultWithdraw = () => {};

// Default action buttons configuration
const defaultActionButtons: BalanceActionButton[] = [
  { label: 'Deposit', color: 'primary', onClick: defaultDeposit, variant: 'contained' },
  { label: 'Withdraw', color: 'error', onClick: defaultWithdraw, variant: 'contained' },
];

export function CurrentBalance({
  sx,
  title,
  yieldPercent,
  refunded,
  staked,
  currentBalance,
  rows,
  actionButtons = defaultActionButtons,
  ...other
}: Props) {
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
    { label: 'Yield', value: refunded, formatter: fRawPercent },
  ];

  const rowsToRender = rows || defaultRows;

  return (
    <Card sx={[{ p: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Box sx={{ mb: 1, typography: 'subtitle2' }}>{title}</Box>

      <Box sx={{ gap: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ typography: 'h3' }}>{fCurrency(currentBalance)}</Box>
        {rowsToRender.map((r, i) => (
          <Box key={i}>{row(r.label, r.value, r.formatter)}</Box>
        ))}

        <Box sx={{ gap: 2, display: 'flex' }}>
          {actionButtons.map((btn, index) => (
            <Button
              key={index}
              fullWidth
              variant={btn.variant || 'contained'}
              color={btn.color}
              onClick={btn.onClick}
            >
              {btn.label}
            </Button>
          ))}
        </Box>
      </Box>
    </Card>
  );
}
