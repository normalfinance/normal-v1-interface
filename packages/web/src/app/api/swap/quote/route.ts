import { NextRequest, NextResponse } from 'next/server';

const AQUA_API_BASE_URL = process.env.NEXT_PUBLIC_AQUA_API_BASE_URL || 'https://amm-api.aqua.network';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token_in_address, token_out_address, amount, mode = 'strict-send' } = body;

    if (!token_in_address || !token_out_address || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Choose the appropriate endpoint based on mode
    const endpoint =
      mode === 'strict-receive'
        ? '/api/external/v1/find-path-strict-receive/'
        : '/api/external/v1/find-path/';

    const response = await fetch(`${AQUA_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token_in_address,
        token_out_address,
        amount,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: `Aqua API error: ${errorText}` },
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
