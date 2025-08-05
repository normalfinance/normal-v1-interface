// Functions to format currency
export const formatCurrency = (currency: string, amount: string, language = 'en-US') => {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency: currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
  }).format(Number(amount));
};

export const formatCurrencyStatic = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
});

export const formatCryptoCurrency = new Intl.NumberFormat();
