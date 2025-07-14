export enum TransactionType {
  SWAP = 'Swap',
  DEPOSIT_LIQUIDITY = 'Deposit Liquidity',
  REMOVE_LIQUIDITY = 'Remove Liquidity',
  CLAIM_REWARD = 'Claim Reward',
  CLAIM_FEES = 'Claim Fees',
  STAKE = 'Stake',
  REQUEST_UNSTAKE = 'Request Unstake',
  CANCEL_REQUEST_UNSTAKE = 'Cancel Request Unstake',
  UNSTAKE = 'Unstake',
}

interface BaseTransactionDetails {
  type: TransactionType;
  token1?: { name: string; amount: string };
  token2?: { name: string; amount: string };
}

export type TransactionDetails = BaseTransactionDetails;
