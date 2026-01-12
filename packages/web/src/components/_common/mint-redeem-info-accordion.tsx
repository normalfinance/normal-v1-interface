// import type { Token } from '@normalfinance/types';

// import React from 'react';
// import { useTranslate } from '@/locales';
// import { fPercent, fCurrencyTwoDecimals } from '@/utils/format-number';

// import { alpha, useTheme } from '@mui/material/styles';
// import { Box, Accordion, Typography, AccordionSummary, AccordionDetails } from '@mui/material';

// import { Iconify } from '../template/iconify';

// interface MintRedeemInfoAccordionProps {
//   conversionText: string;
//   collateralPerPair: string;
//   insufficientBalance: boolean;
//   longToken?: Token;
//   shortToken?: Token;
//   quoteToken?: Token;
//   action: 'mint' | 'redeem';
//   sellFiatValue: number;
// }

// const MintRedeemInfoAccordion: React.FC<MintRedeemInfoAccordionProps> = ({
//   conversionText,
//   collateralPerPair,
//   insufficientBalance,
//   longToken,
//   shortToken,
//   quoteToken,
//   action,
//   sellFiatValue,
// }) => {
//   const theme = useTheme();
//   const { t } = useTranslate('auto');

//   return (
//     <Accordion
//       defaultExpanded
//       disableGutters
//       sx={{
//         mt: 0,
//         backgroundColor: 'transparent !important',
//         boxShadow: 'none !important',
//         width: '100%',
//         padding: '0px !important',
//         '::before': { display: 'none' },
//       }}
//     >
//       <AccordionSummary
//         expandIcon={
//           <Iconify
//             icon="eva:arrow-ios-upward-fill"
//             width={14}
//             sx={{ color: theme.palette.text.secondary, cursor: 'pointer' }}
//           />
//         }
//         aria-controls="panel3-content"
//         id="panel3-header"
//       >
//         <Typography
//           variant="body2"
//           sx={{
//             fontWeight: 500,
//             color: theme.palette.text.secondary,
//             fontSize: '12px',
//           }}
//         >
//           {conversionText}
//         </Typography>
//       </AccordionSummary>
//       <AccordionDetails sx={{ p: 0, px: 1 }}>
//         <Box
//           sx={{
//             mt: 0,
//             px: 0,
//             width: '100%',
//             display: 'flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             gap: 1,
//           }}
//         >
//           {insufficientBalance && quoteToken && (
//             <Box
//               sx={{
//                 p: 2,
//                 width: '100%',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: 1,
//                 border: `1px solid ${theme.palette.divider}`,
//                 backgroundColor: alpha(theme.palette.grey[500], 0.08),
//                 borderRadius: '8px',
//               }}
//             >
//               <Iconify
//                 icon="solar:danger-triangle-bold"
//                 width={14}
//                 sx={{ color: theme.palette.text.secondary }}
//               />
//               <Typography
//                 variant="body2"
//                 sx={{
//                   fontWeight: 500,
//                   color: theme.palette.text.secondary,
//                   fontSize: '12px',
//                 }}
//               >
//                 {t('Not enough')}&nbsp;
//                 {action === 'mint' ? quoteToken.symbol : 'long & short'}&nbsp;
//                 {t('to ')} {action}
//               </Typography>
//             </Box>
//           )}

//           <Box
//             sx={{
//               width: '100%',
//               display: 'flex',
//               flexDirection: 'column',
//               gap: 1,
//               px: 1,
//             }}
//           >
//             <Box
//               sx={{
//                 width: '100%',
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 gap: 1,
//               }}
//             >
//               <Box
//                 sx={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: 1,
//                 }}
//               >
//                 <Typography
//                   variant="body2"
//                   sx={{
//                     fontWeight: 500,
//                     color: theme.palette.text.secondary,
//                     fontSize: '12px',
//                   }}
//                 >
//                   {t('Collateral')}
//                 </Typography>
//               </Box>
//               <Typography
//                 variant="body2"
//                 sx={{
//                   fontWeight: 500,
//                   color: theme.palette.text.primary,
//                   fontSize: '12px',
//                 }}
//               >
//                 {fCurrencyTwoDecimals(collateral)}
//               </Typography>
//             </Box>

//             {action === 'mint' && <>
//             <Box
//               sx={{
//                 width: '100%',
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 gap: 1,
//               }}
//             >
//               <Box
//                 sx={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: 1,
//                 }}
//               >
//                 <Typography
//                   variant="body2"
//                   sx={{
//                     fontWeight: 500,
//                     color: theme.palette.text.secondary,
//                     fontSize: '12px',
//                   }}
//                 >
//                   {t('')}
//                 </Typography>
//               </Box>
//               <Typography
//                 variant="body2"
//                 sx={{
//                   fontWeight: 500,
//                   color: theme.palette.text.primary,
//                   fontSize: '12px',
//                 }}
//               >
//                 {fCurrencyTwoDecimals(collateralPerPair)}
//               </Typography>
//             </Box>

//             <Box
//               sx={{
//                 width: '100%',
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 gap: 1,
//               }}
//             >
//               <Box
//                 sx={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: 1,
//                 }}
//               >
//                 <Typography
//                   variant="body2"
//                   sx={{
//                     fontWeight: 500,
//                     color: theme.palette.text.secondary,
//                     fontSize: '12px',
//                   }}
//                 >
//                   {t('Collateral per Pair')}
//                 </Typography>
//               </Box>
//               <Typography
//                 variant="body2"
//                 sx={{
//                   fontWeight: 500,
//                   color: theme.palette.text.primary,
//                   fontSize: '12px',
//                 }}
//               >
//                 {fCurrencyTwoDecimals(collateralPerPair)}
//               </Typography>
//             </Box></>}

//             {/* <Box
//               sx={{
//                 width: '100%',
//                 display: 'flex',
//                 justifyContent: 'space-between',
//                 gap: 1,
//               }}
//             >
//               <Box
//                 sx={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'center',
//                   gap: 1,
//                 }}
//               >
//                 <Typography
//                   variant="body2"
//                   sx={{
//                     fontWeight: 500,
//                     color: theme.palette.text.secondary,
//                     fontSize: '12px',
//                   }}
//                 >
//                   {t('Collateral per Pair')}
//                 </Typography>
//               </Box>
//               <Typography
//                 variant="body2"
//                 sx={{
//                   fontWeight: 500,
//                   color: theme.palette.text.primary,
//                   fontSize: '12px',
//                 }}
//               >
//                 {fCurrencyTwoDecimals(collateralPerPair)}
//               </Typography>
//             </Box> */}
//           </Box>
//         </Box>
//       </AccordionDetails>
//     </Accordion>
//   );
// };

// export default MintRedeemInfoAccordion;
