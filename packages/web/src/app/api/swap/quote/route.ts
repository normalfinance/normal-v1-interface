import { NextRequest, NextResponse } from 'next/server';

import { isValidStellarAddress } from '@/utils/stellar-address';

const AQUA_API_BASE_URL =
  process.env.NEXT_PUBLIC_AQUA_API_BASE_URL || 'https://amm-api.aqua.network';

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

    // When sender is provided Aqua builds a signed-ready Soroban router XDR
    if (sender) {
      aquaPayload.sender = sender;
    }

    const response = await fetch(`${AQUA_API_BASE_URL}${endpoint}`, {
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

    return NextResponse.json({
      success: true,
      path: data.path || [],
      amount_in: data.amount_in || amount,
      amount_out: data.amount_out || '0',
      xdr: data.xdr || '',
    });
  } catch (error) {
    console.error('Swap quote error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get swap quote' },
      { status: 500 }
    );
  }
}
