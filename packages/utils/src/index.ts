export * as constants from './constants';
export * as format from './format';
export * from './stellar';

// tacky, i know
import { WalletConnectAllowedMethods } from './stellar/wallets/wallet-connect';
export { WalletConnectAllowedMethods };

export function splitByPredicate<T>(array: T[], predicate: (element: T) => boolean): [T[], T[]] {
  return array.reduce<[T[], T[]]>(
    ([pass, fail], element) => {
      (predicate(element) ? pass : fail).push(element);
      return [pass, fail];
    },
    [[], []]
  );
}
