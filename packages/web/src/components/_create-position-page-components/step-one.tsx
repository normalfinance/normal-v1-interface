'use client';

import type { StateToken } from '@normalfinance/types';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { useFormContext } from 'react-hook-form';
import { getCryptoIconUrl } from '@normalfinance/utils';

import { Stack, alpha, Avatar, Button, useTheme, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import PickToken from '../_common/pick-token';

import type { FormValues } from './step-content-panel';

interface StepOneProps {
  tokens: StateToken[];
}

export const StepOne: React.FC<StepOneProps> = ({ tokens }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { register, setValue, watch, clearErrors } = useFormContext<FormValues>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogIndex, setDialiogIndex] = useState<number>(0); // 0 for token A, 1 for token B

  const watchTokenA = watch('tokenA');
  const watchTokenB = watch('tokenB');

  /** user picks a token */
  const handleSelect = (tok: StateToken) => {
    let valueKey: 'tokenA' | 'tokenB' = 'tokenA';

    if (dialogIndex === 1) {
      valueKey = 'tokenB';
    }

    setValue(valueKey, tok.contract, { shouldValidate: true });
    clearErrors(valueKey);
    setDialogOpen(false);
  };

  const tokenA = tokens.find((tkn) => tkn.contract === watchTokenA);
  const tokenB = tokens.find((tkn) => tkn.contract === watchTokenB);

  return (
    <Stack>
      {/* hidden input registers the field */}
      <input type="hidden" {...register('tokenA')} />
      <input type="hidden" {...register('tokenB')} />

      <Typography variant="subtitle1">{t('Select pair')}</Typography>
      <Typography variant="caption" color={theme.palette.text.secondary} mb={2.5} mt={1}>
        {t('Choose the tokens you want to provide liquidity for.')}
      </Typography>

      <Stack direction="row" spacing={2}>
        {/* token-A button */}
        <Button
          onClick={() => {
            setDialiogIndex(0);
            setDialogOpen(true);
          }}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            minWidth: 140,
            justifyContent: 'flex-start',
            gap: 1,
            width: 1,
          }}
        >
          <Stack direction="row" justifyContent="space-between" sx={{ width: 1 }}>
            <Stack direction="row">
              {tokenA ? (
                <>
                  <Avatar
                    src={tokenA.icon ?? getCryptoIconUrl(tokenA.symbol)}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  />
                  {tokenA.symbol}
                </>
              ) : (
                'Select token'
              )}
            </Stack>
            <Iconify
              width={24}
              icon="eva:arrow-ios-downward-fill"
              sx={{
                color:
                  theme.palette.mode === 'light'
                    ? theme.palette.text.primary
                    : theme.palette.common.white,
              }}
            />
          </Stack>
        </Button>

        {/* token-B button */}
        <Button
          onClick={() => {
            setDialiogIndex(1);
            setDialogOpen(true);
          }}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            minWidth: 140,
            justifyContent: 'flex-start',
            gap: 1,
            width: 1,
          }}
        >
          <Stack direction="row" justifyContent="space-between" sx={{ width: 1 }}>
            <Stack direction="row">
              {tokenB ? (
                <>
                  <Avatar
                    src={tokenB.icon ?? getCryptoIconUrl(tokenB.symbol)}
                    sx={{ width: 24, height: 24, mr: 1 }}
                  />
                  {tokenB.symbol}
                </>
              ) : (
                'Select token'
              )}
            </Stack>
            <Iconify
              width={24}
              icon="eva:arrow-ios-downward-fill"
              sx={{
                color:
                  theme.palette.mode === 'light'
                    ? theme.palette.text.primary
                    : theme.palette.common.white,
              }}
            />
          </Stack>
        </Button>
      </Stack>

      {/* token picker dialog */}
      <PickToken
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
        }}
        buttonSource="A"
        tokens={tokens}
        onTokenSelect={handleSelect}
      />
    </Stack>
  );
};
