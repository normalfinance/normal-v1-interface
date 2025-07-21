// 'use client';

// // import type { StateToken as Token } from '@normalfinance/types';
// import { useState, useEffect, useCallback } from 'react';

// import { useAllTokens } from './tokens/use-all-tokens';

// // ----------------------------------------------------------------------

// interface ReturnType {
//   error: any | null;
//   loading: boolean;
//   tokens: { balance: string }[] | undefined;
//   refresh: () => void;
// }

// // ----------------------------------------------------------------------

// export function useUserTokens(): ReturnType {
//   const { tokens: allTokens } = useAllTokens();

//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [tokens, setTokens] = useState<{ balance: string }[] | undefined>(undefined);

//   const fetchTokens = useCallback(async () => {
//     try {

//       allTokens.map()

//       const accountBalances = account?.balances.map((balance) => ({
//         // assetCode: balance.asset_code || 'XLM',
//         // assetIssuer: balance.asset_issuer || null,
//         balance: balance.balance,
//         assetType: balance.asset_type,
//       }));
//       console.log(accountBalances);

//       setTokens(accountBalances);
//     } catch (e: any) {
//       console.log(e);
//       setError(e);
//     }
//     return;
//   }, []);

//   // On component mount, fetch tokens
//   useEffect(() => {
//     fetchTokens();
//   }, [fetchTokens]);

//   return {
//     error,
//     loading,
//     tokens,
//     refresh: fetchTokens,
//   };
// }
