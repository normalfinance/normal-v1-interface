export * as constants from './constants';
export * as format from './format';
export * from './stellar';
export * from './checkout';
export * from './time';
export * from './ui';
export * from './analytics';

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

export { load as loadCrisp, boot as bootCrisp, show as showCrisp } from './injected/crisp';
export { load as loadStatuspage, show as showStatuspage } from './injected/statuspage';
