import type { TransactionDetails } from '@/types/transaction';
import type { StellarExpertResourceType } from '@normalfinance/types';

import { TransactionType } from '@/types/transaction';

export const getTransactionMessages = (details: TransactionDetails) => {
  const { type, token1, token2 } = details;

  switch (type) {
    case TransactionType.SEND:
      return {
        loading: `Sending ${token1?.amount} ${token1?.name}...`,
        success: `Successfully sent ${token1?.amount} ${token1?.name}.`,
        error: `Failed to sent ${token1?.name}.`,
      };
    case TransactionType.SWAP:
      return {
        loading: `Swapping ${token1?.amount} ${token1?.name} for ${token2?.name}...`,
        success: `Successfully swapped ${token1?.amount} ${token1?.name} for ${token2?.name}.`,
        error: `Failed to swap ${token1?.name} for ${token2?.name}.`,
      };
    case TransactionType.DEPOSIT_LIQUIDITY:
      return {
        loading: `Depositing ${token1?.amount} ${token1?.name}...`,
        success: `Successfully deposited ${token1?.amount} ${token1?.name}.`,
        error: `Failed to deposit ${token1?.name}.`,
      };
    case TransactionType.REMOVE_LIQUIDITY:
      return {
        loading: `Removing ${token1?.amount} ${token1?.name}...`,
        success: `Successfully removed ${token1?.amount} ${token1?.name}.`,
        error: `Failed to remove ${token1?.name}.`,
      };
    case TransactionType.CLAIM_REWARD:
      return {
        loading: 'Claiming rewards...',
        success: 'Successfully claimed rewards.',
        error: 'Failed to claim rewards.',
      };
    case TransactionType.CLAIM_FEES:
      return {
        loading: 'Claiming fees...',
        success: 'Successfully claimed fees.',
        error: 'Failed to claim fees.',
      };
    case TransactionType.STAKE:
      return {
        loading: `Staking ${token1?.amount} ${token1?.name}...`,
        success: `Successfully staked ${token1?.amount} ${token1?.name}.`,
        error: `Failed to stake ${token1?.name}.`,
      };
    case TransactionType.REQUEST_UNSTAKE:
      return {
        loading: `Requesting to unstake ${token1?.amount} ${token1?.name}...`,
        success: `Successfully requested to unstake ${token1?.amount} ${token1?.name}.`,
        error: `Failed to request unstake for ${token1?.name}.`,
      };
    case TransactionType.CANCEL_REQUEST_UNSTAKE:
      return {
        loading: 'Cancelling unstake request...',
        success: 'Successfully cancelled unstake request.',
        error: 'Failed to cancel unstake request.',
      };
    case TransactionType.UNSTAKE:
      return {
        loading: 'Unstaking...',
        success: 'Successfully unstaked.',
        error: 'Failed to unstake.',
      };
    default:
      return {
        loading: 'Transaction in progress...',
        success: 'Transaction successful.',
        error: 'Transaction failed.',
      };
  }
};

export const createStellarExpertUrl = (type: StellarExpertResourceType, id: string) => {
  const network =
    (process.env.NEXT_PUBLIC_NETWORK ?? '').toUpperCase() === 'TESTNET' ? 'testnet' : 'public';
  return `https://stellar.expert/explorer/${network}/${type}/${id}`;
};
