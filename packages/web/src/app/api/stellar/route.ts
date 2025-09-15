import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';
import { getApiConfig, logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';
import { constants } from '@normalfinance/utils';

async function stellarHandler(req: NextRequest) {
  try {
    // Get API-specific configuration
    const apiConfig = await getApiConfig('stellar');
    const network = constants.getCurrentNetwork();

    // Generate dynamic TOML content based on network
    const tomlContent = generateStellarToml();

    await logWithConfig('info', 'Stellar TOML file served successfully', { network });

    return new NextResponse(tomlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
        ...apiConfig.additionalHeaders,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error generating stellar.toml', { error });

    return new NextResponse('Error generating stellar.toml', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

function generateStellarToml(): string {
  const isMainnet = constants.getCurrentNetwork() === 'mainnet';

  const networkPassphrase = constants.getNetworkConfig(
    process.env.NEXT_PUBLIC_TESTNET_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    process.env.NEXT_PUBLIC_MAINNET_NETWORK_PASSPHRASE ||
      'Public Global Stellar Network ; September 2015'
  );

  const signingKey = constants.getNetworkConfig(
    process.env.NEXT_PUBLIC_TESTNET_SIGNING_KEY || '',
    process.env.NEXT_PUBLIC_MAINNET_SIGNING_KEY || ''
  );

  const accounts = constants.getNetworkConfig(
    [
      process.env.NEXT_PUBLIC_TESTNET_DEPLOYER || '', // deployer
      process.env.NEXT_PUBLIC_TESTNET_DISTRIBUTOR || '', // distributor
      constants.StellarConfig.NORMAL_TOKEN_ISSUER, // issuer
      process.env.NEXT_PUBLIC_TESTNET_ADMIN || '', // admin
      process.env.NEXT_PUBLIC_TESTNET_POL || '', // protocol owned liquidity (POL)
    ].filter(Boolean),
    [
      process.env.NEXT_PUBLIC_MAINNET_DEPLOYER || '',
      process.env.NEXT_PUBLIC_MAINNET_DISTRIBUTOR || '',
      constants.StellarConfig.NORMAL_TOKEN_ISSUER,
      process.env.NEXT_PUBLIC_MAINNET_ADMIN || '',
      process.env.NEXT_PUBLIC_MAINNET_POL || '',
    ].filter(Boolean)
  );

  return `NETWORK_PASSPHRASE = "${networkPassphrase}"
SIGNING_KEY = "${signingKey}"
ACCOUNTS = [
${accounts.map((account) => `    "${account}",`).join('\n')}
]
VERSION = "1.0.0"

[DOCUMENTATION]
ORG_NAME = "Normal"
ORG_DBA = "Normal"
ORG_URL = "https://www.normalfinance.io"
ORG_LOGO = "https://www.normalfinance.io/logo/logo-full.png"
ORG_DESCRIPTION = "Synthetic asset and index fund protocol"
ORG_PHYSICAL_ADDRESS = "254 Chapman Rd, Ste 208 #7553, Newark, Delaware, 19702, United States"
ORG_PHYSICAL_ADDRESS_ATTESTATION = "https://www.normalfinance.io/address_attestation.jpg"
ORG_PHONE_NUMBER = "+18272743151"
ORG_PHONE_NUMBER_ATTESTATION = "https://www.normalfinance.io/phone_attestation.jpg"
ORG_KEYBASE = "normalfi"
ORG_TWITTER = "normalfi"
ORG_GITHUB = "normalfinance"
ORG_OFFICIAL_EMAIL = "hello@normalfinance.io"
ORG_SUPPORT_EMAIL = "support@normalfinance.io"

# Co-founder & CEO
[[PRINCIPALS]]
name = "Joshua Blew"
email = "joshua@normalfinance.io"
keybase = "jblewnormal"
twitter = "0xjblew"
github = "jblewnormal"

# Co-founder & COO
[[PRINCIPALS]]
name = "Justin Benjamin"
email = "justin@normalfinance.io"
twitter = "justinbenjaminn"

# Synthetics
[[CURRENCIES]]
code = "nBTC"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Bitcoin"
desc = "A synthethic token backed by XLM tracking the value of Bitcoin"
conditions = "Token supply is controlled by the Normal nBTC/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nBTC.webp"

[[CURRENCIES]]
code = "nETH"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Ethereum"
desc = "A synthethic token backed by XLM tracking the value of Ethereum"
conditions = "Token supply is controlled by the Normal nETH/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nETH.webp"

[[CURRENCIES]]
code = "nSOL"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Solana"
desc = "A synthethic token backed by XLM tracking the value of Solana"
conditions = "Token supply is controlled by the Normal nSOL/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nSOL.webp"

[[CURRENCIES]]
code = "nXRP"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Ripple"
desc = "A synthethic token backed by XLM tracking the value of Ripple"
conditions = "Token supply is controlled by the Normal nXRP/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nXRP.webp"

[[CURRENCIES]]
code = "nLINK"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Chainlink"
desc = "A synthethic token backed by XLM tracking the value of Chainlink"
conditions = "Token supply is controlled by the Normal nLINK/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nLINK.webp"

[[CURRENCIES]]
code = "nADA"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Cardano"
desc = "A synthethic token backed by XLM tracking the value of Cardano"
conditions = "Token supply is controlled by the Normal nADA/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nADA.webp"

[[CURRENCIES]]
code = "nAVAX"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Avalanche"
desc = "A synthethic token backed by XLM tracking the value of Avalanche"
conditions = "Token supply is controlled by the Normal nAVAX/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nAVAX.webp"

[[CURRENCIES]]
code = "nPOL"
issuer = "${constants.StellarConfig.NORMAL_TOKEN_ISSUER}"
is_asset_anchored = false
display_decimals = 7
name = "Normal Polygon"
desc = "A synthethic token backed by XLM tracking the value of Polygon"
conditions = "Token supply is controlled by the Normal nPOL/XLM liquidity pool"
image = "https://www.normalfinance.io/assets/icons/crypto-icons/nPOL.webp"
`;
}

export const GET = createEdgeConfigHandler(stellarHandler, 'stellar');
