export enum TransactionType {
  SEND = 'Send',
  ESTIMATE_SWAP = 'Estimate Swap',
  SWAP = 'Swap',
  DEPOSIT_LIQUIDITY = 'Deposit Liquidity',
  REMOVE_LIQUIDITY = 'Remove Liquidity',
  CLAIM_REWARD = 'Claim Reward',
  CLAIM_FEES = 'Claim Fees',
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
