import { NextRequest, NextResponse } from 'next/server';

// DeFindex vault configuration
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_DEFINDEX_VAULT_ADDRESS || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    // For now, return mock data
    // TODO: Integrate with actual DeFindex SDK when ready
    const vaultInfo = {
      success: true,
      vault: {
        address: VAULT_ADDRESS,
        name: 'Normal Savings',
        totalDeposits: '1000000', // Mock: 1M USDC
        apy: 7.5, // Mock: 7.5% APY
        asset: 'USDC',
        sharePrice: '1.075', // Mock: Share price
      },
      userPosition: userAddress
        ? {
            deposited: '0',
            shares: '0',
            currentValue: '0',
            earnings: '0',
          }
        : null,
    };

    return NextResponse.json(vaultInfo);
  } catch (error) {
    console.error('Vault info error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get vault info' }, { status: 500 });
  }
}
