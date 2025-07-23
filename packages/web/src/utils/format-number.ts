import { formatNumberLocale } from '@/locales';

// ----------------------------------------------------------------------

/*
 * Locales code
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */

export type InputNumberValue = string | number | null | undefined;

type Options = Intl.NumberFormatOptions;

const DEFAULT_LOCALE = { code: 'en-US', currency: 'USD' };

function processInput(inputValue: InputNumberValue): number | null {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

// ----------------------------------------------------------------------
// 1) Basic number formatting with optional overrides
// ----------------------------------------------------------------------
export function fNumber(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------
// 2) Currency formatting
// ----------------------------------------------------------------------
export function fCurrency(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'currency',
    currency: locale.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------
// 3) Percent formatting
// ----------------------------------------------------------------------
export function fPercent(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(number / 100);

  return fm;
}

// ----------------------------------------------------------------------
// 4) Shorten number using Intl with 'compact' notation
//    e.g. 212350000 => 212.35M, 1500 => 1.5K
// ----------------------------------------------------------------------
export function fShortenNumber(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  // Lowercase the suffix for style reasons
  return fm.replace(/[A-Z]/g, (match) => match.toLowerCase());
}

// ----------------------------------------------------------------------
// 5) Format data size in bytes -> e.g. 1.23 Mb
// ----------------------------------------------------------------------
export function fData(inputValue: InputNumberValue) {
  const number = processInput(inputValue);
  if (number === null || number === 0) return '0 bytes';

  const units = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
  const decimal = 2;
  const baseValue = 1024;

  const index = Math.floor(Math.log(number) / Math.log(baseValue));
  const fm = `${parseFloat((number / baseValue ** index).toFixed(decimal))} ${units[index]}`;

  return fm;
}

export function fRawPercent(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;
  const number = processInput(inputValue);
  if (number === null) return '';
  const fm = new Intl.NumberFormat(locale.code, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);
  return fm + '%';
}

export function fCurrencyTwoDecimals(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;
  const number = processInput(inputValue);
  if (number === null) return '';
  const fm = new Intl.NumberFormat(locale.code, {
    style: 'currency',
    currency: locale.currency,
    minimumFractionDigits: 2, // force two decimals
    maximumFractionDigits: 2,
    ...options,
  }).format(number);
  return fm;
}

export function fCurrencyCompact(inputValue: InputNumberValue, options?: Options) {
  const locale = formatNumberLocale() || DEFAULT_LOCALE;
  const number = processInput(inputValue);
  if (number === null) return '';
  const fm = new Intl.NumberFormat(locale.code, {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options,
  }).format(number);
  // Lowercase the suffix and prepend '$'
  return '$' + fm.replace(/[A-Z]/g, (match) => match.toLowerCase());
}

// utils/format-number.ts
// ----------------------------------------------------------------------
// 6) Format on-chain token balances (BigInt → human-readable)
// ----------------------------------------------------------------------
export function fTokenAmount(
  rawAmount: bigint | string | number | null | undefined,
  decimals = 18,
  { maxFractionDigits = 4 }: { maxFractionDigits?: number } = {}
): string {
  if (rawAmount == null) return '';

  // --- 1. Canonical BigInt ----------------------------
  let value: bigint;
  try {
    value = BigInt(rawAmount);
  } catch (err) {
    console.error('fTokenAmount › invalid value:', rawAmount);
    return '';
  }

  const ZERO = BigInt(0);
  const ONE = BigInt(1);
  const TEN = BigInt(10);

  const negative = value < ZERO;
  if (negative) value = -value;

  // --- 2. Split integer / fractional parts ------------
  let divisor = ONE;
  for (let i = 0; i < decimals; i += 1) divisor *= TEN; // 10 ** decimals

  const integerPart = value / divisor;
  const fractionPart = value % divisor;

  // pad → "0000123", trim trailing zeros
  let fractionStr = fractionPart.toString().padStart(decimals, '0').replace(/0+$/, '');

  if (maxFractionDigits >= 0) {
    fractionStr = fractionStr.slice(0, maxFractionDigits);
  }

  // --- 3. Add locale thousands separators -------------
  const locale = formatNumberLocale() ?? DEFAULT_LOCALE;
  const localeCode = locale.code ?? 'en-US'; // <-- now always a string

  const integerStr =
    integerPart <= BigInt(Number.MAX_SAFE_INTEGER)
      ? new Intl.NumberFormat(localeCode, { maximumFractionDigits: 0 }).format(Number(integerPart))
      : integerPart
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, localeCode.startsWith('en') ? ',' : '.');

  let result = integerStr;
  if (fractionStr) result += `.${fractionStr}`;
  if (negative) result = `-${result}`;

  return result;
}

// 7) Parse a human string -> raw bigint for contract calls
//    "10,000.5" with decimals=6   -> 10000500000n
// ----------------------------------------------------------------------
export function toRawTokenAmount(human: string, decimals = 18): bigint | null {
  if (!human) return null;

  // 1. Strip locale thousands separators & spaces
  const normalized = human.replace(/[\s,]/g, '').trim();

  // 2. Split integer / fraction
  const [intPart, fracPart = ''] = normalized.split('.');

  // 3. Build a plain digits string with right-padded fraction
  const paddedFrac = (fracPart + '0'.repeat(decimals)).slice(0, decimals);

  const digits = intPart + paddedFrac;
  if (!/^\d+$/.test(digits)) return null;

  try {
    return BigInt(digits);
  } catch {
    return null;
  }
}
