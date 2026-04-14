import { ApiToken } from '@normalfinance/types';
import { getCurrentNetwork } from '../network';

const TESTNET_TOKENS: ApiToken[] = [
  {
    symbol: 'XLM',
    issuer: '',
    contract: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    name: 'Stellar Lumens',
    org: 'Stellar Development Foundation',
    domain: 'stellar.org',
    icon: 'https://cdn.normalapi.com/tokens/XLM.webp',
    decimals: 7,
    featured: true,
  },
  {
    symbol: 'USDC',
    issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    contract: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA',
    name: 'USD Coin',
    org: 'Centre Consortium LLC', // should be from circle USDC later
    domain: 'centre.io',
    icon: 'https://cdn.normalapi.com/tokens/USDC.webp',
    decimals: 7,
    featured: true,
  },
  {
    symbol: 'USDC',
    issuer: 'GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56',
    contract: 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU',
    name: 'Blend USDC',
    org: 'Blend Protocol',
    domain: 'blend.capital',
    icon: 'https://cdn.normalapi.com/tokens/USDC.webp',
    decimals: 7,
    featured: true,
  },
];

const MAINNET_TOKENS: ApiToken[] = [
  {
    symbol: 'XLM',
    issuer: '',
    contract: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
    name: 'Stellar Lumens',
    org: 'Stellar Development Foundation',
    domain: 'stellar.org',
    icon: 'https://cdn.normalapi.com/tokens/XLM.webp',
    decimals: 7,
    featured: true,
  },
  {
    symbol: 'USDC',
    issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    contract: 'CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75',
    name: 'USD Coin',
    org: 'Centre Consortium LLC',
    domain: 'centre.io',
    icon: 'https://cdn.normalapi.com/tokens/USDC.webp',
    decimals: 7,
    featured: true,
  },
];

/**
 * Get the supported token list for the current network.
 */
export function getTokenList(): ApiToken[] {
  const network = getCurrentNetwork();
  return network === 'mainnet' ? MAINNET_TOKENS : TESTNET_TOKENS;
}
