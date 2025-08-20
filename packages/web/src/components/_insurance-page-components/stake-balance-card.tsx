import type { CardProps } from '@mui/material/Card';
import type { InsuranceQueryParams } from '@/types/query-params';

import { useEffect } from 'react';
import { useBoolean } from '@/hooks';
import { useTranslate } from '@/locales';
import { format } from '@normalfinance/utils';
import { fCurrency } from '@/utils/format-number';
import { ZEALY_QUEST_IDS } from '@/global-config';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';

import { WalletGate } from '@/components/_common/wallet-gate';

import ZealyHighlight from '../_common/zealy/zealy-highlight';
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
  staked: BigNumber;
  currentBalance: number;
  queryParams?: InsuranceQueryParams;
  unstakingPeriod: number;
};

export function StakeBalance({
  sx,
  title,
  yieldPercent,
  staked,
  currentBalance,
  queryParams,
  unstakingPeriod,
  ...other
}: Props) {
  const { t } = useTranslate();
  const theme = useTheme();

  const manageStake = useBoolean();

  // Automatically open dialog if query parameters are present
  useEffect(() => {
    if (queryParams?.amount) {
      manageStake.onTrue();
    }
  }, [queryParams?.amount, manageStake]);

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
    { label: 'Staked', value: staked.toNumber(), formatter: format.formatTokenAmount },
    { label: 'Earned', value: yieldPercent, formatter: fCurrency },
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
          <WalletGate buttonText={t('Connect Wallet to Manage Stake')} fullWidth>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              data-testid="manage-stake-button"
              onClick={() => {
                // trackEvent('button_clicked', {
                //   label: 'Manage Stake',
                //   location: 'Insurance',
                // });
                // trackEvent('popup_opened', {
                //   label: 'Manage Stake',
                //   location: 'Insurance',
                // });
                manageStake.onTrue();
              }}
            >
              {t('Manage stake')}
            </Button>
          </WalletGate>
          <ZealyHighlight questId={ZEALY_QUEST_IDS.stakeFund} />
        </Box>
        <InsuranceFundStakingDialog
          open={manageStake.value}
          onClose={manageStake.onFalse}
          queryParams={queryParams}
          unstakingPeriod={unstakingPeriod}
        />
      </Box>
    </Card>
  );
}
