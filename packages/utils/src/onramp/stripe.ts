export function createStripeURL(
  amountUsd: number | string,
  destinationCurrency = 'usdc',
  destinationNetwork = 'stellar'
): string {
  return `https://crypto.link.com?source_amount=${String(amountUsd ?? '0')}&source_currency=usd&destination_currency=${destinationCurrency}&destination_network=${destinationNetwork}`;
}
