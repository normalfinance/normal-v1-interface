'use client';

import type { PoolPosition } from '@/hooks';
import type { PoolQueryParams } from '@/types/query-params';

import z from 'zod';
import { useEffect } from 'react';
import { useTranslate } from '@/locales';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersistStore } from '@normalfinance/state';
import { useLiquidity, useTokenBalance } from '@/hooks';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { format, constants, getCryptoIconUrl, sortTokenAddreses } from '@normalfinance/utils';
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
import { SplitAvatar } from '../_common/drawer-components/activity-row';

/* ------------------------------------------------------------------ */
/* Zod schema                                                          */
/* ------------------------------------------------------------------ */
export const FormSchema = z.object({
  shareAmount: z
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
      shareAmount: undefined,
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
  const { wallet } = usePersistStore();

  const { loading: txLoading, withdrawLiquidity } = useLiquidity();

  // Check if wallet is connected
  const isWalletConnected = !!wallet.address;

  // Form stuff
  const { control, setValue, watch } = useFormContext<FormValues>();

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    if (queryParams.amount) {
      // Set tab based on action parameter, default to 'stake' if not specified
      setValue('shareAmount', Number(queryParams.amount), { shouldValidate: false });
    }
  }, [queryParams, setValue]);

  // -- keep field in sync with the text input ------------------------
  const shareAmount = watch('shareAmount') ?? '';

  const handleChange = (value: string) =>
    setValue('shareAmount', value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });

  // Check if user has insufficient balance
  const hasInsufficientBalance = () => {
    if (!isWalletConnected || !position.balances.tokenShare || !shareAmount) {
      return false;
    }

    return position.balances.tokenShare <= shareAmount;
  };

  const handleWithdrawButtonClick = () => {
    const label = getButtonLabel();

    if (label === 'Withdraw') {
      withdrawLiquidity({
        tokens: sortTokenAddreses(position.tokenA.contract, position.tokenB.contract),
        pool_index: position.pool.index,
        share_amount: shareAmount,
        min_amounts: [0, 0],
      });
    }
  };

  const getButtonLabel = (): string => {
    if (!shareAmount) return 'Enter amount';
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
            'Withdrawing liquidity will remove your depoisted tokens from this pool and move it back to your wallet, plus any accrued yield.'
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
              name="shareAmount"
              control={control}
              render={() => (
                <InputBase
                  value={shareAmount}
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
              {format.fCurrency(Number(shareAmount) * position.usdValues.tokenShare)}
            </Typography>
          </Stack>

          <Stack
            alignItems="center"
            direction="row"
            spacing={1}
            sx={{ mr: 2, borderRadius: 99, p: 1 }}
          >
            <SplitAvatar left={position.tokenA.icon} right={position.tokenB.icon} />
            <Typography variant="body1" fontWeight="bold">
              POOL
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
                  {position.balances.tokenA} {position.tokenA.symbol}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                    fontSize: '12px',
                  }}
                >
                  {position.balances.tokenB} {position.tokenB.symbol}
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
