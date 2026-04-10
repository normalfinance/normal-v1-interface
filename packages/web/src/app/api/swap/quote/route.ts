import { NextRequest, NextResponse } from 'next/server';

import { constants } from '@normalfinance/utils';
import {
  rpc,
  xdr,
  nativeToScVal,
  Account,
  Address,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import { isValidStellarAddress } from '@/utils/stellar-address';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token_in_address, token_out_address, amount, mode = 'strict-send', sender } = body;

    if (!token_in_address || !token_out_address || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!isValidStellarAddress(token_in_address) || !isValidStellarAddress(token_out_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token address format' },
        { status: 400 }
      );
    }

    if (mode !== 'strict-send' && mode !== 'strict-receive') {
      return NextResponse.json(
        { success: false, error: 'Invalid mode. Must be "strict-send" or "strict-receive"' },
        { status: 400 }
      );
    }

    // Choose endpoint based on mode
    const endpoint =
      mode === 'strict-receive'
        ? '/api/external/v1/find-path-strict-receive/'
        : '/api/external/v1/find-path/';

    const aquaPayload: Record<string, string> = {
      token_in_address,
      token_out_address,
      amount,
    };

    if (sender) {
      if (!isValidStellarAddress(sender)) {
        return NextResponse.json(
          { success: false, error: 'Invalid sender address format' },
          { status: 400 }
        );
      }
      aquaPayload.sender = sender;
    }

    const aquaUrl = `${constants.StellarConfig.AQUA_API_BASE_URL}${endpoint}`;
    console.log('[swap/quote] Aqua request:', { url: aquaUrl, payload: aquaPayload });

    const response = await fetch(aquaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aquaPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Aqua API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Swap quote request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[swap/quote] Aqua response:', JSON.stringify(data, null, 2));

    const swapChainXdr = data.swap_chain_xdr || '';
    const amountOut = String(data.amount ?? data.amount_out ?? '0');
    const pools = data.pools || data.path || [];

    // If no sender or no swap_chain_xdr, return quote-only (no transaction to build)
    if (!sender || !swapChainXdr) {
      return NextResponse.json({
        success: true,
        path: pools,
        amount_in: data.amount_in || amount,
        amount_out: amountOut,
        xdr: '',
      });
    }

    // Build a full Soroban transaction envelope from the swap_chain_xdr
    const rpcServer = new rpc.Server(constants.StellarConfig.RPC_URL, {
      allowHttp: constants.StellarConfig.RPC_URL.startsWith('http://'),
    });

    // Get the sender's account to obtain the current sequence number
    const accountInfo = await rpcServer.getAccount(sender);
    const account = new Account(accountInfo.accountId(), accountInfo.sequenceNumber());

    // Decode the swap_chain_xdr — it's the swap chain Vec (pool steps)
    const swapChain = xdr.ScVal.fromXDR(swapChainXdr, 'base64');

    // Build the sender address as an ScVal
    const senderAddress = new Address(sender);
    const senderScVal = senderAddress.toScVal();

    const networkPassphrase = constants.StellarConfig.NETWORK_PASSPHRASE;

    // Build the transaction with the Aqua router contract invocation
    const txBuilder = new TransactionBuilder(account, {
      fee: '10000000', // 1 XLM max fee — will be adjusted by simulation
      networkPassphrase,
    });

    const routerAddress = new Address(constants.StellarConfig.AQUA_ROUTER_ADDRESS);

    // token_in is the first token in the swap chain (what the user is selling)
    const tokenInAddress = new Address(token_in_address);

    // Calculate min output with 1% slippage
    const amountOutNum = BigInt(amountOut);
    const minAmountOut = amountOutNum - amountOutNum / BigInt(100); // 1% slippage

    // swap_chained(user, swaps_chain, token_in, in_amount, out_min)
    txBuilder.addOperation(
      Operation.invokeHostFunction({
        func: xdr.HostFunction.hostFunctionTypeInvokeContract(
          new xdr.InvokeContractArgs({
            contractAddress: routerAddress.toScAddress(),
            functionName: 'swap_chained',
            args: [
              senderScVal,
              swapChain,
              tokenInAddress.toScVal(),
              nativeToScVal(BigInt(amount), { type: 'u128' }),
              nativeToScVal(minAmountOut, { type: 'u128' }),
            ],
          })
        ),
        auth: [],
      })
    );

    txBuilder.setTimeout(300);
    const builtTx = txBuilder.build();

    // Simulate the transaction to get proper resource estimates and auth
    const simResponse = await rpcServer.simulateTransaction(builtTx);

    if (rpc.Api.isSimulationError(simResponse)) {
      console.error('[swap/quote] Simulation failed:', simResponse);
      return NextResponse.json(
        { success: false, error: `Simulation failed: ${simResponse.error}` },
        { status: 500 }
      );
    }

    // Assemble the simulated transaction (adds resource fees, auth, etc.)
    const assembledTx = rpc.assembleTransaction(builtTx, simResponse).build();
    const txXdr = assembledTx.toXDR();

    console.log('[swap/quote] Built transaction envelope successfully');

    return NextResponse.json({
      success: true,
      path: pools,
      amount_in: data.amount_in || amount,
      amount_out: amountOut,
      xdr: txXdr,
    });
  } catch (error) {
    console.error('Swap quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get swap quote' },
      { status: 500 }
    );
  }
}
