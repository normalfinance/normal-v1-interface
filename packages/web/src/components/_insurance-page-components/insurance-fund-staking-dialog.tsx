'use client';

import type { InsuranceQueryParams } from '@/types/query-params';

import z from 'zod';
import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTokenPrice, useInsuranceFund } from '@/hooks';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { fCurrency, fShortenNumber } from '@/utils/format-number';
import { constants, getCryptoIconUrl } from '@normalfinance/utils';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';

import {
  Tab,
  Box,
  Tabs,
  Alert,
  Stack,
  Dialog,
  Button,
  Avatar,
  Divider,
  useTheme,
  InputBase,
  Typography,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link as MuiLink,
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
  const theme = useTheme();
  const { t } = useTranslate();

  const [selectedTab, setSelectedTab] = useState('stake'); // Default to first tab

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
  };

  const { data: xlmPrice, isLoading: tokenPriceLoading } = useTokenPrice(
    constants.StellarConfig.XLM_ADDRESS
  );

  const {
    insuranceFund,
    stake,
    onDeposit,
    onRequestWithdraw,
    onCancelRequestWithdraw,
    onWithdraw,
  } = useInsuranceFund();

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

  const fiatValue = xlmPrice && amount !== '' ? Number(amount) * Number(xlmPrice.data) : 0;

  const handleStake = () => {
    onDeposit({ amount });
  };

  const handleUnstakeButtonClick = () => {
    const label = getButtonLabel();

    if (label === 'Cancel unstake request') {
      onCancelRequestWithdraw();
    } else if (label === 'Unstake') {
      onWithdraw();
    } else {
      onRequestWithdraw({ amount });
    }
  };

  const getButtonLabel = (): string => {
    if (!stake || !insuranceFund) return 'Failed to load data';

    if (!stake.if_shares) {
      return 'No funds to unstake';
    }

    if (stake.last_withdraw_request_shares > 0) {
      const now = Date.now();
      if (now - stake.last_withdraw_request_ts < insuranceFund.unstaking_period) {
        return 'Cancel unstake request';
      }
      return 'Unstake';
    }

    return 'Request unstake';
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
              <Tab key={tab.value} value={tab.value} label={t(tab.label)} />
            ))}
          </Tabs>
        </Box>

        {/* Content */}
        <Alert severity="warning" sx={{ mt: 3 }}>
          {selectedTab === 'stake' ? (
            t('If you decide to unstake, the amount will be subject to a 13-day cool-down period.')
          ) : (
            <>
              {t(
                'Funds will be available to withdraw 13 days after making an unstake request. You can only have one pending unstake request at a time. You can cancel a request at any time, noting your 13-day cool-down period will restart upon any new unstake request.'
              )}{' '}
              <MuiLink
                href={`${paths.docs}/developers/insurance-fund`}
                underline="always"
                color="secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('Learn more.')}
              </MuiLink>
            </>
          )}
        </Alert>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
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

          <Stack
            alignItems="center"
            direction="row"
            spacing={1}
            sx={{ mr: 2, borderRadius: 99, p: 1 }}
          >
            <Avatar src={getCryptoIconUrl('XLM')} sx={{ width: 32, height: 32 }} />
            <Typography variant="body1" fontWeight="bold">
              XLM
            </Typography>
          </Stack>
        </Box>

        {selectedTab === 'unstake' && (
          <Box sx={{ pt: 2 }}>
            <Divider />
            <Box
              sx={{
                mt: 0,
                px: 0,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                pt: 2,
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  px: 0,
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                        fontSize: '12px',
                      }}
                    >
                      {t('Amount Staked')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {fShortenNumber(stake?.if_shares ?? 0)}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        color: theme.palette.text.secondary,
                        fontSize: '12px',
                      }}
                    >
                      {t('Request for unstake')}
                    </Typography>
                  </Box>

                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                      fontSize: '12px',
                    }}
                  >
                    {fShortenNumber(stake?.last_withdraw_request_shares ?? 0)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
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
            onClick={handleUnstakeButtonClick}
            autoFocus
            disabled={pendingUnstake}
          >
            {getButtonLabel()}
          </Button>
        )}
      </DialogActions>
    </>
  );
};
