// app/components/_common/positions/steps/step-two.tsx
'use client';

import { Stack, Typography, Slider, TextField, InputAdornment } from '@mui/material';

export default function StepTwo() {
  return (
    <Stack spacing={3}>
      <Typography variant="h6">Step 2 – Set price range</Typography>

      {/* Min / Max price inputs */}
      <Stack direction="row" spacing={2}>
        <TextField
          label="Min price"
          fullWidth
          type="number"
          defaultValue={1000}
          InputProps={{ endAdornment: <InputAdornment position="end">USDC</InputAdornment> }}
        />
        <TextField
          label="Max price"
          fullWidth
          type="number"
          defaultValue={2500}
          InputProps={{ endAdornment: <InputAdornment position="end">USDC</InputAdornment> }}
        />
      </Stack>

      {/* Slider preview */}
      <Slider value={[1000, 2500]} min={0} max={5000} valueLabelDisplay="auto" sx={{ mt: 4 }} />
    </Stack>
  );
}
