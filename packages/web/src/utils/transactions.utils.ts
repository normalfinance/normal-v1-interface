import type { TransactionDetails } from '@/types/transaction';
import type { StellarExpertResourceType } from '@normalfinance/types';

import { isMainnet } from '@normalfinance/utils';
import { TransactionType } from '@/types/transaction';

export const getTransactionMessages = (details: TransactionDetails) => {
  const { type, token1 } = details;

  switch (type) {
    case TransactionType.SEND:
      return {
        loading: `Sending ${token1?.amount} ${token1?.name}...`,
        success: `Successfully sent ${token1?.amount} ${token1?.name}.`,
        error: `Failed to send ${token1?.name}.`,
      };
    case TransactionType.MINT_PAIR:
      return {
        loading: `Minting ${token1?.amount} ${token1?.name}...`,
        success: `Successfully minted ${token1?.amount} ${token1?.name}.`,
        error: `Failed to mint ${token1?.name}.`,
      };
    case TransactionType.REDEEM_PAIR:
      return {
        loading: `Redeeming ${token1?.amount} ${token1?.name}...`,
        success: `Successfully redeemed ${token1?.amount} ${token1?.name}.`,
        error: `Failed to redeem ${token1?.name}.`,
      };
    case TransactionType.TRADE:
      return {
        loading: `Trading ${token1?.amount} ${token1?.name}...`,
        success: `Successfully traded ${token1?.amount} ${token1?.name}.`,
        error: `Failed to trade ${token1?.name}.`,
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
    // case TransactionType.CLAIM_REWARD:
    //   return {
    //     loading: 'Claiming rewards...',
    //     success: 'Successfully claimed rewards.',
    //     error: 'Failed to claim rewards.',
    //   };
    // case TransactionType.CLAIM_FEES:
    //   return {
    //     loading: 'Claiming fees...',
    //     success: 'Successfully claimed fees.',
    //     error: 'Failed to claim fees.',
    //   };
    default:
      return {
        loading: 'Transaction in progress...',
        success: 'Transaction successful.',
        error: 'Transaction failed.',
      };
  }
};

export const createStellarExpertUrl = (type: StellarExpertResourceType, id: string) => {
  const network = isMainnet() ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${network}/${type}/${id}`;
};

// ----------------------------------------------------------------------

const OP_CODE_MESSAGES: Record<string, string> = {
  op_underfunded: 'Insufficient balance to complete this transaction.',
  op_no_trust: 'Missing trustline — you need to add a USDC trustline first.',
  op_no_destination: 'Destination account does not exist on the Stellar network.',
  op_not_authorized: 'Asset not authorized for this account.',
  op_line_full: 'Receiving account trustline is full.',
  op_no_issuer: 'Asset issuer account does not exist.',
  op_low_reserve: 'Account balance too low to meet the minimum reserve requirement.',
};

const TX_CODE_MESSAGES: Record<string, string> = {
  tx_bad_seq: 'Transaction sequence number mismatch — please try again.',
  tx_bad_auth: 'Transaction authorization failed.',
  tx_insufficient_fee: 'Transaction fee too low.',
  tx_no_account: 'Source account does not exist.',
  tx_too_early: 'Transaction submitted too early.',
  tx_too_late: 'Transaction has expired — please try again.',
};

/**
 * Extracts a human-readable error message from a Horizon 400 response.
 * Falls back to the original error message if no Horizon detail is found.
 */
export function parseHorizonError(err: any): string {
  // Horizon errors land in err.response.data (Axios) or err.data (raw fetch)
  const data = err?.response?.data ?? err?.data;
  if (data?.extras?.result_codes) {
    const { transaction, operations } = data.extras.result_codes as {
      transaction?: string;
      operations?: string[];
    };

    // Operation-level codes are more specific — prefer the first one
    if (operations?.length) {
      const opMsg = OP_CODE_MESSAGES[operations[0]];
      if (opMsg) return opMsg;
      return `Transaction failed: ${operations[0]}`;
    }

    if (transaction) {
      const txMsg = TX_CODE_MESSAGES[transaction];
      if (txMsg) return txMsg;
      return `Transaction failed: ${transaction}`;
    }
  }

  // Fall back to the original message
  return err?.message || 'Transaction failed';
}
