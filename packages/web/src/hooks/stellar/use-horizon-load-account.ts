// import useSWRImmutable from 'swr/immutable';

// // import useGetNativeTokenBalance from './useGetNativeTokenBalance';

// const useHorizonLoadAccount = () => {

//   const nativeBalance = 0 //useGetNativeTokenBalance();

//   const isFunded = nativeBalance.data?.validAccount;

//   const { data, isLoading, error, mutate } = useSWRImmutable(
//     sorobanContext.address && isFunded
//       ? ['horizon-account', sorobanContext.address]
//       : null,
//     ([_, address]) => sorobanContext.horizonServer?.loadAccount(address)
//   );

//   return { account: data, isLoading, error, mutate };
// };

// export default useHorizonLoadAccount;
