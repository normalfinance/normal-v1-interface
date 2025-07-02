'use client';;
import { useTranslate } from '@/locales';

import type { Token } from '@/types/token';

import { useState } from 'react';
import { useTranslate } from '@/locales';
import { useFormContext } from 'react-hook-form';

<<<<<<< HEAD
import { Stack, alpha, Avatar, Button, useTheme, Typography } from '@mui/material';

=======
import { Token } from '@/types/token';
import { getCryptoIconUrl } from '@/utils/get-crypto-icon';
import PickToken from '../pick-token';
import { FormValues } from './step-content-panel';
>>>>>>> develop
import { Iconify } from '@/components/template/iconify';

import PickToken from '../pick-token';

import type { FormValues } from './step-content-panel';

interface StepOneProps {
  tokens: Token[];
}

export const StepOne: React.FC<StepOneProps> = ({ tokens }) => {
  const theme = useTheme();
  const { t } = useTranslate('auto');
  const { register, setValue, watch, clearErrors } = useFormContext<FormValues>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const tokenASymbol = watch('tokenASymbol');

  /** user picks a token */
  const handleSelect = (tok: Token) => {
    setValue('tokenASymbol', tok.shortname, { shouldValidate: true });
    clearErrors('tokenASymbol');
    setDialogOpen(false);
  };

<<<<<<< HEAD
  const selected = tokens.find((tkn) => tkn.shortname === tokenASymbol);
  const avatarSrc = selected?.logo ?? selected?.url;
=======
  const selected = tokens.find((t) => t.shortname === tokenASymbol);
  const avatarSrc = selected ? (selected.logo ?? getCryptoIconUrl(selected.shortname)) : undefined;
>>>>>>> develop

  return (
    <Stack>
      {/* hidden input registers the field */}
      <input type="hidden" {...register('tokenASymbol')} />
      <Typography variant="subtitle1">{t('Select pair')}</Typography>
<<<<<<< HEAD
      <Typography variant="caption" color={theme.palette.text.secondary} mb={2.5} mt={1}>
        {t(
          'Choose the tokens you want to provide liquidity for. You can select tokens on all supported networks'
        )}
      </Typography>
=======
      <Typography variant="caption" color={theme.palette.text.secondary} mb={2.5} mt={1}>{t(
        'Choose the tokens you want to provide liquidity for. You can select tokens on all supported networks',
      )}</Typography>
>>>>>>> develop
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
<<<<<<< HEAD
          <Avatar src="/assets/icons/cryptoIcons/xlm.svg" sx={{ width: 24, height: 24 }} />
          {t('XLM')}
        </Button>
=======
          <Avatar src="/assets/icons/cryptoIcons/xlm.svg" sx={{ width: 24, height: 24 }} />{t('XLM')}</Button>
>>>>>>> develop
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
