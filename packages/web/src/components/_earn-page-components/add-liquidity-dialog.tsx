import type { Token } from '@normalfinance/types';

import React, { useState } from 'react';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';
import { format, getCryptoIconUrl } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Dialog,
  Button,
  TextField,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  InputAdornment,
} from '@mui/material';

import { Iconify } from '@/components/template/iconify';

/* ------------------------------------------------------------------ */
/* Zod schema                                                          */
/* ------------------------------------------------------------------ */
export const FormSchema = z.object({
  token: z
    .string()
    .min(1, 'Choose token')
    .max(56, 'Too long')
    .refine((val) => isValidContractAddress(val), {
      message: 'Must be a valid token',
    }),
  feeTier: z.enum(VALID_FEE_TIERS, { required_error: 'Choose fee tier' }),
  amount: z
    .number({ invalid_type_error: 'Enter amount' })
    .min(0.000001, 'Amount must be positive')
    .optional(),
});

export type FormValues = z.infer<typeof FormSchema>;

export interface AddLiquidityDialog {
  open: boolean;
  onClose: () => void;
  buttonSource?: string;
}

const AddLiquidityDialog: React.FC<AddLiquidityDialog> = ({ open, onClose, buttonSource }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');

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
      token: '',
      feeTier: VALID_FEE_TIERS[1], // 30
      amount: undefined,
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

    if (queryParams.feeTier) {
      if (queryParams.feeTier in VALID_FEE_TIERS) {
        methods.setValue('feeTier', queryParams.feeTier as (typeof VALID_FEE_TIERS)[number], {
          shouldValidate: false,
        });
      }
    }

    if (queryParams.amount) {
      methods.setValue('amount', Number(queryParams.amount), { shouldValidate: false });
    }

    // If action is provided, we could potentially pre-select certain flows
    // For now, this is just amount handling
  }, [queryParams, methods]);

  /* Which fields are validated per step */
  const stepFields: Record<number, (keyof FormValues)[]> = {
    1: ['token'],
    2: ['amount'],
  };

  /* ------------- helpers --------------- */
  const watchToken = methods.watch('token');
  const watchAmount = methods.watch('amount');

  // Check if wallet is connected
  const isWalletConnected = !!wallet.address;

  const token = tokens.find((tkn) => tkn.contract === watchToken);

  // Check if user has insufficient balance
  const hasInsufficientBalance = () => {
    if (!isWalletConnected || !watchAmount || !token) {
      return false;
    }

    return BigNumber(token.balance).lt(watchAmount);
  };

  const getButtonLabel = () => {
    if (!watchToken) return 'Select asset';
    if (!pool) return 'No pool found';

    if (!watchAmount) return 'Enter amount';
    if (!isWalletConnected) return 'Connect Wallet';
    if (hasInsufficientBalance()) return 'Insufficient balance';
    return 'Continue';
  };

  const isButtonDisabled = () => {
    if (loading) return true;
    return !watchToken || !pool || !watchAmount || hasInsufficientBalance();
  };

  /* ------- main CTA click handler ------------------------------------ */
  const handleMainButtonClick = async () => {
    if (loading) return;

    if (watchAmount !== undefined) {
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
    if (!token) {
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '600px',
          },
        },
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            {t('Add Liquidity')}
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" width={24} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 2,
          width: '100%',
          '&::-webkit-scrollbar': {
            width: '2px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: '4px',
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.palette.divider} transparent`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            height: '160px',
            padding: theme.spacing(2),
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '20px',
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
            overflow: 'hidden',
            textAlign: 'left',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              minWidth: 0,
              overflow: 'hidden',
              gap: 2,
            }}
          >
            <Typography variant="body1" noWrap data-testid="buy-token-picker">
              {t('Amount')}
            </Typography>

            <Box
              sx={{
                maxWidth: '100%',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              <Typography
                sx={{
                  display: 'inline-block',
                  fontSize: 'var(--h3-size, 32px)',
                  fontStyle: 'normal',
                  fontWeight: 'var(--h3-weight, 700)',
                  lineHeight: 'var(--h3-line-height, 48px)',
                  letterSpacing: 'var(--h3-letter-spacing, 0px)',
                  color: !quoteFetched ? theme.palette.text.secondary : theme.palette.text.primary,
                }}
              >
                {quoteFetched && token ? buyAmount.toFixed(6) : 0}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 'var(--components-nav-item-size, 14px)',
                fontStyle: 'normal',
                fontWeight: 'var(--components-nav-item-weight, 500)',
                lineHeight: 'var(--components-nav-item-line-height, 22px)',
                opacity: quoteFetched && token ? 1 : 0,
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }}
            >
              {token ? `${fCurrency(BigNumber(token.price).multipliedBy(buyAmount))}` : '$0'}
            </Typography>
          </Box>

          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              height: '128px',
              overflow: 'hidden',
            }}
          >
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
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AddLiquidityDialog;
