'use client';

import type { PoolPosition } from '@/hooks';
import type { PoolQueryParams } from '@/types/query-params';

import z from 'zod';
import BigNumber from 'bignumber.js';
import { useTranslate } from '@/locales';
import { useMemo, useEffect } from 'react';
import { fCurrency } from '@/utils/format-number';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersistStore } from '@normalfinance/state';
import { formatTokenAmount } from '@/utils/format-stellar';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { constants, getCryptoIconUrl } from '@normalfinance/utils';
import { useLiquidity, useTokenPrice, useTokenBalance } from '@/hooks';
import { useForm, Controller, FormProvider, useFormContext } from 'react-hook-form';

import {
  Box,
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
} from '@mui/material';

/* ------------------------------------------------------------------ */
/* Zod schema                                                          */
/* ------------------------------------------------------------------ */
export const FormSchema = z.object({
  amount: z
    .number({ invalid_type_error: 'Enter amount' })
    .min(0.000001, 'Amount must be positive')
    .optional(),
});

export type FormValues = z.infer<typeof FormSchema>;

// ----------------------------------------------------------------------

export type WithdrawLiquidityDialogProps = {
  /** Whether the dialog is visible */
  open: boolean;
  position: PoolPosition;
  /** Called on cancel or after successful accept */
  onClose?: () => void;
  /** Query parameters for pre-populating form */
  queryParams?: PoolQueryParams;
};

export default function WithdrawLiquidityDialog({
  open,
  position,
  onClose,
  queryParams,
}: WithdrawLiquidityDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      amount: undefined,
    },
  });

  return (
    <FormProvider {...methods}>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <Content position={position} queryParams={queryParams} />
      </Dialog>
    </FormProvider>
  );
}

interface ContentProps {
  position: PoolPosition;
  queryParams?: PoolQueryParams;
}

export const Content: React.FC<ContentProps> = ({ position, queryParams }) => {
  const theme = useTheme();
  const { t } = useTranslate();
  const store = usePersistStore();

  const { loading: txLoading, withdrawLiquidity } = useLiquidity();

  // Get token balance for the LP token
  const { data: tokenBalance, isLoading: balanceLoading } = useTokenBalance(position.tokenAddress);

  // Get the price for XLM
  const { loading: priceLoading, price: xlmPrice } = useTokenPrice(
    constants.StellarConfig.XLM_ADDRESS
  );

  // Check if wallet is connected
  const isWalletConnected = !!store.wallet.address;

  // Form stuff
  const { control, setValue, watch } = useFormContext<FormValues>();

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    if (queryParams.amount) {
      // Set tab based on action parameter, default to 'stake' if not specified
      setValue('amount', Number(queryParams.amount), { shouldValidate: false });
    }
  }, [queryParams, setValue]);

  // -- keep field in sync with the text input ------------------------
  const amount = watch('amount') ?? '';

  const handleChange = (value: string) =>
    setValue('amount', value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });

  const fiatValue = useMemo(() => {
    if (xlmPrice && amount) {
      const xlm_price = BigNumber(formatTokenAmount(xlmPrice, 14));
      return xlm_price.multipliedBy(amount);
    }
    return new BigNumber(0);
  }, [xlmPrice, amount]);

  // Check if user has insufficient balance
  const hasInsufficientBalance = () => {
    if (!isWalletConnected || !position.tokenAddress || !amount || !tokenBalance) {
      return false;
    }

    // Convert the user input amount to the token's smallest unit (considering decimals)
    const requiredAmount = BigInt(
      Math.floor(amount * Math.pow(10, constants.StellarConfig.XLM_DECIMALS))
    );
    return tokenBalance.data < requiredAmount;
  };

  const handleWithdrawButtonClick = () => {
    const label = getButtonLabel();

    if (label === 'Withdraw') {
      withdrawLiquidity({
        asset: position.tokenA.name,
        share_amount: 0,
      });
    }
  };

  const getButtonLabel = (): string => {
    if (!amount) return 'Enter amount';
    if (!isWalletConnected) return 'Connect Wallet';
    if (hasInsufficientBalance()) return 'Insufficient LP tokens';
    return 'Withdraw';
  };

  return (
    <>
      <DialogTitle>{t('Withdraw liquidity')}</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 600 }}>
        <Alert severity="warning" sx={{ mt: 1 }}>
          {t(
            'Withdrawing liquidity will remove your depoisted XLM from this pool and move it back to your wallet, plus any accrued yield.'
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
                    {t('Amount Deposited')}
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
                  {formatTokenAmount(position.balance)} XLM
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleWithdrawButtonClick}
          disabled={getButtonLabel() !== 'Withdraw'}
          loading={txLoading}
          autoFocus
        >
          {getButtonLabel()}
        </Button>
      </DialogActions>
    </>
  );
};
