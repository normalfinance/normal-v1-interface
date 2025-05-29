export * from './constants';
export * from './format';
export * from './time';
export * from './chart';
export * from './stellar/trustlines';

export * as Stellar from './stellar';

export function splitByPredicate<T>(array: T[], predicate: (element: T) => boolean): [T[], T[]] {
  return array.reduce<[T[], T[]]>(
    ([pass, fail], element) => {
      (predicate(element) ? pass : fail).push(element);
      return [pass, fail];
    },
    [[], []]
  );
}
