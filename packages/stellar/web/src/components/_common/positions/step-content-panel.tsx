import { Box, Button, Stack, Typography } from '@mui/material';
import StepOne from './step-one';
import StepTwo from './step-two';

export function StepContentPanel({
  step,
  onNext,
  onBack,
  onReset,
  isLastStep,
}: {
  step: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  isLastStep: boolean;
}) {
  return (
    <Box>
      {/* Render the component that belongs to the current step */}
      {step === 0 && <StepOne />}
      {step === 1 && <StepTwo />}
      {/* {step === 2 && <StepThree />} */}

      {/* Navigation buttons */}
      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <Button disabled={step === 0} onClick={onBack}>
          Back
        </Button>

        {isLastStep ? (
          <Button variant="contained" onClick={onReset}>
            Finish
          </Button>
        ) : (
          <Button variant="contained" onClick={onNext}>
            Next
          </Button>
        )}
      </Stack>
    </Box>
  );
}
