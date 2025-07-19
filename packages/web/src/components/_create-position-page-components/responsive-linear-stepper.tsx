'use client';

import { useTranslate } from '@/locales';

import {
  Box,
  Step,
  Stepper,
  useTheme,
  StepLabel,
  Typography,
  StepContent,
  useMediaQuery,
} from '@mui/material';

const steps = [
  { label: 'Step 1', description: 'Select Normal Token.' },
  { label: 'Step 2', description: 'Set XLM deposit amount.' },
];

interface ResponsiveStepperProps {
  activeStep: number;
}

export function ResponsiveLinearStepper({ activeStep }: ResponsiveStepperProps) {
  const { t } = useTranslate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const vertical = !isMobile; // vertical on ≥md

  /* ------------------------------------------------------------ */
  /* Render                                                       */
  /* ------------------------------------------------------------ */
  return (
    <Box sx={{ width: 1 }}>
      <Stepper
        activeStep={activeStep}
        orientation={vertical ? 'vertical' : 'horizontal'}
        sx={(_theme) => ({
          '& .MuiStepIcon-root': {
            width: 24,
            height: 24,
            fontSize: 12,
            color: _theme.palette.grey[400],
            backgroundColor: _theme.palette.text.primary,
            borderRadius: '50%',
          },
          '& .Mui-active .MuiStepIcon-root': { color: _theme.palette.text.primary },
          '& .Mui-active .MuiStepIcon-text': { fill: _theme.palette.common.white },
          '& .Mui-completed .MuiStepIcon-root': {
            color: _theme.palette.grey[400],
            backgroundColor: _theme.palette.text.primary,
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
                  {t(s.description)}
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
