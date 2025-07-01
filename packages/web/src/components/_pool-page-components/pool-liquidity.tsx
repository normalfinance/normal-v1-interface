// import React, { useMemo, useState, useCallback } from 'react';

// import TabPanel from '@mui/lab/TabPanel';
// import TabContext from '@mui/lab/TabContext';
// import { Box, Grid, Divider, Typography, Button as MuiButton } from '@mui/material';

// import { TokenBox } from '../../Swap';
// import { Button } from '../../Button/Button';

// /**
//  * LabTabs Component
//  */
// const LabTabs = ({
//   tokenA,
//   tokenB,
//   liquidityA,
//   liquidityB,
//   liquidityToken,
//   onAddLiquidity,
//   onRemoveLiquidity,
// }: LabTabProps) => {
//   const [value, setValue] = useState('1');
//   const [tokenAValue, setTokenAValue] = useState<string | undefined>(undefined);
//   const [tokenBValue, setTokenBValue] = useState<string | undefined>(undefined);
//   const [tokenCValue, setTokenCValue] = useState<string | undefined>(undefined);

//   const liquidityRatio = useMemo(() => liquidityA / liquidityB, [liquidityA, liquidityB]);

//   const keepRatioA = useCallback(
//     (val: string) => {
//       setTokenAValue(val);
//       setTokenBValue((Number(val) / liquidityRatio).toFixed(4));
//     },
//     [liquidityRatio]
//   );

//   const keepRatioB = useCallback(
//     (val: string) => {
//       setTokenBValue(val);
//       setTokenAValue((Number(val) * liquidityRatio).toFixed(4));
//     },
//     [liquidityRatio]
//   );

//   const buttonStyles = {
//     flex: 1,
//     maxWidth: '200px',
//     color: '#FFF',
//     fontSize: '0.875rem',
//     fontWeight: 700,
//     textTransform: 'none',
//     borderRadius: '12px',
//     transition: 'all 0.3s',
//     backgroundImage:
//       'linear-gradient(95.06deg, rgb(226, 73, 26) 0%, rgb(226, 27, 27) 16.92%, rgb(226, 73, 26) 42.31%, rgb(226, 170, 27) 99.08%)',
//     '&:hover': {
//       transform: 'scale(1.05)',
//     },
//   };

//   return (
//     <Box sx={{ width: '100%', typography: 'body1', mt: 2 }}>
//       <TabContext value={value}>
//         <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
//           <MuiButton
//             onClick={() => setValue('1')}
//             sx={{
//               ...buttonStyles,
//               backgroundImage:
//                 value === '1'
//                   ? 'linear-gradient(95.06deg, rgb(226, 73, 26) 0%, rgb(226, 27, 27) 16.92%, rgb(226, 73, 26) 42.31%, rgb(226, 170, 27) 99.08%)'
//                   : 'none',
//               filter: value === '1' ? 'brightness(1.2)' : 'brightness(1)',
//             }}
//           >
//             Add Liquidity
//           </MuiButton>
//           <MuiButton
//             onClick={() => setValue('2')}
//             sx={{
//               ...buttonStyles,
//               backgroundImage:
//                 value === '2'
//                   ? 'linear-gradient(95.06deg, rgb(226, 73, 26) 0%, rgb(226, 27, 27) 16.92%, rgb(226, 73, 26) 42.31%, rgb(226, 170, 27) 99.08%)'
//                   : 'none',
//               filter: value === '2' ? 'brightness(1.2)' : 'brightness(1)',
//             }}
//           >
//             Remove Liquidity
//           </MuiButton>
//         </Box>
//         <TabPanel value="1" sx={{ p: 0, mt: 3 }}>
//           <Box>
//             <TokenBox
//               value={tokenAValue}
//               onChange={(val) => keepRatioA(val)}
//               token={tokenA}
//               hideDropdownButton
//             />
//           </Box>
//           <Box mt={2}>
//             <TokenBox
//               value={tokenBValue}
//               onChange={(val) => keepRatioB(val)}
//               token={tokenB}
//               hideDropdownButton
//             />
//           </Box>
//           <Button
//             onClick={() => onAddLiquidity(Number(tokenAValue), Number(tokenBValue))}
//             fullWidth
//             sx={{ mt: 3 }}
//           >
//             Add Liquidity
//           </Button>
//         </TabPanel>
//         <TabPanel value="2" sx={{ p: 0, mt: 3 }}>
//           <Box>
//             <TokenBox
//               value={tokenCValue}
//               onChange={(val) => setTokenCValue(val)}
//               token={liquidityToken}
//               hideDropdownButton
//             />
//           </Box>
//           <Button onClick={() => onRemoveLiquidity(Number(tokenCValue))} fullWidth sx={{ mt: 3 }}>
//             Remove Liquidity
//           </Button>
//         </TabPanel>
//       </TabContext>
//     </Box>
//   );
// };

// /**
//  * PoolLiquidity Component
//  */
// const PoolLiquidity = ({
//   tokenA,
//   tokenB,
//   liquidityA,
//   liquidityB,
//   liquidityToken,
//   poolHistory,
//   onAddLiquidity,
//   onRemoveLiquidity,
// }: PoolLiquidityProps) => (
//     <Box
//       sx={{
//         borderRadius: '16px',
//         background:
//           'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.03) 100%)',
//         p: 3,
//       }}
//     >
//       <Box display="flex" justifyContent="center" gap={2} mb={3}>
//         {/*   width={48}
//           height={48} */}
//       </Box>
//       <Typography sx={{ color: '#FFF', textAlign: 'center', fontWeight: 700, mb: 2 }}>
//         Pool Liquidity
//       </Typography>
//       <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
//       <Grid container spacing={2} mt={2}>
//         <Grid item xs={4}>
//           <Typography sx={{ color: '#FFF', fontSize: '0.875rem', opacity: 0.7 }}>
//             {tokenA.name}
//           </Typography>
//           <Typography sx={{ color: '#FFF', fontWeight: 700 }}>{liquidityA}</Typography>
//         </Grid>
//         <Grid item xs={4}>
//           <Typography sx={{ color: '#FFF', fontSize: '0.875rem', opacity: 0.7 }}>
//             {tokenB.name}
//           </Typography>
//           <Typography sx={{ color: '#FFF', fontWeight: 700 }}>{liquidityB}</Typography>
//         </Grid>
//         <Grid item xs={4}>
//           <Typography sx={{ color: '#FFF', fontSize: '0.875rem', opacity: 0.7 }}>Ratio</Typography>
//           <Typography sx={{ color: '#FFF', fontWeight: 700 }}>
//             1:{(liquidityB / liquidityA).toFixed(2)}
//           </Typography>
//         </Grid>
//       </Grid>
//       <LabTabs
//         tokenA={tokenA}
//         tokenB={tokenB}
//         liquidityA={liquidityA}
//         liquidityB={liquidityB}
//         liquidityToken={liquidityToken}
//         onAddLiquidity={onAddLiquidity}
//         onRemoveLiquidity={onRemoveLiquidity}
//       />
//     </Box>
//   );

// export default PoolLiquidity;
