import type { AccountResponse } from '@stellar/stellar-sdk/lib/horizon';
import type { StellarTokenType, StellarTokenMapType } from '@normalfinance/types';

import BigNumber from 'bignumber.js';
import { scValToJs } from 'helpers/convert';
import { constants } from '@normalfinance/utils';
import { Contract, type xdr, TransactionBuilder } from '@stellar/stellar-sdk';

import { accountToScVal } from '../helpers/utils';
import { formatTokenAmount } from '../helpers/format';

export type relevantTokensType = {
  balance: number | string | BigNumber | null;
  usdValue: number;
  issuer?: string;
  code: string;
  contract: string;
  name?: string;
  domain?: string;
  decimals: number;
  formatted: boolean | undefined;
};

export interface tokenBalancesType {
  balances: relevantTokensType[];
  notFound?: boolean;
}

export async function tokenBalance(tokenAddress: string, userAddress: string) {
  const user = accountToScVal(userAddress);

  if (!tokenAddress) return 0;

  try {
    const tokenBalance = await contractInvoke({
      contractAddress: tokenAddress,
      method: 'balance',
      args: [user],
    });

    return scValToJs(tokenBalance as xdr.ScVal) as BigNumber;
  } catch (error) {
    // console.log("Token address doesnt exist", error);
    return null;
  }
}

export async function tokenDecimals(tokenAddress: string) {
  const tx_builder = new TransactionBuilder(constants.TESTING_SOURCE, {
    fee: '1000',
    timebounds: { minTime: 0, maxTime: 0 },
    networkPassphrase: constants.NETWORK_PASSPHRASE,
  });
  tx_builder.addOperation(new Contract(tokenAddress).call('decimals'));
  const stellar_rpc = new rpc.Server(constants.RPC_URL);
  const result = await stellar_rpc.simulateTransaction(tx_builder.build());
  if (rpc.Api.isSimulationSuccess(result)) {
    const val = scValToNative(result.result.retval);
    return {
      decimals: val,
      latestLedger: result.latestLedger,
    };
  } else {
    throw new Error(`Failed to fetch oralce decimals: ${result.error}`);
  }
}

const notFoundReturn = (token: StellarTokenType) => ({
  balance: 0,
  usdValue: 0,
  issuer: token.issuer,
  code: token.code,
  contract: token.contract,
  name: token.name,
  domain: token.domain,
  decimals: 0,
  formatted: false,
});

export async function tokenBalances(
  userAddress: string,
  tokens: StellarTokenType[] | StellarTokenMapType | undefined,
  account: AccountResponse | undefined,
  formatted?: boolean
): Promise<tokenBalancesType | undefined> {
  if (!tokens) return;

  let notFound = false;

  const balances = await Promise.all(
    Object.values(tokens).map(async (token) => {
      try {
        let balance: number | string | BigNumber | null;
        let decimalsResponse = 18;

        if (token.issuer) {
          balance =
            account?.balances?.find(
              (b: any) => b?.asset_issuer === token.issuer && b?.asset_code === token.code
            )?.balance ?? null;
        } else {
          const balanceResponse = await tokenBalance(token.contract, userAddress);
          if (!balanceResponse) return notFoundReturn(token);

          decimalsResponse = await tokenDecimals(token.contract);

          if (formatted) {
            balance = formatTokenAmount(BigNumber(balanceResponse), decimalsResponse);
          } else {
            balance = balanceResponse;
          }
        }

        return {
          balance,
          usdValue: 0, //TODO: should get usd value
          issuer: token.issuer,
          code: token.code,
          contract: token.contract,
          name: token.name,
          domain: token.domain,
          decimals: decimalsResponse,
          formatted,
        };
      } catch (error: any) {
        //la cuenta no esta fundeada
        if (error?.code === 404) {
          notFound = true;
        }

        return notFoundReturn(token);
      }
    })
  );

  return {
    balances,
    notFound,
  };
}
