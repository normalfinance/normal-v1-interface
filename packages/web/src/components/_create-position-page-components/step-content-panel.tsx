'use client';

import type { StateToken } from '@normalfinance/types';
import type { PositionQueryParams } from '@/types/query-params';

import { z } from 'zod';
import { useEffect } from 'react';
import { useLiquidity } from '@/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersistStore } from '@normalfinance/state';
import { useForm, FormProvider } from 'react-hook-form';
import { constants, sortTokenAddreses } from '@normalfinance/utils';

import { Box, Stack } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import { WalletGate } from '@/components/_common/wallet-gate';

import { StepOne } from './step-one';
import { StepTwo } from './step-two';

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */
export interface StepContentPanelProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  isLastStep: boolean;
  tokens: StateToken[];
  queryParams?: PositionQueryParams;
}

/* ------------------------------------------------------------------ */
/* Zod schema                                                          */
/* ------------------------------------------------------------------ */
export const FormSchema = z.object({
  tokenA: z.string().min(1, 'Choose token').max(56, 'Too long'),
  tokenB: z.string().min(1, 'Choose token').max(56, 'Too long'),
  feeTier: z.string().min(1, 'Choose fee tier').max(3, 'Too long'),
  amountA: z
    .number({ invalid_type_error: 'Enter amount' })
    .min(0.000001, 'Amount must be positive')
    .optional(),
  amountB: z
    .number({ invalid_type_error: 'Enter amount' })
    .min(0.000001, 'Amount must be positive')
    .optional(),
});

export type FormValues = z.infer<typeof FormSchema>;

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */
export function StepContentPanel({
  step,
  onNext,
  onBack,
  onReset,
  isLastStep,
  tokens,
  queryParams,
}: StepContentPanelProps) {
  const {
    wallet,
    poolState: { poolsByTokens },
  } = usePersistStore();

  const { loading, setLoading, depositLiquidity } = useLiquidity();

  /* ---------------- RHF ---------------- */
  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tokenA: constants.StellarConfig.USDC_ADDRESS,
      tokenB: '',
      feeTier: '30',
      amountA: undefined,
      amountB: undefined,
    },
  });

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    // If we have a pool_address, we might be able to infer tokens from it
    // For now, we'll use the amount if provided
    if (queryParams.amount) {
      methods.setValue('amountA', Number(queryParams.amount), { shouldValidate: false });
    }

    // If action is provided, we could potentially pre-select certain flows
    // For now, this is just amount handling
  }, [queryParams, methods]);

  /* Which fields are validated per step */
  const stepFields: Record<number, (keyof FormValues)[]> = {
    1: ['tokenA', 'tokenB'],
    2: ['amountA', 'amountB'],
  };

  /* ------------- helpers --------------- */
  const watchTokenA = methods.watch('tokenA');
  const watchTokenB = methods.watch('tokenB');
  const watchAmountA = methods.watch('amountA');
  const watchAmountB = methods.watch('amountB');

  // Check if wallet is connected
  const isWalletConnected = !!wallet.address;

  const tokenA = tokens.find((tkn) => tkn.contract === watchTokenA);
  const tokenB = tokens.find((tkn) => tkn.contract === watchTokenB);

  // Check if user has insufficient balance
  const hasInsufficientBalance = () => {
    if (!isWalletConnected || !watchAmountA || !watchAmountB || !tokenA || !tokenB) {
      return false;
    }

    // Convert the user input amount to the token's smallest unit (considering decimals)
    // const requiredAmountA = BigInt(Math.floor(watchAmountA * Math.pow(10, tokenA.decimals)));
    // const requiredAmountB = BigInt(Math.floor(watchAmountB * Math.pow(10, tokenB.decimals)));

    return tokenA.balance < watchAmountA || tokenB.balance < watchAmountB;
  };

  const getButtonLabel = () => {
    if (step === 1) return watchTokenA && watchTokenB ? 'Continue' : 'Select token';
    if (step === 2) {
      if (!watchAmountA) return 'Enter amount';
      if (!watchAmountB) return 'Enter amount';
      if (!isWalletConnected) return 'Connect Wallet';
      if (hasInsufficientBalance()) return 'Insufficient balance';
      return 'Continue';
    }
    return 'Continue';
  };

  const isButtonDisabled = () => {
    if (loading) return true;
    if (step === 1) return !watchTokenA || !watchTokenB;
    if (step === 2) return !watchAmountA || !watchAmountB || hasInsufficientBalance();
    return false;
  };

  /* ------- main CTA click handler ------------------------------------ */
  const handleMainButtonClick = async () => {
    if (loading) return;

    // ----- Step-2 main case  ---------------------------------------
    if (step == 2 && watchAmountA !== undefined && watchAmountB !== undefined) {
      if (!isWalletConnected) {
        // Wallet connection is handled by WalletGate component
        return;
      }
      if (hasInsufficientBalance()) {
        // Button is disabled for insufficient balance
        return;
      }

      const sortedTokens = sortTokenAddreses(watchTokenA, watchTokenB);
      const tokensKey = sortedTokens.join(':');

      const pools = poolsByTokens[tokensKey];

      if (!pools || pools.length === 0) {
        alert('No pools found');
        return;
      }
      const pool = pools[0];

      await depositLiquidity({
        tokens: sortedTokens,
        pool_index: pool.index,
        desired_amounts: [watchAmountA, watchAmountB],
        min_shares: 0,
      });
      return;
    }

    // ----- normal flow (validate & advance) ---------------------------
    setLoading(true);
    const ok = await methods.trigger(stepFields[step]);
    setLoading(false);

    if (ok) (isLastStep ? onReset : onNext)();
  };

  /* ------------- render --------------- */
  return (
    <FormProvider {...methods}>
      <Stack direction="column" justifyContent="space-between" minHeight={312} sx={{ width: 1 }}>
        {/* ---- step body ---- */}
        <Box>
          {step === 1 && <StepOne tokens={tokens} />}
          {step === 2 && <StepTwo tokens={tokens} />}
        </Box>

        {/* ---- navigation ---- */}
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          {step === 1 && watchAmountA && watchAmountB ? (
            <WalletGate buttonText={getButtonLabel()} fullWidth variant="soft" color="success">
              <LoadingButton
                fullWidth
                variant="soft"
                color="success"
                size="large"
                onClick={handleMainButtonClick}
                disabled={isButtonDisabled()}
                loading={loading}
              >
                {getButtonLabel()}
              </LoadingButton>
            </WalletGate>
          ) : (
            <LoadingButton
              fullWidth
              variant="soft"
              color="success"
              size="large"
              onClick={handleMainButtonClick}
              disabled={isButtonDisabled()}
              loading={loading}
            >
              {getButtonLabel()}
            </LoadingButton>
          )}
        </Stack>
      </Stack>
    </FormProvider>
  );
}
