import { constants } from '@normalfinance/utils';

/**
 * Hardcode Joshua's address here for the demo.
 * Replace with the actual G... wallet if you have it.
 */
export const JOSH_ADDRESS = 'GBW56H5745VCDGVQZ6UL3LI7P7LN55K2HSFHAF73HYCA4HQLONGAEBPW'; // sample from your example

// Minimal "Goldsky-like" row type for our mock usage.
export type MockGoldskyRow = {
  id: string;
  type: 'contract';
  contract_id: string;
  topics: string; // JSON string (as stored in DB)
  data: string; // JSON string (as stored in DB)
  in_successful_contract_call: boolean;
  transaction_hash: string;
  transaction_account: string;
  ledger_closed_at: string; // ISO-ish datetime
};

/**
 * Create a JSON-stringified topics array in the same shape Goldsky stores it.
 */
function topicsOf(eventName: string, extras: Array<Record<string, string>>) {
  return JSON.stringify([{ symbol: eventName }, ...extras]);
}
function dataVecU128(...u128s: string[]) {
  const vec = u128s.map((v) => ({ u128: v }));
  return JSON.stringify({ vec });
}

/**
 * We mock one row for each action:
 * - Swap (router)
 * - Add Liquidity (router)
 * - Stake (insurance)
 * - Create Index (index/oracle)
 * - Mint Index (index/oracle)
 *
 * For visibility, we use 'USDC' so the default price provider returns $1,
 * meaning the points will be > 0 for the volume-based actions.
 */
export const mockRows: MockGoldskyRow[] = [
  // --- Swap (points per $1000 @ 25) ---
  {
    id: 'swap-1',
    type: 'contract',
    contract_id: constants.StellarConfig.POOL_ROUTER_ADDRESS,
    topics: topicsOf('swap', [{ symbol: 'USDC' }, { symbol: 'XLM' }]),
    // Assume swapped 3,000 USDC (3,000 * $1), u128 must be in base units (decimals=7 => 3000 * 1e7)
    data: dataVecU128(String(3000 * 10 ** 7)),
    in_successful_contract_call: true,
    transaction_hash: 'SWAP_HASH_1',
    transaction_account: JOSH_ADDRESS,
    ledger_closed_at: '2025-08-19 17:31:37',
  },

  // --- Add Liquidity (points per $1000 @ 50) ---
  {
    id: 'addliq-1',
    type: 'contract',
    contract_id: constants.StellarConfig.POOL_ROUTER_ADDRESS,
    topics: topicsOf('deposit_liquidity', [
      { symbol: 'USDC' },
      { address: 'POOL_ADDR_EXAMPLE' },
      { address: JOSH_ADDRESS },
    ]),
    // Assume deposited 5,000 USDC
    data: dataVecU128(String(5000 * 10 ** 7), String(4900 * 10 ** 7)),
    in_successful_contract_call: true,
    transaction_hash: 'ADDLIQ_HASH_1',
    transaction_account: JOSH_ADDRESS,
    ledger_closed_at: '2025-08-20 10:00:00',
  },

  // --- Stake (points per $1000 @ 10) ---
  {
    id: 'stake-1',
    type: 'contract',
    contract_id: constants.StellarConfig.INSURANCE_FUND_ADDRESS,
    topics: topicsOf('stake', [{ symbol: 'USDC' }]),
    // Assume staked 2,000 USDC
    data: dataVecU128(String(2000 * 10 ** 7)),
    in_successful_contract_call: true,
    transaction_hash: 'STAKE_HASH_1',
    transaction_account: JOSH_ADDRESS,
    ledger_closed_at: '2025-08-21 12:34:56',
  },

  // --- Create Index (flat 50 pts each) ---
  {
    id: 'create-1',
    type: 'contract',
    contract_id: constants.StellarConfig.ORACLE_REGISTRY_ADDRESS,
    topics: topicsOf('create_index', []),
    data: JSON.stringify({ vec: [] }),
    in_successful_contract_call: true,
    transaction_hash: 'CREATE_INDEX_HASH_1',
    transaction_account: JOSH_ADDRESS,
    ledger_closed_at: '2025-08-22 08:15:00',
  },

  // --- Mint Index (points per $1000 @ 25) ---
  {
    id: 'mint-1',
    type: 'contract',
    contract_id: constants.StellarConfig.ORACLE_REGISTRY_ADDRESS,
    topics: topicsOf('mint_index', [{ symbol: 'USDC' }]),
    // Assume minted 1,200 USDC worth
    data: dataVecU128(String(1200 * 10 ** 7)),
    in_successful_contract_call: true,
    transaction_hash: 'MINT_INDEX_HASH_1',
    transaction_account: JOSH_ADDRESS,
    ledger_closed_at: '2025-08-23 09:00:00',
  },
];
