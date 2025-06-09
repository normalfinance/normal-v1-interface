'use client';

import { useState } from 'react';
import { Avatar, Box, Button, Stack, Typography, alpha, useTheme } from '@mui/material';
import { useFormContext } from 'react-hook-form';

import { Token } from '@/types/token';
import PickToken from '../pick-token';
import { FormValues } from './step-content-panel';
import { Iconify } from '@/components/iconify';

interface StepOneProps {
  tokens: Token[];
}

export const StepOne: React.FC<StepOneProps> = ({ tokens }) => {
  const theme = useTheme();
  const { register, setValue, watch, clearErrors } = useFormContext<FormValues>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const tokenASymbol = watch('tokenASymbol');

  /** user picks a token */
  const handleSelect = (tok: Token) => {
    setValue('tokenASymbol', tok.shortname, { shouldValidate: true });
    clearErrors('tokenASymbol');
    setDialogOpen(false);
  };

  const selected = tokens.find((t) => t.shortname === tokenASymbol);
  const avatarSrc = selected?.logo ?? selected?.url;

  return (
    <Stack>
      {/* hidden input registers the field */}
      <input type="hidden" {...register('tokenASymbol')} />

      <Typography variant="subtitle1">Select pair</Typography>
      <Typography variant="caption" color={theme.palette.text.secondary} mb={2.5} mt={1}>
        Choose the tokens you want to provide liquidity for. You can select tokens on all supported
        networks
      </Typography>

      <Stack direction="row" spacing={2}>
        {/* token-A button */}
        <Button
          onClick={() => setDialogOpen(true)}
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
              {tokenASymbol ? (
                <>
                  <Avatar src={avatarSrc} sx={{ width: 24, height: 24, mr: 1 }} />
                  {tokenASymbol}
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

        {/* fixed Stellar XLM button */}
        <Button
          disabled
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
          <Avatar src="/assets/icons/cryptoIcons/xlm.svg" sx={{ width: 24, height: 24 }} />
          XLM
        </Button>
      </Stack>

      {/* token picker dialog */}
      <PickToken
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        buttonSource="A"
        tokens={tokens}
        onTokenSelect={handleSelect}
      />
    </Stack>
  );
};
