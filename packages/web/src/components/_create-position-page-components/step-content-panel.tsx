'use client';

import type { StateToken } from '@normalfinance/types';
import type { PositionQueryParams } from '@/types/query-params';

import { z } from 'zod';
import { useState, useEffect } from 'react';
import { constants } from '@normalfinance/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersistStore } from '@normalfinance/state';
import { useLiquidity, useTokenBalance } from '@/hooks';
import { useForm, FormProvider } from 'react-hook-form';

import { Box, Stack, Button } from '@mui/material';

import { WalletGate } from '@/components/_common/wallet-gate';

import StepTwo from './step-two';
import { StepOne } from './step-one';

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
  tokenASymbol: z.string().min(1, 'Choose token'),
  tokenBSymbol: z.string().min(1, 'Choose token'),
  feeTier: z.string().min(1, 'Choose fee tier'),
  depositAmountA: z
    .number({ invalid_type_error: 'Enter amount' })
    .min(0.000001, 'Amount must be positive')
    .optional(),
  depositAmountB: z
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
  const persistStore = usePersistStore();

  const { depositLiquidity } = useLiquidity();

  const [isLoading, setIsLoading] = useState(false);

  /* ---------------- RHF ---------------- */
  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tokenASymbol: 'USDC',
      tokenBSymbol: '',
      depositAmountA: undefined,
      depositAmountB: undefined,
    },
  });

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    // If we have a pool_address, we might be able to infer tokens from it
    // For now, we'll use the amount if provided
    if (queryParams.amount) {
      methods.setValue('depositAmountA', Number(queryParams.amount), { shouldValidate: false });
    }

    // If action is provided, we could potentially pre-select certain flows
    // For now, this is just amount handling
  }, [queryParams, methods]);

  /* Which fields are validated per step */
  const stepFields: Record<number, (keyof FormValues)[]> = {
    0: ['tokenASymbol', 'tokenBSymbol'],
    1: ['depositAmountA', 'depositAmountB'],
  };

  /* ------------- helpers --------------- */
  const watchTokenA = methods.watch('tokenASymbol');
  const watchTokenB = methods.watch('tokenBSymbol');
  const watchAmountA = methods.watch('depositAmountA');
  const watchAmountB = methods.watch('depositAmountB');

  // Check if wallet is connected
  const isWalletConnected = !!persistStore.wallet.address;

  // Get user balance for the selected tokens
  const { data: tokenABalance } = useTokenBalance(watchTokenA);
  const { data: tokenBBalance } = useTokenBalance(watchTokenB);

  // Check if user has insufficient balance
  const hasInsufficientBalance = () => {
    if (!isWalletConnected || !watchAmountA || !tokenABalance) {
      return false;
    }

    // Convert the user input amount to the token's smallest unit (considering decimals)
    const requiredAmount = BigInt(
      Math.floor(watchAmountA * Math.pow(10, constants.StellarConfig.XLM_DECIMALS))
    );
    return tokenABalance.data < requiredAmount;
  };

  const getButtonLabel = () => {
    if (step === 0) return watchTokenA && watchTokenB ? 'Continue' : 'Select token';
    if (step === 1) {
      if (!watchAmountA) return 'Enter amount';
      if (!isWalletConnected) return 'Connect Wallet';
      if (hasInsufficientBalance()) return 'Insufficient balance';
      return 'Continue';
    }
    return 'Continue';
  };

  const isStepInvalid = () => {
    if (step === 0) return !watchTokenA || !watchTokenB;
    if (step === 1) {
      if (!watchAmountA) return true;
      if (!isWalletConnected) return false; // Allow wallet connection
      if (hasInsufficientBalance()) return true; // Disable if insufficient balance
      return false;
    }
    return false;
  };

  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (step === 0) return !watchTokenA || !watchTokenB;
    return false;
  };

  /* ------- main CTA click handler ------------------------------------ */
  const handleMainButtonClick = async () => {
    if (isLoading) return;

    // ----- Step-2 special case  ---------------------------------------
    if (step === 1 && watchAmountA !== undefined) {
      if (!isWalletConnected) {
        // Wallet connection is handled by WalletGate component
        return;
      }
      if (hasInsufficientBalance()) {
        // Button is disabled for insufficient balance
        return;
      }

      await depositLiquidity({
        tokens: [watchTokenA, watchTokenB],
        pool_index: Buffer.from(''),
        desired_amounts: [watchAmountA, watchAmountB],
        min_shares: 0,
      });
      return;
    }

    if (step == 2 && watchAmountA !== undefined && watchAmountB !== undefined) {
      depositLiquidity({
        tokens: [watchTokenA, watchTokenB],
        pool_index: Buffer.from(''),
        desired_amounts: [watchAmountA, watchAmountB],
        min_shares: 0,
      });
    }

    // ----- normal flow (validate & advance) ---------------------------
    setIsLoading(true);
    const ok = await methods.trigger(stepFields[step]);
    setIsLoading(false);

    if (ok) (isLastStep ? onReset : onNext)();
  };

  /* ------------- render --------------- */
  return (
    <FormProvider {...methods}>
      <Stack direction="column" justifyContent="space-between" minHeight={312} sx={{ width: 1 }}>
        {/* ---- step body ---- */}
        <Box>
          {step === 0 && <StepOne tokens={tokens} />}
          {step === 1 && <StepTwo />}
        </Box>

        {/* ---- navigation ---- */}
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          {step === 1 && watchAmountA ? (
            <WalletGate buttonText={getButtonLabel()} fullWidth variant="soft" color="success">
              <Button
                fullWidth
                variant="soft"
                color="success"
                size="large"
                onClick={handleMainButtonClick}
                disabled={isButtonDisabled()}
              >
                {getButtonLabel()}
              </Button>
            </WalletGate>
          ) : (
            <Button
              fullWidth
              variant="soft"
              color="success"
              size="large"
              onClick={handleMainButtonClick}
              disabled={isButtonDisabled()}
            >
              {getButtonLabel()}
            </Button>
          )}
        </Stack>
      </Stack>
    </FormProvider>
  );
}
