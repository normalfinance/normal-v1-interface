// app/components/_common/positions/create-position.tsx

'use client';

import type { CardProps } from '@mui/material/Card';
import type { StateToken as Token } from '@normalfinance/types';
import type { PositionQueryParams } from '@/types/query-params';

import { useState } from 'react';
import { useTranslate } from '@/locales';

import Card from '@mui/material/Card';
import { Box, Stack, alpha, Button, useTheme, Typography } from '@mui/material';

import { Iconify } from '@/components/template/iconify';

import { StepContentPanel } from './step-content-panel';
import { ResponsiveLinearStepper } from './responsive-linear-stepper';

interface CreatePositionProps extends CardProps {
  tokens: Token[];
  queryParams?: PositionQueryParams;
}

export const CreatePosition: React.FC<CreatePositionProps> = ({
  tokens,
  queryParams,
  sx,
  ...other
}) => {
  const theme = useTheme();

  const { t } = useTranslate('auto');

  /* ------------------------------------------------------------------ */
  /* wizard navigation state                                             */
  /* ------------------------------------------------------------------ */
  const totalSteps = 2; // bump to 3 when you add step-3
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, totalSteps));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  /* ------------------------------------------------------------------ */
  /* form reset → remount StepContentPanel                               */
  /* ------------------------------------------------------------------ */
  const [formKey, setFormKey] = useState(0); // ¦– bumping it forces remount

  const handleReset = () => {
    setFormKey((k) => k + 1); // clears RHF + Zod
    setActiveStep(0); // back to step-1
  };

  /* ------------------------------------------------------------------ */
  /* render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        borderRadius: 2,
        ...sx,
      }}
      {...other}
    >
      {/* ————————————————— Header ————————————————— */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h3">{t('New Position')}</Typography>

        <Stack direction="row" spacing={1}>
          {/* Reset */}
          <Button
            onClick={handleReset}
            sx={{
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              px: 1.5,
            }}
          >
            <Iconify icon="solar:restart-bold" width={16} sx={{ mr: 1 }} />
            {t('Reset')}
          </Button>

          {/* Settings (placeholder) */}
          <Button
            sx={{
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              p: 1,
            }}
          >
            <Iconify icon="ic-settings" width={24} />
          </Button>
        </Stack>
      </Stack>
      {/* ————————————————— Body ————————————————— */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 3 }}>
        {/* left column – stepper */}
        <Box sx={{ flexBasis: { md: '33.333%' }, flexShrink: 0, p: 2 }}>
          <ResponsiveLinearStepper
            activeStep={activeStep}
            onNext={handleNext}
            onBack={handleBack}
            onReset={handleReset}
          />
        </Box>

        {/* right column – step content */}
        <Box
          sx={{ flexGrow: 1, p: 2, borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}
        >
          {/* key={formKey} => fresh RHF instance after every reset */}
          <StepContentPanel
            key={formKey}
            step={activeStep}
            onNext={handleNext}
            onBack={handleBack}
            onReset={handleReset}
            isLastStep={activeStep === totalSteps}
            tokens={tokens}
            queryParams={queryParams}
          />
        </Box>
      </Stack>
    </Card>
  );
};
