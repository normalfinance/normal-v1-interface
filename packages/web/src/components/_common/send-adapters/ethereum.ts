'use client';

import type { Token } from '@normalfinance/types';
import type { ChainId } from '@/lib/chains/registry';

import { BigNumber } from 'bignumber.js';
import { getChain } from '@/lib/chains/registry';
import { ETH_RPC_URL } from '@/hooks/use-chain-portfolio';
import { getTurnkeyWalletInfo } from '@/lib/turnkey/wallet-info';

import type { SendParams, SendAdapter } from './index';

// ----------------------------------------------------------------------
// Native transfers on any EVM chain. The unsigned EIP-1559 transaction is
// built locally with viem, signed by Turnkey via the user's passkey (Turnkey
// signs Ethereum transactions natively), and broadcast over the chain's RPC.
//
// Parameterised by chain rather than hardcoded to Ethereum mainnet: one
// secp256k1 address is valid on every EVM chain, so adding Avalanche or Base
// is a registry entry plus an RPC — no new address, no new adapter, no
// database change. See docs/audit/34-chain-registry-plan.md.
// ----------------------------------------------------------------------

// Keep enough native gas token back to cover the send itself (21000 gas with
// generous fee headroom).
const GAS_RESERVE_ETH = 0.0005;

export interface EvmAdapterOptions {
  /** Registry chain to send on. Defaults to Ethereum mainnet. */
  chainId?: ChainId;
  /** RPC endpoint override; falls back to the Ethereum default. */
  rpcUrl?: string;
}

export function createEthereumAdapter(
  ethereumAddress: string,
  onError?: (msg: string) => void,
  options: EvmAdapterOptions = {},
): SendAdapter {
  const chainId: ChainId = options.chainId ?? 'ethereum';
  const chainDef = getChain(chainId);
  if (chainDef.kind !== 'evm') {
    throw new Error(`createEthereumAdapter called with non-EVM chain: ${chainId}`);
  }
  const rpcUrl = options.rpcUrl ?? ETH_RPC_URL;

  return {
    network: chainId,
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
        const chains = await import('viem/chains');

        // Resolve the viem chain from the registry's EVM id, so a new EVM
        // chain needs no edit here.
        const viemChain = Object.values(chains).find(
          (c): c is (typeof chains)['mainnet'] =>
            typeof c === 'object' && c !== null && 'id' in c && c.id === chainDef.evmChainId
        );
        if (!viemChain) throw new Error(`Unsupported EVM chain id: ${chainDef.evmChainId}`);

        const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) });
        const from = ethereumAddress as `0x${string}`;
        const to = params.destination as `0x${string}`;
        const value = parseEther(params.amount);

        const [nonce, fees] = await Promise.all([
          client.getTransactionCount({ address: from, blockTag: 'pending' }),
          client.estimateFeesPerGas(),
        ]);

        const unsigned = serializeTransaction({
          chainId: viemChain.id,
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
