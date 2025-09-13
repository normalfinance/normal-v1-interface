const fs = require('fs')
const path = require('path')


const NETWORKS = {
  testnet: {
    name: 'normal-contracts-events-testnet',
    dataset: 'stellar_testnet.events_v2',
    table: 'normal_contract_events_testnet',
    contracts: {
      poolRouter: 'CC7BAPX2HYU76CDGCWLLVZT5O7CTTT5VHRC4H6VZUXLJ7PKHPKDT3PS3',
      oracleRegistry: 'CDB6MTYST4WQMQZB2ES4UVS6KMIHE2TAHWCONOIJQZ2HMH6NT2C77H3X',
      insuranceFund: 'CDRVNXARMUM6IGTLMXBCMSBZ7DCI4Y3AANA7HQCZCP6XMXNCOXT7HKDZ',
      poolSwapFee: 'CBY6HH7FFNBLARQYSKJAK6O2AGPTM5VYGOYHTQQPTFLUTS2DNOXPT5QD',
      poolPlane: 'CBFZY3TUS4NGJRTBJ3Y3NONTNL25WOPOQ5HRVTBVROMQVEB2XMWBEPK2',
      liquidityCalc: 'CB5TC2DCKGHMHOREAKXCKEE2Z5LRY7G66RR2ZZBVJBRPA5DVHEF326LA',
    },
  },
  mainnet: {
    name: 'normal-contracts-events-mainnet',
    dataset: 'stellar.events_v2',
    table: 'normal_contract_events_mainnet',
    contracts: {
      poolRouter: process.env.NEXT_PUBLIC_MAINNET_POOL_ROUTER || '',
      oracleRegistry: process.env.NEXT_PUBLIC_MAINNET_ORACLE_REGISTRY || '',
      insuranceFund: process.env.NEXT_PUBLIC_MAINNET_INSURANCE_FUND || '',
      poolSwapFee: process.env.NEXT_PUBLIC_MAINNET_POOL_SWAP_FEE || '',
      poolPlane: process.env.NEXT_PUBLIC_MAINNET_POOL_PLANE || '',
      liquidityCalc: process.env.NEXT_PUBLIC_MAINNET_LIQUIDITY_CALCULATOR || '',
    },
  },
}

function generateConfig(network) {
  const config = NETWORKS[network]
  if (!config) {
    throw new Error(`Unknown network: ${network}. Use 'testnet' or 'mainnet'`)
  }

  const contracts = Object.values(config.contracts).filter((addr) => addr.length > 0)

  if (network === 'mainnet' && contracts.length === 0) {
    console.warn('Warning: No mainnet contract addresses found. Make sure environment variables are set.')
  }

  const yaml = `name: ${config.name}
version: 2
resource_size: s
from_snapshot:
  id: snapshot-cmdovbxjmmqx701wn6sywdg8p
  created_at: 1753813606458
apiVersion: 3
sources:
  source_1:
    dataset_name: ${config.dataset}
    version: 1.0.0
    type: dataset
    start_at: latest
transforms:
  sql_1:
    type: sql
    primary_key: id
    sql: |-
      SELECT
        s.*, 
        now() AS goldsky_timestamp
      FROM source_1
      WHERE type = 'contract'
        AND in_successful_contract_call = true
        AND contract_id IN (
${contracts.map((addr) => `          '${addr}',`).join('\n')}
        )
sinks:
  sink_1:
    type: postgres
    table: ${config.table}
    schema: public
    secret_name: SUPABASE_POSTGRES
    from: sql_1
use_dedicated_ip: false
`

  return yaml
}

function main() {
  const network = process.argv[2] || process.env.NEXT_PUBLIC_NETWORK || 'testnet'

  if (!['testnet', 'mainnet'].includes(network)) {
    console.error('Usage: node generate-config.js [testnet|mainnet]')
    console.error('Or set NEXT_PUBLIC_NETWORK environment variable')
    process.exit(1)
  }

  try {
    const config = generateConfig(network)
    const filename = `normal-contract-events-${network}.yaml`
    const filepath = path.join(__dirname, filename)

    fs.writeFileSync(filepath, config)
    console.log(`Generated ${filename} for ${network} network`)

    if (network === 'mainnet') {
      console.log('Note: Make sure all mainnet contract addresses are properly set in environment variables')
    }
  } catch (error) {
    console.error('Error generating config:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { generateConfig, NETWORKS }
