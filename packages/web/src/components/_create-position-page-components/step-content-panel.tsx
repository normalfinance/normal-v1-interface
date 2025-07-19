'use client';

import type { StateToken } from '@normalfinance/types';
import type { PositionQueryParams } from '@/types/query-params';

import { z } from 'zod';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import useTokenBalance from '@/hooks/stellar/use-token-balance';
import { useAppStore, usePersistStore } from '@normalfinance/state';

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
  tokenASymbol: z.string().min(1, 'Pick token A'),
  tokenBSymbol: z.literal('XLM'),
  depositAmount: z
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
  const store = useAppStore();
  const persistStore = usePersistStore();

  const [isLoading, setIsLoading] = useState(false);

  /* ---------------- RHF ---------------- */
  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tokenASymbol: '',
      tokenBSymbol: 'XLM',
      depositAmount: undefined,
    },
  });

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    // If we have a pool_address, we might be able to infer tokens from it
    // For now, we'll use the amount if provided
    if (queryParams.amount) {
      methods.setValue('depositAmount', Number(queryParams.amount), { shouldValidate: false });
    }

    // If action is provided, we could potentially pre-select certain flows
    // For now, this is just amount handling
  }, [queryParams, methods]);

  /* Which fields are validated per step */
  const stepFields: Record<number, (keyof FormValues)[]> = {
    0: ['tokenASymbol'],
    1: ['depositAmount'],
  };

  /* ------------- helpers --------------- */
  const watchToken = methods.watch('tokenASymbol');
  const watchAmount = methods.watch('depositAmount');
  const selectedToken = store.tokens.find((t) => t.symbol === watchToken) ?? null;

  // Check if wallet is connected
  const isWalletConnected = !!persistStore.wallet.address;

  // Get token balance for the selected token
  const { data: tokenBalance, isLoading: balanceLoading } = useTokenBalance(
    selectedToken?.id || null
  );

  // Check if user has insufficient balance
  const hasInsufficientBalance = () => {
    if (!isWalletConnected || !selectedToken || !watchAmount || !tokenBalance) {
      return false;
    }

    // Convert the user input amount to the token's smallest unit (considering decimals)
    const requiredAmount = BigInt(Math.floor(watchAmount * Math.pow(10, selectedToken.decimals)));
    return tokenBalance.data < requiredAmount;
  };

  const getButtonLabel = () => {
    if (step === 0) return watchToken ? 'Continue' : 'Select token';
    if (step === 1) {
      if (!watchAmount) return 'Enter amount';
      if (!isWalletConnected) return 'Connect Wallet';
      if (hasInsufficientBalance()) return `Insufficient ${selectedToken?.symbol || 'balance'}`;
      return 'Continue';
    }
    return 'Continue';
  };

  const isStepInvalid = () => {
    if (step === 0) return !watchToken;
    if (step === 1) {
      if (!watchAmount) return true;
      if (!isWalletConnected) return false; // Allow wallet connection
      if (hasInsufficientBalance()) return true; // Disable if insufficient balance
      return false;
    }
    return false;
  };

  const isButtonDisabled = () => {
    if (isLoading) return true;
    if (step === 0) return !watchToken;
    if (step === 1) {
      if (!watchAmount) return true;
      if (!isWalletConnected) return false; // Allow wallet connection
      if (hasInsufficientBalance()) return true; // Disable if insufficient balance
      return false;
    }
    return false;
  };

  /* ------- main CTA click handler ------------------------------------ */
  const handleMainButtonClick = async () => {
    if (isLoading) return;

    // ----- Step-2 special case  ---------------------------------------
    if (step === 1 && watchAmount !== undefined) {
      if (!isWalletConnected) {
        // Wallet connection is handled by WalletGate component
        return;
      }
      if (hasInsufficientBalance()) {
        // Button is disabled for insufficient balance
        return;
      }
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
          {step === 1 && <StepTwo token={selectedToken} />}
        </Box>

        {/* ---- navigation ---- */}
        <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
          {step === 1 && watchAmount ? (
            <WalletGate buttonText={getButtonLabel()} fullWidth variant="soft" color="success">
              <Button fullWidth variant="soft" color="success" size="large" disabled>
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
          )}{' '}
        </Stack>
      </Stack>
    </FormProvider>
  );
}
