'use client';

import type { Pool } from '@normalfinance/types';
import type { DepositLiquidityQueryParams } from '@/types/query-params';

import { z } from 'zod';
import { useLiquidity } from '@/hooks';
import { useTranslate } from '@/locales';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePersistStore } from '@normalfinance/state';
import { useForm, FormProvider } from 'react-hook-form';
import { constants, sortTokenAddreses, isValidContractAddress } from '@normalfinance/utils';

import { Box, Alert, Stack } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';

import { WalletGate } from '@/components/_common/wallet-gate';

import { StepOne } from './step-one';
import { StepTwo } from './step-two';

const VALID_FEE_TIERS = ['10', '30', '100'] as const;

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */
export interface StepContentPanelProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  isLastStep: boolean;
  queryParams?: DepositLiquidityQueryParams;
}

/* ------------------------------------------------------------------ */
/* Zod schema                                                          */
/* ------------------------------------------------------------------ */
export const FormSchema = z.object({
  tokenA: z
    .string()
    .min(1, 'Choose token')
    .max(56, 'Too long')
    .refine((val) => isValidContractAddress(val), {
      message: 'Must be a valid token',
    }),
  tokenB: z
    .string()
    .min(1, 'Choose token')
    .max(56, 'Too long')
    .refine((val) => isValidContractAddress(val), {
      message: 'Must be a valid token',
    }),
  feeTier: z.enum(VALID_FEE_TIERS, { required_error: 'Choose fee tier' }),
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
  queryParams,
}: StepContentPanelProps) {
  const { t } = useTranslate();

  const {
    wallet,
    tokenState: { tokens },
    poolState: { poolsByTokens },
  } = usePersistStore();

  const { loading, setLoading, depositLiquidity } = useLiquidity();

  const [pool, setPool] = useState<Pool | null>(null);

  /* ---------------- RHF ---------------- */
  const methods = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      tokenA: constants.StellarConfig.USDC_ADDRESS,
      tokenB: '',
      feeTier: VALID_FEE_TIERS[1], // 30
      amountA: undefined,
      amountB: undefined,
    },
  });

  // Initialize from query params
  useEffect(() => {
    if (!queryParams) return;

    if (queryParams.tokenA) {
      if (isValidContractAddress(queryParams.tokenA)) {
        methods.setValue('tokenA', queryParams.tokenA, { shouldValidate: false });
      }
    }

    if (queryParams.tokenB) {
      if (isValidContractAddress(queryParams.tokenB)) {
        methods.setValue('tokenB', queryParams.tokenB, { shouldValidate: false });
      }
    }

    if (queryParams.feeTier) {
      if (queryParams.feeTier in VALID_FEE_TIERS) {
        methods.setValue('feeTier', queryParams.feeTier as (typeof VALID_FEE_TIERS)[number], {
          shouldValidate: false,
        });
      }
    }

    if (queryParams.amountA) {
      methods.setValue('amountA', Number(queryParams.amountA), { shouldValidate: false });
    }

    if (queryParams.amountB) {
      methods.setValue('amountB', Number(queryParams.amountB), { shouldValidate: false });
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

    return tokenA.balance < watchAmountA || tokenB.balance < watchAmountB;
  };

  const getButtonLabel = () => {
    if (step === 1) {
      if (watchTokenA && watchTokenB) {
        if (!pool) return 'No pool found';
        return 'Continue';
      }
      return 'Select token';
    }
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
    if (step === 1) return !watchTokenA || !watchTokenB || !pool;
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

      if (!pool) {
        alert('No pool found');
        return;
      }

      await depositLiquidity({
        tokens: [watchTokenA, watchTokenB],
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

  // Find pool whenever relevant fields change: sellToken, buyToken
  useEffect(() => {
    // Clear old state each time we start a new fetch
    setLoading(false);
    setPool(null);

    // Make sure we have both tokens
    if (!tokenA || !tokenB) {
      return;
    }

    // Make sure pools are loaded
    if (!Object.keys(poolsByTokens).length) {
      return;
    }

    const { tokens: sortedTokens } = sortTokenAddreses(tokenA.contract, tokenB.contract);
    const tokensKey = sortedTokens.join(':');

    const pools = poolsByTokens[tokensKey];

    if (!pools || pools.length === 0) {
      return;
    }

    // TODO: Once we support multiple fee fractions for the same pair, this index can be 1 or 2
    const selectedpool = pools[0];

    setPool(selectedpool);
  }, [tokenA, tokenB]);

  /* ------------- render --------------- */
  return (
    <FormProvider {...methods}>
      <Stack direction="column" justifyContent="space-between" minHeight={312} sx={{ width: 1 }}>
        {/* ---- step body ---- */}
        <Box>
          {step === 1 && <StepOne tokens={tokens} />}
          {step === 2 && (
            <>
              {tokenA && tokenB ? (
                <StepTwo tokenA={tokenA} tokenB={tokenB} />
              ) : (
                <Alert severity="error">{t('Unable to load tokens for pool.')}</Alert>
              )}
            </>
          )}
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
