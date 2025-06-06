import type { CardProps } from '@mui/material/Card';

import React, { useState } from 'react';

import Card from '@mui/material/Card';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, Grid2, Stack, Typography } from '@mui/material';
import { Iconify } from '@/components/iconify';
import { StepContentPanel } from './step-content-panel';
import { ResponsiveLinearStepper } from './responsive-linear-stepper';

interface CreatePositionProps extends CardProps {}

export const CreatePosition: React.FC<CreatePositionProps> = ({
  sx,
  title,

  ...other
}) => {
  const theme = useTheme();

  // ⬇️ Active step lives here
  const [activeStep, setActiveStep] = useState(0);

  const totalSteps = 2; // change to 3 when you add the third component

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, totalSteps));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));
  const handleReset = () => setActiveStep(0);

  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        padding: 2.5,
        borderRadius: '16px',
        ...sx,
      }}
      {...other}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: 1 }}>
        <Typography
          sx={{
            fontSize: '40px',
            fontWeight: '500',

            ...sx,
          }}
        >
          New Position
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button
            sx={{
              borderRadius: '8px',
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.grey[500], 0.08),
              px: '12px',
              py: '8px',
            }}
          >
            <Stack direction="row" spacing={1} alignItems={'center'}>
              <Iconify
                width={16}
                icon="solar:restart-bold"
                sx={{
                  color: theme.palette.text.primary,
                }}
              />
              <Typography variant="body1">Reset</Typography>
            </Stack>
          </Button>

          <Button
            sx={{
              borderRadius: '8px',
              border: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.grey[500], 0.08),
              p: 1,
            }}
          >
            <Stack direction="row" spacing={1} alignItems={'center'}>
              <Iconify
                width={24}
                icon="ic-settings"
                sx={{
                  color: theme.palette.text.primary,
                }}
              />
            </Stack>
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }} // column on mobile, row on md+
        spacing={3}
        sx={{ mt: 3 }}
      >
        {/* — Left: Stepper — */}
        <Box
          sx={{
            flexBasis: { md: '33.333%' }, // 4 / 12 cols on ≥md
            flexShrink: 0, // keep its width
          }}
        >
          <ResponsiveLinearStepper
            activeStep={activeStep}
            onNext={handleNext}
            onBack={handleBack}
            onReset={handleReset}
          />
        </Box>

        {/* — Right: Step content — */}
        <Box sx={{ flexGrow: 1 /* takes remaining space */ }}>
          <StepContentPanel
            step={activeStep}
            onNext={handleNext}
            onBack={handleBack}
            onReset={handleReset}
            isLastStep={activeStep === totalSteps}
          />
        </Box>
      </Stack>
    </Card>
  );
};
