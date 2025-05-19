export * as constants from './constants';
export * as format from './format';
export * as time from './time';
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

export * from '@normalfinance/utils/src/chart/portfolio-value-chart-series';

export * from '@normalfinance/utils/src/format/format-number-locale';
