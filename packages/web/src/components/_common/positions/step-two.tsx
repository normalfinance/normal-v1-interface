'use client';

import { useTheme, alpha } from '@mui/material/styles';
import { Stack, Typography, InputBase, Box, Avatar } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import { sanitizeAmountInput } from '@/utils/input-helpers';
import { Token } from '@/types/token';
import { FormValues } from './step-content-panel';
import { fCurrency } from '@/utils/format-number';
import { column } from 'stylis';

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */
export interface StepTwoProps {
  token: Token | null; // ← token chosen on step-1
}

export default function StepTwo({ token }: StepTwoProps) {
  const theme = useTheme();
  const { control, setValue, watch } = useFormContext<FormValues>();

  // -- keep field in sync with the text input ------------------------
  const amount = watch('depositAmount') ?? '';
  const handleChange = (value: string) =>
    setValue('depositAmount', value === '' ? undefined : Number(value), {
      shouldValidate: true,
    });

  const fiatValue = token && amount !== '' ? Number(amount) * token.pricestatus : 0;

  return (
    <Stack spacing={3} width={1}>
      <Typography variant="h6">
        Step 2 – Enter&nbsp;amount {token ? `(${token.shortname})` : ''}
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
                  // 🔽  remove flexGrow so it doesn’t fill the column
                  '& input': { fontSize: 32, fontWeight: 700 },
                }}
              />
            )}
          />

          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
            {fiatValue > 0 ? fCurrency(fiatValue) : '$0'}
          </Typography>
        </Stack>

        {/* Token avatar / symbol */}
        {token && (
          <Stack
            alignItems="center"
            direction={'row'}
            spacing={1}
            sx={{ mr: 2, borderRadius: 99, p: 1 }}
          >
            <Avatar src={token.url} sx={{ width: 32, height: 32 }} />
            <Typography variant="body1" fontWeight={'bold'}>
              {token.shortname}
            </Typography>
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
