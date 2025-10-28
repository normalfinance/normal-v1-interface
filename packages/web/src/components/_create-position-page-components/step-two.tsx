'use client';

import { useSnackbar } from 'notistack';
import { useTranslate } from '@/locales';
import { useTokenBalance } from '@/hooks';
import { getCryptoIconUrl } from '@normalfinance/utils';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { Controller, useFormContext } from 'react-hook-form';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Avatar, InputBase, Typography } from '@mui/material';

import type { FormValues } from './step-content-panel';

export default function StepTwo() {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { control, setValue, watch } = useFormContext<FormValues>();
  const { enqueueSnackbar } = useSnackbar();

  // -- keep field in sync with the text input ------------------------
  const amountA = watch('depositAmountA') ?? '';
  const amountB = watch('depositAmountB') ?? '';
  const tokenASymbol = watch('tokenASymbol');
  const tokenBSymbol = watch('tokenBSymbol');

  // Get user token balances
  const { data: tokenABalance } = useTokenBalance(tokenASymbol);
  const { data: tokenBBalance } = useTokenBalance(tokenBSymbol);

  // Get token prices
  // const { loading: priceLoading, price: tokenAPrice } = useTokenPrice(tokenASymbol);
  // const { loading: priceLoading, price: tokenAPrice } = useTokenPrice(tokenASymbol);

  const handleChange = (index: 0 | 1, value: string) => {
    let valueKey: 'depositAmountA' | 'depositAmountB' = 'depositAmountA';

    if (index === 0) {
      // Token A
      if (tokenABalance) {
        const max = Number(tokenABalance.data);
        if (Number(value) > max) {
          enqueueSnackbar(t('Amount greater than wallet balance'), { variant: 'error' });
        }
      }
    } else {
      // Token B
      valueKey = 'depositAmountB';

      if (tokenBBalance) {
        const max = Number(tokenBBalance.data);
        if (Number(value) > max) {
          enqueueSnackbar(t('Amount greater than wallet balance'), { variant: 'error' });
        }
      }
    }

    setValue(valueKey, value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });
  };

  // TODO:
  // const fiatValue = useMemo(() => {
  //   if (xlmPrice && amount) {
  //     return xlmPrice.multipliedBy(amount);
  //   }
  //   return BigNumber(0);
  // }, [xlmPrice, amount]);

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
            name="depositAmountA"
            control={control}
            render={() => (
              <InputBase
                value={amountA}
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

          {/* <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
            {fCurrency(fiatValue.toFixed(2))}
          </Typography> */}
        </Stack>

        {/* Token avatar / symbol */}
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
          sx={{ mr: 2, borderRadius: 99, p: 1 }}
        >
          <Avatar src={getCryptoIconUrl(tokenASymbol)} sx={{ width: 32, height: 32 }} />
          <Typography variant="body1" fontWeight="bold">
            {tokenASymbol}
          </Typography>
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
            name="depositAmountB"
            control={control}
            render={() => (
              <InputBase
                value={amountB}
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

          {/* <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
            {fCurrency(fiatValue.toFixed(2))}
          </Typography> */}
        </Stack>

        {/* Token avatar / symbol */}
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
          sx={{ mr: 2, borderRadius: 99, p: 1 }}
        >
          <Avatar src={getCryptoIconUrl(tokenBSymbol)} sx={{ width: 32, height: 32 }} />
          <Typography variant="body1" fontWeight="bold">
            {tokenBSymbol}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
}
