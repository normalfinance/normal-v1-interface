import { z } from 'zod';
import { isValidContractAddress } from '@normalfinance/utils';

export const VALID_FEE_TIERS = ['10', '30', '100'] as const;

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
