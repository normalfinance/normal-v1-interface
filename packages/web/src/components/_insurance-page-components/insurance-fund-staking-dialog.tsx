'use client';

import type { InsuranceQueryParams } from '@/types/query-params';

import z from 'zod';
import { useState, useEffect } from 'react';
import { useTranslate } from '@/locales';
import { useInsuranceFund } from '@/hooks';
import { fCurrency } from '@/utils/format-number';
import { zodResolver } from '@hookform/resolvers/zod';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';

import {
  Tab,
  Box,
  Tabs,
  Alert,
  AlertTitle,
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
  /** Query parameters for pre-populating form */
  queryParams?: InsuranceQueryParams;
};

export default function InsuranceFundStakingDialog({
  open,
  onClose,
  queryParams,
}: InsuranceFundStakingDialogProps) {
  const { t } = useTranslate();

  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tokenSymbol: 'XLM',
      amount: undefined,
    },
  });

  return (
    <FormProvider {...methods}>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <Content queryParams={queryParams} />
      </Dialog>
    </FormProvider>
  );
}

interface ContentProps {
  queryParams?: InsuranceQueryParams;
}

export const Content: React.FC<ContentProps> = ({ queryParams }) => {
  const { t } = useTranslate();

  const [selectedTab, setSelectedTab] = useState('stake'); // Default to first tab

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  const { stake, onDeposit, onRequestWithdraw } = useInsuranceFund();

  const pendingUnstake = stake?.last_withdraw_request_value !== 0;

  // Form stuff
  const { control, setValue, watch } = useFormContext<FormValues>();

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    if (queryParams.amount) {
      // Set tab based on action parameter, default to 'stake' if not specified
      const tab = queryParams.action === 'unstake' ? 'unstake' : 'stake';
      setSelectedTab(tab);
      setValue('amount', Number(queryParams.amount), { shouldValidate: false });
    }
  }, [queryParams, setValue]);

  // -- keep field in sync with the text input ------------------------
  const amount = watch('amount') ?? '';
  const handleChange = (value: string) =>
    setValue('amount', value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });

  // const fiatValue = token && amount !== '' ? Number(amount) * token.pricestatus : 0;
  const fiatValue = 0;

  const handleStake = () => {
    onDeposit({ amount });
  };

  const handleRequestUnstake = () => {
    onRequestWithdraw({ amount });
  };

  return (
    <>
      <DialogTitle>{selectedTab === 'stake' ? t('Stake') : t('Unstake')}</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 600 }}>
        <Box
          sx={{
            width: 1,
            zIndex: 9,
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

        {/* Content */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          <AlertTitle>{selectedTab === 'stake' ? t('Stake') : t('Unstake')}</AlertTitle>
          {selectedTab === 'stake'
            ? t(
                'Staked funds cannot be used as collateral. If you decide to unstake, the amount will be subject to a 13-day cool-down period.'
              )
            : t(
                'Funds will be available to withdraw 13 days after making an unstake request. You can only have one pending unstake request per vault at a time. You can cancel a request at any time, noting your 13-day cool-down period will restart upon any new unstake request.'
              )}
        </Alert>

        <Stack
          flexGrow={1}
          minWidth={0}
          sx={{
            height: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start', // (default is fine)
            justifyContent: 'space-between',
            mt: 3,
          }}
        >
          <Controller
            name="amount"
            control={control}
            render={() => (
              <InputBase
                value={amount}
                type="number"
                onChange={(e) => handleChange(sanitizeAmountInput(e.target.value))}
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
    </>
  );
};
