'use client';

import type { Ref } from 'react';

import { paths } from '@/routes/paths';
import { useTranslate } from '@/locales';

import { alpha, useTheme } from '@mui/material/styles';
import { Box, Stack, Checkbox, Typography, Link as MuiLink } from '@mui/material';

type Props = {
  checked: boolean;
  showError: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  cardRef?: Ref<HTMLLabelElement>;
};

// Required consent, drawn as its own card rather than a line of small print.
// The submit buttons stay clickable on purpose: a greyed-out button explains
// nothing, so a click lands here instead and turns this card red.
export function AuthConsent({ checked, showError, disabled = false, onChange, cardRef }: Props) {
  const { t } = useTranslate();
  const theme = useTheme();

  const tone = showError
    ? theme.palette.error.main
    : checked
      ? theme.palette.success.main
      : theme.palette.text.primary;

  const stopLabelToggle = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <Box
      ref={cardRef}
      component="label"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        p: '10px 12px 10px 8px',
        borderRadius: 'var(--radius-md)',
        border: '1.5px solid',
        borderColor: alpha(tone, showError || checked ? 0.72 : 0.22),
        bgcolor: alpha(tone, showError || checked ? 0.07 : 0.025),
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color 160ms, background-color 160ms',
      }}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        slotProps={{ input: { 'aria-required': true, 'aria-invalid': showError } }}
        sx={{ p: 0.5 }}
      />
      <Box sx={{ flex: 1, minWidth: 0, pt: '5px' }}>
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.45 }}>
            {t('I agree to the ')}
            <MuiLink
              href={paths.legal.tos}
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              underline="always"
              onClick={stopLabelToggle}
            >
              {t('Terms of Service')}
            </MuiLink>
            {t(' and ')}
            <MuiLink
              href={paths.legal.pp}
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              underline="always"
              onClick={stopLabelToggle}
            >
              {t('Privacy Policy')}
            </MuiLink>
          </Typography>
          {!checked && (
            <Typography
              component="span"
              sx={{
                flexShrink: 0,
                px: 0.875,
                py: '1px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                fontWeight: 500,
                lineHeight: '18px',
                color: showError ? 'error.main' : 'text.secondary',
                bgcolor: alpha(tone, 0.08),
              }}
            >
              {t('Required')}
            </Typography>
          )}
        </Stack>
        {showError && (
          <Typography
            role="alert"
            variant="caption"
            sx={{ display: 'block', mt: 0.25, color: 'error.main', fontWeight: 500 }}
          >
            {t('Tick this box to continue.')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
