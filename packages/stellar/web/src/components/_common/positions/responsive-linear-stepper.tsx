'use client';

import { useState } from 'react';
import {
  Box,
  Step,
  Paper,
  Button,
  Stepper,
  StepLabel,
  StepContent,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { varAlpha } from 'minimal-shared/utils';

// Dummy data — reuse for both orientations
const steps = [
  {
    label: 'Step 1',
    description: 'Select token pair and fees.',
  },
  {
    label: 'Step 2',
    description: 'Set deposit amounts.',
  },
];

interface ResponsiveStepperProps {
  activeStep: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
}

export function ResponsiveLinearStepper({
  activeStep,
  onNext,
  onBack,
  onReset,
}: ResponsiveStepperProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const orientation = isMobile ? 'horizontal' : 'vertical';
  const isVertical = orientation === 'vertical';

  return (
    <Box sx={{ width: 1 }}>
      <Stepper activeStep={activeStep} orientation={orientation}>
        {steps.map((step, index) => {
          const stepProps: { completed?: boolean } = {};
          const labelProps: { optional?: React.ReactNode } = {};

          return (
            <Step key={step.label} {...stepProps}>
              <StepLabel {...labelProps}>{step.label}</StepLabel>

              {/* Render StepContent only in vertical mode */}
              {isVertical && (
                <StepContent>
                  <Typography>{step.description}</Typography>
                  <Box sx={{ mt: 3 }}></Box>
                </StepContent>
              )}
            </Step>
          );
        })}
      </Stepper>

      {/* Horizontal mode needs a separate “body” under the stepper */}
      {!isVertical && (
        <Paper
          sx={(theme) => ({
            p: 3,
            my: 3,
            minHeight: 120,
            bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
          })}
        >
          <Typography sx={{ mb: 2 }}>{steps[activeStep].description}</Typography>

          <Box sx={{ display: 'flex' }}>
            <Button color="inherit" disabled={activeStep === 0} onClick={onBack} sx={{ mr: 1 }}>
              Back
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" onClick={onNext}>
              {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* “All done” section (common) */}
      {activeStep === steps.length && (
        <Paper
          sx={(theme) => ({
            p: 3,
            my: 3,
            bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.12),
          })}
        >
          <Typography sx={{ mb: 2 }}>All steps completed — you’re finished</Typography>
          <Button onClick={onReset}>Reset</Button>
        </Paper>
      )}
    </Box>
  );
}
