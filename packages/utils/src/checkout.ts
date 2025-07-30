export function createOnramperURL(apiKey: string, amount: string) {
  const url = `https://buy.onramper.dev?apiKey=${apiKey}&partnerContext=Normal&mode=buy&defaultFiat=usd&defaultAmount=${amount}`;

  return url;
}

export function createCoinbasePayURL(projectId: string, amount: string) {
  // FIXME:  When providing appId (also known as Project ID), addresses is also required. View docs
  const url = `https://pay.coinbase.com/v2/onramp/card-details?appId=${projectId}&defaultExperience=buy&defaultPaymentMethod=CARD&fiatCurrency=USD&presetFiatAmount=${amount}&redirectUrl=https%3A%2F%2Fapp.normalfinance.io/`;

  return url;
}
