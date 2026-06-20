'use client';

import type { Token } from '@normalfinance/types';

import { BigNumber } from 'bignumber.js';
import { ETH_RPC_URL } from '@/hooks/use-chain-portfolio';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';

import type { SendParams, SendAdapter } from './index';

// ----------------------------------------------------------------------
// Native ETH transfers. The unsigned EIP-1559 transaction is built locally
// with viem, signed by Turnkey via the user's passkey (Turnkey signs
// Ethereum transactions natively), and broadcast over the public RPC.
// ----------------------------------------------------------------------

// Keep enough ETH back to cover gas for the send itself (21000 gas with
// generous fee headroom).
const GAS_RESERVE_ETH = 0.0005;

export function createEthereumAdapter(
  ethereumAddress: string,
  onError?: (msg: string) => void,
): SendAdapter {
  return {
    network: 'ethereum',
    hasMemo: false,
    addressPlaceholder: '0x…',
    feeInfo: null,

    validateAddress(address: string): boolean {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    },

    getSpendableBalance(token: Token): BigNumber {
      const spendable = BigNumber(token.balance).minus(GAS_RESERVE_ETH);
      return spendable.gt(0) ? spendable : BigNumber(0);
    },

    async send(params: SendParams): Promise<string> {
      try {
        const info = await getTurnkeyWalletInfo();
        if (!info?.subOrgId) throw new Error('Turnkey wallet not found');
        const subOrgId = info.subOrgId;

        const { http, parseEther, createPublicClient, serializeTransaction } = await import('viem');
        const { mainnet } = await import('viem/chains');

        const client = createPublicClient({ chain: mainnet, transport: http(ETH_RPC_URL) });
        const from = ethereumAddress as `0x${string}`;
        const to = params.destination as `0x${string}`;
        const value = parseEther(params.amount);

        const [nonce, fees] = await Promise.all([
          client.getTransactionCount({ address: from, blockTag: 'pending' }),
          client.estimateFeesPerGas(),
        ]);

        const unsigned = serializeTransaction({
          chainId: mainnet.id,
          type: 'eip1559',
          nonce,
          to,
          value,
          gas: 21000n,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });

        // Sign with Turnkey via the user's passkey (WebAuthn prompt)
        const rpId =
          typeof window !== 'undefined'
            ? process.env.NEXT_PUBLIC_TURNKEY_RP_ID ?? window.location.hostname
            : 'localhost';
        const { WebauthnStamper } = await import('@turnkey/webauthn-stamper');
        const { TurnkeyClient } = await import('@turnkey/http');
        const turnkeyClient = new TurnkeyClient(
          { baseUrl: 'https://api.turnkey.com' },
          new WebauthnStamper({ rpId })
        );

        const signResult = await turnkeyClient.signTransaction({
          type: 'ACTIVITY_TYPE_SIGN_TRANSACTION_V2',
          timestampMs: String(Date.now()),
          organizationId: subOrgId,
          parameters: {
            signWith: ethereumAddress,
            // Turnkey expects the serialized tx without the 0x prefix
            unsignedTransaction: unsigned.startsWith('0x') ? unsigned.slice(2) : unsigned,
            type: 'TRANSACTION_TYPE_ETHEREUM',
          },
        });

        const signedTx = signResult?.activity?.result?.signTransactionResult?.signedTransaction;
        if (!signedTx) throw new Error('Signing failed — no signed transaction returned');

        const rawTx = signedTx.startsWith('0x') ? signedTx : `0x${signedTx}`;
        const txHash = await client.sendRawTransaction({
          serializedTransaction: rawTx as `0x${string}`,
        });
        return txHash;
      } catch (err: any) {
        const msg: string = err?.shortMessage ?? err?.message ?? 'Ethereum transaction failed';
        onError?.(msg);
        return '';
      }
    },
  };
}
