'use client';

import { useMemo } from 'react';
import { useSnackbar } from 'notistack';
import { BigNumber } from 'bignumber.js';
import { useTranslate } from '@/locales';
import { fCurrency } from '@/utils/format-number';
import { useTokenPrice, useTokenBalance } from '@/hooks';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { Controller, useFormContext } from 'react-hook-form';
import { format, constants, getCryptoIconUrl } from '@normalfinance/utils';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Avatar, InputBase, Typography } from '@mui/material';

import type { FormValues } from './step-content-panel';

export default function StepTwo() {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { control, setValue, watch } = useFormContext<FormValues>();
  const { enqueueSnackbar } = useSnackbar();

  // Get token balance for XLM
  const { data: tokenBalance, isLoading: balanceLoading } = useTokenBalance(
    constants.StellarConfig.XLM_ADDRESS
  );
  const { loading: priceLoading, price: xlmPrice } = useTokenPrice('XLM');

  // -- keep field in sync with the text input ------------------------
  const amount = watch('depositAmount') ?? '';
  const handleChange = (value: string) => {
    if (tokenBalance) {
      const max = Number(tokenBalance.data);
      if (Number(value) > max) {
        enqueueSnackbar(t('Amount greater than wallet balance'), { variant: 'error' });
      }

      setValue('depositAmount', value === '' ? undefined : Number(value), {
        shouldValidate: true,
      });
    }
  };

  const fiatValue = useMemo(() => {
    if (xlmPrice && amount) {
      const xlm_price = BigNumber(format.formatTokenAmount(xlmPrice, 14));
      return xlm_price.multipliedBy(amount);
    }
    return BigNumber(0);
  }, [xlmPrice, amount]);

  return (
    <Stack spacing={3} width={1}>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <Typography variant="h6">{t('Step 2 – Enter amount')}&nbsp;(XLM)</Typography>
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
            name="depositAmount"
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

        {/* Token avatar / symbol */}
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
    </Stack>
  );
}
