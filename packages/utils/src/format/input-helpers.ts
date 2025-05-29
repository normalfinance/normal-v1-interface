//dont allow "-" or "," as an input
export const sanitizeAmountInput = (value: string): string => {
  let newVal = value.replace(/[-,]/g, ''); // remove minus and commas
  const parts = newVal.split('.');
  if (parts.length > 2) {
    newVal = parts[0] + '.' + parts.slice(1).join('');
  }
  if (newVal.length > 1 && newVal.startsWith('0') && !newVal.startsWith('0.')) {
    newVal = newVal.replace(/^0+/, '');
  }
  return newVal;
};
