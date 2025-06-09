'use client';

import {
  Box,
  Step,
  Button,
  Stepper,
  StepLabel,
  StepContent,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { varAlpha } from 'minimal-shared/utils';

const steps = [
  { label: 'Step 1', description: 'Select token pair and fees.' },
  { label: 'Step 2', description: 'Set deposit amounts.' },
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
  const vertical = !isMobile; // vertical on ≥md

  /* ------------------------------------------------------------ */
  /* Helpers                                                      */
  /* ------------------------------------------------------------ */
  const isLast = activeStep === steps.length - 1;
  const nextLabel = isLast ? 'Finish' : 'Next';
  const handleNextClick = () => (isLast ? onReset() : onNext());

  /* ------------------------------------------------------------ */
  /* Render                                                       */
  /* ------------------------------------------------------------ */
  return (
    <Box sx={{ width: 1 }}>
      <Stepper
        activeStep={activeStep}
        orientation={vertical ? 'vertical' : 'horizontal'}
        sx={(t) => ({
          '& .MuiStepIcon-root': {
            width: 24,
            height: 24,
            fontSize: 12,
            color: t.palette.grey[400],
            backgroundColor: t.palette.text.primary,
            borderRadius: '50%',
          },
          '& .Mui-active .MuiStepIcon-root': { color: t.palette.text.primary },
          '& .Mui-active .MuiStepIcon-text': { fill: t.palette.common.white },
          '& .Mui-completed .MuiStepIcon-root': {
            color: t.palette.grey[400],
            backgroundColor: t.palette.text.primary,
          },
        })}
      >
        {steps.map((s) => (
          <Step key={s.label}>
            <StepLabel>
              <Typography variant="subtitle2">{s.label}</Typography>
            </StepLabel>

            {vertical && (
              <StepContent>
                <Typography variant="caption" color="text.secondary">
                  {s.description}
                </Typography>
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>

      {/* horizontal: description + navigation ------------------- */}
    </Box>
  );
}
