import BigNumber from 'bignumber.js';

// Token BigNumber to human redeable
// With a tokens set number of decimals, display the formatted value for an amount.
// Returns a string
// Example - User A has 1000000001 of a token set to 7 decimals,
// display should be 100.0000001
export const formatTokenAmount = (
  amount: BigNumber | string | number,
  decimals: number = 7
): string => {
  if (!amount) {
    return '0';
  }

  if (!(amount instanceof BigNumber)) {
    amount = BigNumber(amount);
  }

  let formatted = amount.toString();

  if (decimals > 0) {
    formatted = amount.shiftedBy(-decimals).toFixed(decimals).toString();

    // Trim trailing zeros
    while (formatted[formatted.length - 1] === '0') {
      formatted = formatted.substring(0, formatted.length - 1);
    }

    if (formatted.endsWith('.')) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
  }

  return formatted;
};
