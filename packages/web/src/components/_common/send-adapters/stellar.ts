import type { TransferArgs } from '@/hooks/stellar/use-send-token';

import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';
import { isValidStellarAddress } from '@/utils/stellar-address';
import { STELLAR_TX_FEE_XLM, spendableXlmForOutflow } from '@/utils/stellar-reserve';

import type { SendParams, SendAdapter, AdapterFeeInfo } from './index';

// ----------------------------------------------------------------------

const NETWORK_FEE_XLM = STELLAR_TX_FEE_XLM;

type StellarSendFn = (args: TransferArgs) => Promise<string>;

export function createStellarAdapter(
  stellarSend: StellarSendFn,
  xlmPriceUsd: number,
  // #67: an active savings position holds SAVINGS_XLM_BUFFER back from every
  // XLM outflow — typed amounts included, not just MAX — so a saver can never
  // strand their own withdrawals.
  hasActiveSavings = false
): SendAdapter {
  const feeFiat = BigNumber(NETWORK_FEE_XLM).multipliedBy(xlmPriceUsd);
  const feeInfo: AdapterFeeInfo = {
    label: `${NETWORK_FEE_XLM} XLM`,
    fiatLabel: `(${fCurrency(feeFiat)})`,
    tooltip: 'Fixed Stellar network fee paid to validators. Cannot be changed.',
  };

  return {
    network: 'stellar',
    hasMemo: true,
    addressPlaceholder: 'G…',
    feeInfo,

    validateAddress: isValidStellarAddress,

    getSpendableBalance(token, xlmSubentries) {
      if (token.symbol === 'XLM') {
        // Until the real subentry count loads, assume 1 (the USDC savings
        // trustline — the common case) so we never over-report spendable and let
        // a send exceed the on-chain reserve. MAX itself does a fresh read.
        return spendableXlmForOutflow(token.balance, xlmSubentries ?? 1, hasActiveSavings);
      }
      return BigNumber(token.balance);
    },

    async send(params: SendParams): Promise<string> {
      return stellarSend({
        destination: params.destination,
        token: params.token,
        amount: params.amount,
        memo: params.memo,
      });
    },
  };
}
