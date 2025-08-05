import numeral from 'numeral';

// ----------------------------------------------------------------------

type InputValue = string | number | null;

export function fNumber(number: InputValue) {
  return numeral(number).format();
}

export function fCurrency(number: InputValue) {
  const format = number ? numeral(number).format('$0,0.00') : '$0.00';

  return result(format, '.00');
}

export function fMarketCap(number: InputValue) {
  const format = number ? numeral(number).format('($0.00a)') : '$0.00';

  return result(format, '.00a');
}

export function fPercent(number: InputValue) {
  const format = number ? numeral(Number(number) / 100).format('0.00%') : '';

  return result(format, '.00');
}

export function fShortenNumber(number: InputValue) {
  const format = number ? numeral(number).format('0.00a') : '';

  return result(format, '.00');
}

export function fData(number: InputValue) {
  const format = number ? numeral(number).format('0.0 b') : '';

  return result(format, '.0');
}

function result(format: string, key = '.00') {
  const isInteger = format.includes(key);

  return isInteger ? format.replace(key, '') : format;
}

export function fBigNumber(number: InputValue) {
  const format = number ? numeral(number).format('$0.00a').toUpperCase() : '$0.00';

  return result(format, '.00');
}
