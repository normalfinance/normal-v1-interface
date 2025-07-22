'use client';

import type { BaseQueryParams } from '@/types/query-params';

import { useSearchParams } from '@/routes/hooks';

interface UseQueryParamsReturn<T extends BaseQueryParams> {
  params: T;
  hasParams: boolean;
  getParamAsNumber: <K extends keyof T>(key: K) => number | undefined;
  getParamAsBoolean: <K extends keyof T>(key: K) => boolean | undefined;
  setParam: (key: keyof T, value: string | undefined) => void;
  updateURL: (newParams: Partial<T>) => void;
}

export function useQueryParams<
  T extends BaseQueryParams = BaseQueryParams,
>(): UseQueryParamsReturn<T> {
  const searchParams = useSearchParams();

  const params = {} as T;
  if (searchParams) {
    Array.from(searchParams.entries()).forEach(([key, value]) => {
      (params as any)[key] = value;
    });
  }

  const hasParams = searchParams ? searchParams.size > 0 : false;

  const getParamAsNumber = <K extends keyof T>(key: K): number | undefined => {
    const value = searchParams?.get(key as string);
    if (typeof value === 'string' && value !== '') {
      const num = Number(value);
      return !Number.isNaN(num) ? num : undefined;
    }
    return undefined;
  };

  const getParamAsBoolean = <K extends keyof T>(key: K): boolean | undefined => {
    const value = searchParams?.get(key as string);
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return undefined;
  };

  const setParam = (key: keyof T, value: string | undefined): void => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    if (value === undefined || value === '') {
      url.searchParams.delete(key as string);
    } else {
      url.searchParams.set(key as string, value);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const updateURL = (newParams: Partial<T>): void => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);

    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === '') {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });

    window.history.replaceState({}, '', url.toString());
  };

  return {
    params,
    hasParams,
    getParamAsNumber,
    getParamAsBoolean,
    setParam,
    updateURL,
  };
}

export function buildQueryString<T extends BaseQueryParams>(params: Partial<T>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function parseQueryString<T extends BaseQueryParams>(queryString: string): Partial<T> {
  const searchParams = new URLSearchParams(queryString);
  const params = {} as Partial<T>;

  Array.from(searchParams.entries()).forEach(([key, value]) => {
    (params as any)[key] = value;
  });

  return params;
}

export const QueryParamValidators = {
  isValidAmount: (value: string | undefined): boolean => {
    if (!value) return false;
    const num = Number(value);
    return !Number.isNaN(num) && num > 0;
  },

  isValidAddress: (value: string | undefined): boolean => {
    if (!value) return false;

    return /^[A-Za-z0-9]+$/.test(value) && value.length >= 10;
  },

  isValidTokenSymbol: (value: string | undefined): boolean => {
    if (!value) return false;

    return /^[A-Za-z0-9]+$/.test(value) && value.length <= 10;
  },

  isValidPercentage: (value: string | undefined): boolean => {
    if (!value) return false;
    const num = Number(value);
    return !Number.isNaN(num) && num >= 0 && num <= 100;
  },
};
