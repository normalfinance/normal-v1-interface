'use client';

import type { StateToken as Token } from '@normalfinance/types';

import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { Controller, useFormContext } from 'react-hook-form';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Avatar, InputBase, Typography } from '@mui/material';

import type { FormValues } from './step-content-panel';

interface StepTwoProps {
  tokenA: Token;
  tokenB: Token;
}

export const StepTwo: React.FC<StepTwoProps> = ({ tokenA, tokenB }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { control, setValue, watch } = useFormContext<FormValues>();
  const { enqueueSnackbar } = useSnackbar();

  // -- keep field in sync with the text input ------------------------
  const watchAmountA = watch('amountA') ?? '';
  const watchAmountB = watch('amountB') ?? '';
  const watchTokenA = watch('tokenA');
  const watchTokenB = watch('tokenB');

  const handleChange = (index: 0 | 1, value: string) => {
    let valueKey: 'amountA' | 'amountB' = 'amountA';

    if (index === 0) {
      if (tokenA) {
        const max = tokenA.balance;
        if (Number(value) > max) {
          enqueueSnackbar(t('Amount greater than wallet balance'), { variant: 'error' });
        }
      }
    } else {
      valueKey = 'amountB';

      if (tokenB) {
        const max = tokenB.balance;
        if (Number(value) > max) {
          enqueueSnackbar(t('Amount greater than wallet balance'), { variant: 'error' });
        }
      }
    }

    setValue(valueKey, value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });
  };

  return (
    <Stack spacing={3} width={1}>
      {}
      <Typography variant="subtitle1">{t('Deposit tokens')}</Typography>
      <Typography variant="caption" color={theme.palette.text.secondary} mb={2.5} mt={1}>
        {t('Specify the token amounts for your liquidity contribution.')}
      </Typography>

      {/* ---- amount input ------------------------------------------- */}
      <Box
        sx={{
          width: 1,
          height: 160,
          p: 2,
          display: 'flex',
          alignItems: 'start',
          justifyContent: 'space-between',
          gap: 2,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.grey[500], 0.08),
        }}
      >
        {/* Numeric field controlled by RHF */}
        <Stack
          flexGrow={1}
          minWidth={0}
          sx={{
            height: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start', // (default is fine)
            justifyContent: 'space-between',
          }}
        >
          <Controller
            name="amountA"
            control={control}
            render={() => (
              <InputBase
                value={watchAmountA}
                type="number"
                onChange={(e) => handleChange(0, sanitizeAmountInput(e.target.value))}
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
            {fCurrency(
              tokenA && watchAmountA
                ? BigNumber(watchAmountA).multipliedBy(tokenA.price).toFixed(2)
                : 0
            )}
          </Typography>
        </Stack>

        {/* Token avatar / symbol */}
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
          sx={{ mr: 2, borderRadius: 99, p: 1 }}
        >
          {tokenA ? (
            <>
              <Avatar
                src={tokenA.icon ?? getCryptoIconUrl(tokenA.symbol)}
                sx={{ width: 32, height: 32 }}
              />
              <Typography variant="body1" fontWeight="bold">
                {tokenA.symbol}
              </Typography>
            </>
          ) : (
            'Select token'
          )}
        </Stack>
      </Box>

      {/* ---- amount input ------------------------------------------- */}
      <Box
        sx={{
          width: 1,
          height: 160,
          p: 2,
          display: 'flex',
          alignItems: 'start',
          justifyContent: 'space-between',
          gap: 2,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.grey[500], 0.08),
        }}
      >
        {/* Numeric field controlled by RHF */}
        <Stack
          flexGrow={1}
          minWidth={0}
          sx={{
            height: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start', // (default is fine)
            justifyContent: 'space-between',
          }}
        >
          <Controller
            name="amountB"
            control={control}
            render={() => (
              <InputBase
                value={watchAmountB}
                type="number"
                onChange={(e) => handleChange(1, sanitizeAmountInput(e.target.value))}
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
            {fCurrency(
              tokenB && watchAmountB
                ? BigNumber(watchAmountB).multipliedBy(tokenB.price).toFixed(2)
                : 0
            )}
          </Typography>
        </Stack>

        {/* Token avatar / symbol */}
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
          sx={{ mr: 2, borderRadius: 99, p: 1 }}
        >
          {tokenB ? (
            <>
              <Avatar
                src={tokenB.icon ?? getCryptoIconUrl(tokenB.symbol)}
                sx={{ width: 32, height: 32 }}
              />
              <Typography variant="body1" fontWeight="bold">
                {tokenB.symbol}
              </Typography>
            </>
          ) : (
            'Select token'
          )}
        </Stack>
      </Box>
    </Stack>
  );
};
