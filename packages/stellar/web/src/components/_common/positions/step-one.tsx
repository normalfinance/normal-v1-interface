// app/components/_common/positions/steps/step-one.tsx
'use client';

import { Box, Stack, TextField, MenuItem, Typography, Button } from '@mui/material';

export default function StepOne() {
  return (
    <Stack spacing={3} width={1}>
      <Typography variant="h6">Step 1 – Select token pair &amp; fee tier</Typography>

      {/* Token A */}
      <TextField select label="Token A" fullWidth defaultValue="USDC">
        <MenuItem value="USDC">USDC</MenuItem>
        <MenuItem value="ETH">ETH</MenuItem>
        <MenuItem value="DAI">DAI</MenuItem>
      </TextField>

      {/* Token B */}
      <TextField select label="Token B" fullWidth defaultValue="ETH">
        <MenuItem value="ETH">ETH</MenuItem>
        <MenuItem value="USDC">USDC</MenuItem>
        <MenuItem value="WBTC">WBTC</MenuItem>
      </TextField>

      {/* Fee tier */}
      <TextField select label="Fee tier" fullWidth defaultValue="0.05%">
        <MenuItem value="0.01%">0.01 %</MenuItem>
        <MenuItem value="0.05%">0.05 %</MenuItem>
        <MenuItem value="0.30%">0.30 %</MenuItem>
      </TextField>

      {/* Optional preview area */}
      <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Pair preview will appear here…
        </Typography>
      </Box>
    </Stack>
  );
}
