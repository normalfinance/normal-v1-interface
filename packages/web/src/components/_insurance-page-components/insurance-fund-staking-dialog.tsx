'use client';


import z from 'zod';
import { useState } from 'react';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useInsuranceFund } from '@/hooks/stellar';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { Controller, useFormContext } from 'react-hook-form';

import {
  Tab,
  Box,
  Tabs,
  Alert,
  Stack,
  Dialog,
  Button,
  InputBase,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

// ----------------------------------------------------------------------

const NAV_ITEMS = [
  {
    value: 'stake',
    label: 'Stake',
  },
  {
    value: 'unstake',
    label: 'Unstake',
  },
];

/* ------------------------------------------------------------------ */
/* Zod schema                                                          */
/* ------------------------------------------------------------------ */
export const FormSchema = z.object({
  tokenSymbol: z.literal('XLM'),
  amount: z
    .number({ invalid_type_error: 'Enter amount' })
    .min(0.000001, 'Amount must be positive')
    .optional(),
});

export type FormValues = z.infer<typeof FormSchema>;

// ----------------------------------------------------------------------

export type InsuranceFundStakingDialogProps = {
  /** Whether the dialog is visible */
  open: boolean;
  /** Called on cancel or after successful accept */
  onClose?: () => void;
};

export default function InsuranceFundStakingDialog({
  open,
  onClose,
}: InsuranceFundStakingDialogProps) {
  const { t } = useTranslate();

  const { stake, onDeposit, onRequestWithdraw } = useInsuranceFund();

  const [selectedTab, setSelectedTab] = useState('stake'); // Default to first tab

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  const pendingUnstake = stake?.last_withdraw_request_value !== 0;

  // Form stuff
  const { control, setValue, watch } = useFormContext<FormValues>();

  // -- keep field in sync with the text input ------------------------
  const amount = watch('amount') ?? '';
  const handleChange = (value: string) =>
    setValue('amount', value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });

  // const fiatValue = token && amount !== '' ? Number(amount) * token.pricestatus : 0;
  const fiatValue = 0;

  const handleStake = () => {
    onDeposit({ amount: 0 });
  };

  const handleRequestUnstake = () => {
    onRequestWithdraw({ amount: 0 });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('Stake')}</DialogTitle>

      <DialogContent dividers sx={{ maxHeight: 600 }}>
        <Box
          sx={{
            width: 1,
            zIndex: 9,
            px: { md: 3 },
            display: 'flex',
            bgcolor: 'background.paper',
            justifyContent: { xs: 'center', md: 'flex-start' },
          }}
        >
          <Tabs value={selectedTab} onChange={handleChangeTab}>
            {NAV_ITEMS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>
        </Box>

        <Content
          isStake={selectedTab === 'stake'}
          control={control}
          amount={amount}
          onChange={handleChange}
          fiatValue={fiatValue}
          pendingUnstake={pendingUnstake}
        />
      </DialogContent>

      <DialogActions>
        {selectedTab === 'stake' && (
          <Button variant="contained" color="secondary" onClick={handleStake} autoFocus>
            {t('Stake')}
          </Button>
        )}
        {selectedTab === 'unstake' && (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleRequestUnstake}
            autoFocus
            disabled={pendingUnstake}
          >
            {t('Request unstake')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

type Props = {
  isStake: boolean;
  control: any; // Control<FieldValues, any, FieldValues>; // FIXME:
  amount: string | number;
  onChange: (value: string) => void;
  fiatValue: number;
  pendingUnstake: boolean;
};

function Content({ isStake, control, amount, onChange, fiatValue, pendingUnstake }: Props) {
  const { t } = useTranslate();

  return (
    <>
      <Alert
        severity="info"
        title={
          isStake
            ? t(
                'Staked funds cannot be used as collateral. If you decide to unstake, the amount will be subject to a 13-day cool down period.'
              )
            : t(
                'Funds will be available to withdraw 13 days after making an unstake request. You can only have one pending unstake request per vault at a time. You can cancel a request at any time, noting your 13 day cool down period will restart upon any new unstake request.'
              )
        }
      />

      <Stack
        flexGrow={1}
        minWidth={0}
        sx={{
          height: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start', // (default is fine)
          justifyContent: 'space-between',
        }}
      >
        <Controller
          name="amount"
          control={control}
          render={() => (
            <InputBase
              value={amount}
              type="number"
              onChange={(e) => onChange(sanitizeAmountInput(e.target.value))}
              placeholder="0.0"
              inputProps={{ min: 0 }}
              sx={{
                border: 'none',
                // 🔽  remove flexGrow so it doesn't fill the column
                '& input': { fontSize: 32, fontWeight: 700 },
              }}
            />
          )}
          disabled={pendingUnstake}
        />

        <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
          {fiatValue > 0 ? fCurrency(fiatValue) : '$0'}
        </Typography>
      </Stack>
    </>
  );
}
