import type { TransferArgs } from '@/hooks/stellar/use-send-token';

import { BigNumber } from 'bignumber.js';
import { fCurrency } from '@/utils/format-number';
import { isValidStellarAddress } from '@/utils/stellar-address';

import type { SendParams, SendAdapter, AdapterFeeInfo } from './index';

// ----------------------------------------------------------------------

const NETWORK_FEE_XLM = 0.0002;

type StellarSendFn = (args: TransferArgs) => Promise<string>;

export function createStellarAdapter(
  stellarSend: StellarSendFn,
  xlmPriceUsd: number,
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
      if (token.symbol === 'XLM' && xlmSubentries !== undefined) {
        const reserve = (2 + xlmSubentries) * 0.5;
        return BigNumber.max(
          BigNumber(token.balance).minus(reserve).minus(NETWORK_FEE_XLM),
          0,
        );
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
