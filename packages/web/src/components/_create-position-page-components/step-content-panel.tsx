'use client';

import type { StateToken } from '@normalfinance/types';

import { z } from 'zod';
import { useState } from 'react';
import { useAppStore } from '@normalfinance/state';
import { zodResolver } from '@hookform/resolvers/zod';
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
}: StepContentPanelProps) {
  const store = useAppStore();

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

  /* Which fields are validated per step */
  const stepFields: Record<number, (keyof FormValues)[]> = {
    0: ['tokenASymbol'],
    1: ['depositAmount'],
  };

  /* ------------- helpers --------------- */
  const watchToken = methods.watch('tokenASymbol');
  const watchAmount = methods.watch('depositAmount');
  const selectedToken = store.tokens.find((t) => t.symbol === watchToken) ?? null;

  const getButtonLabel = () => {
    if (step === 0) return watchToken ? 'Continue' : 'Select token';
    if (step === 1) return watchAmount ? 'Connect Wallet' : 'Enter amount';
    return 'Continue';
  };

  const isStepInvalid = () => {
    if (step === 0) return !watchToken;
    if (step === 1) return watchAmount === undefined;
    return false;
  };

  const handleConnectWallet = () => {
    // 👉 implement real wallet connect here
    console.log('🔌  connect wallet…');
  };

  /* ------- main CTA click handler ------------------------------------ */
  const handleMainButtonClick = async () => {
    if (isLoading) return;

    // ----- Step-2 special case  ---------------------------------------
    if (step === 1 && watchAmount !== undefined) {
      handleConnectWallet(); // ⬅️  just open wallet modal
      return; // ⬅️  do NOT advance the stepper
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
          <WalletGate buttonText={getButtonLabel()} fullWidth variant="soft" color="success">
            <Button
              fullWidth
              variant="soft"
              color="success"
              size="large"
              onClick={handleMainButtonClick}
              disabled={isLoading || isStepInvalid()}
            >
              {getButtonLabel()}
            </Button>
          </WalletGate>
        </Stack>
      </Stack>
    </FormProvider>
  );
}
