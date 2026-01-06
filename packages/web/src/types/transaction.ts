export enum TransactionType {
  // Standard
  SEND = 'Send',

  // Pair
  MINT_PAIR = 'Mint Pair',
  REDEEM_PAIR = 'Redeem Pair',

  // Treasury
  DEPOSIT_LIQUIDITY = 'Deposit Liquidity',
  REMOVE_LIQUIDITY = 'Remove Liquidity',
  TRADE = 'Trade',

  // Index
  MINT_INDEX = 'Mint Index',
  REDEEM_INDEX = 'Redeem Index',
  REFACTOR_INDEX = 'Refactor Index',
  REBALANCE_INDEX = 'Rebalance Index',
  UPDATE_INDEX = 'Update Index',
}

interface BaseTransactionDetails {
  type: TransactionType;
  token1?: { name: string; amount: string };
  token2?: { name: string; amount: string };
}

export type TransactionDetails = BaseTransactionDetails;
