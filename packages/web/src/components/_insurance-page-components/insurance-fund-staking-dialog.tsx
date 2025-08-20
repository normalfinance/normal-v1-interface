'use client';

import type { InsuranceQueryParams } from '@/types/query-params';

import z from 'zod';
import { paths } from '@/routes/paths';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useMemo, useState, useEffect } from 'react';
import { formatDuration } from '@/utils/format-time';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTokenPrice, useInsuranceFund } from '@/hooks';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { format , getCryptoIconUrl} from '@normalfinance/utils';
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
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link as MuiLink,
} from '@mui/material';

import { Iconify } from '../template/iconify';

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
  unstakingPeriod: number;
};

export default function InsuranceFundStakingDialog({
  open,
  onClose,
  queryParams,
  unstakingPeriod,
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
        <Content onClose={onClose} queryParams={queryParams} unstakingPeriod={unstakingPeriod} />
      </Dialog>
    </FormProvider>
  );
}

interface ContentProps {
  onClose?: () => void;
  queryParams?: InsuranceQueryParams;
  unstakingPeriod: number;
}

export const Content: React.FC<ContentProps> = ({ onClose, queryParams, unstakingPeriod }) => {
  const theme = useTheme();
  const { t } = useTranslate();

  const [selectedTab, setSelectedTab] = useState('stake'); // Default to first tab

  const handleChangeTab = (_event: React.SyntheticEvent, newValue: string) => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });
    setSelectedTab(newValue);
  };

  const { loading: priceLoading, price: xlmPrice } = useTokenPrice('XLM');

  const {
    loading: insuranceFundLoading,
    stake,
    onDeposit,
    onRequestWithdraw,
    onCancelRequestWithdraw,
    onWithdraw,
  } = useInsuranceFund();

  const unstakingPeriodText = formatDuration(unstakingPeriod) ?? '13 days';
  const unstakingPeriodElapsed = useMemo(
    () => stake && Date.now() - Number(stake.last_withdraw_request_ts) < unstakingPeriod,
    [stake, unstakingPeriod]
  );

  const pendingUnstake = stake
    ? BigNumber(stake.last_withdraw_request_value).isGreaterThan(0)
    : true;

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
  const handleChange = (value: string) => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });
    setValue('amount', value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });
  };

  const fiatValue = useMemo(() => {
    if (xlmPrice && amount) {
      // const shares = format.formatTokenAmount(stake.if_shares);
      const xlm_price = BigNumber(format.formatTokenAmount(xlmPrice, 14));
      return xlm_price.multipliedBy(amount);
    }
    return BigNumber(0);
  }, [xlmPrice, amount]);

  const handleStake = () => {
    // trackEvent('transaction_submitted', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });
    onDeposit({ amount });
  };

  const handleUnstakeButtonClick = () => {
    // trackEvent('button_clicked', {
    //   label: 'Manage Stake',
    //   location: 'Insurance',
    // });

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
    if (stake === undefined) return 'Failed to load stake';

    if (BigNumber(stake.if_shares).isEqualTo(0)) {
      return 'No funds to unstake';
    }

    if (BigNumber(stake.last_withdraw_request_shares).isGreaterThan(0) && unstakingPeriodElapsed) {
      return 'Unstake';
    }

    return 'Request unstake';
  };

  return (
    <>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedTab === 'stake' ? t('Stake') : t('Unstake')}{' '}
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
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
            t(
              `If you decide to unstake, the amount will be subject to a ${unstakingPeriodText} cool-down period.`
            )
          ) : (
            <>
              {t(
                `Funds will be available to withdraw ${unstakingPeriodText}s after making an unstake request. You can only have one pending unstake request at a time. You can cancel a request at any time, noting your ${unstakingPeriodText} cool-down period will restart upon any new unstake request.`
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
              {fCurrency(fiatValue.toFixed(2))}
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
                    {format.formatTokenAmount(stake ? stake.if_shares : 0)} XLM
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
                    {format.formatTokenAmount(stake ? stake.last_withdraw_request_shares : 0)} XLM
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {selectedTab === 'stake' && (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleStake}
            loading={insuranceFundLoading}
            autoFocus
          >
            {t('Stake')}
          </Button>
        )}
        {selectedTab === 'unstake' && (
          <>
            {pendingUnstake && (
              <Button
                variant="contained"
                color="error"
                onClick={onCancelRequestWithdraw}
                loading={insuranceFundLoading}
                autoFocus
              >
                {t('Cancel unstake')}
              </Button>
            )}

            <Button
              variant="contained"
              color="secondary"
              onClick={handleUnstakeButtonClick}
              loading={insuranceFundLoading}
              autoFocus
              disabled={pendingUnstake}
            >
              {getButtonLabel()}
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
};
