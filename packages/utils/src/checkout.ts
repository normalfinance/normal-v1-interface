export function createOnramperURL(apiKey: string, amount: string) {
  const url = `https://buy.onramper.dev?apiKey=${apiKey}&partnerContext=Normal&mode=buy&defaultFiat=usd&defaultAmount=${amount}`;

  return url;
}

// const ZKP2P_SOL_SOL = '792703809:11111111111111111111111111111111';
// const ZKP2P_SOL_USDC = '792703809:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export function createZKP2PURL(amount: string) {
  const url = `https://zkp2p.xyz/swap?referrer=Normal&referrerLogo=https://app.normalfinance.io/logo/logo_full_color.png&callbackUrl=https://app.normalfinance.io&inputCurrency=USD&inputAmount=${amount}`;

  return url;
}

export function createCoinbasePayURL(projectId: string, amount: string) {
  // FIXME:  When providing appId (also known as Project ID), addresses is also required. View docs
  const url = `https://pay.coinbase.com/v2/onramp/card-details?appId=${projectId}&defaultExperience=buy&defaultPaymentMethod=CARD&fiatCurrency=USD&presetFiatAmount=${amount}&redirectUrl=https%3A%2F%2Fapp.normalfinance.io/`;

  return url;
}
