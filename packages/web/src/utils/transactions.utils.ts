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
        loading: `Depositing ${token1?.amount} ${token1?.name} and ${token2?.amount} ${token2?.name}...`,
        success: `Successfully deposited ${token1?.amount} ${token1?.name} and ${token2?.amount} ${token2?.name}.`,
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
    default:
      return {
        loading: 'Transaction in progress...',
        success: 'Transaction successful.',
        error: 'Transaction failed.',
      };
  }
};

export const createStellarExpertUrl = (type: StellarExpertResourceType, id: string) => {
  const network = process.env.NEXT_PUBLIC_NETWORK === 'MAINNET' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${network}/${type}/${id}`;
};
