/**
 * Truncates string (in the middle) via given lenght value
 */
export function fTruncate(value: string, length: number) {
  if (value?.length <= length) {
    return value;
  }

  const separator = '...';
  const stringLength = length - separator.length;
  const frontLength = Math.ceil(stringLength / 2);
  const backLength = Math.floor(stringLength / 2);

  return value.substring(0, frontLength) + separator + value.substring(value.length - backLength);
}

export function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type NormalTokenFormat = 'with-n' | 'without-n';

/**
 * Format a Normal Token (prefixed with 'n') based on the desired output.
 *
 * @param input - The token name, e.g., "nBTC", "BTC"
 * @param format - Desired output format: "with-n" or "without-n"
 * @returns The formatted token name
 */
export function formatNormalToken(input: string, format: NormalTokenFormat): string {
  const hasPrefix = input.startsWith('n');

  if (format === 'with-n') {
    return hasPrefix ? input : `n${input}`;
  } else if (format === 'without-n') {
    return hasPrefix ? input.slice(1) : input;
  } else {
    throw new Error(`Invalid format type: ${format}`);
  }
}
