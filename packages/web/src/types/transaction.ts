export enum TransactionType {
  SEND = 'Send',
  ESTIMATE_SWAP = 'Estimate Swap',
  SWAP = 'Swap',
  DEPOSIT_LIQUIDITY = 'Deposit Liquidity',
  REMOVE_LIQUIDITY = 'Remove Liquidity',
  CLAIM_REWARD = 'Claim Reward',
  CLAIM_FEES = 'Claim Fees',
}

interface BaseTransactionDetails {
  type: TransactionType;
  token1?: { name: string; amount: string };
  token2?: { name: string; amount: string };
}

export type TransactionDetails = BaseTransactionDetails;
