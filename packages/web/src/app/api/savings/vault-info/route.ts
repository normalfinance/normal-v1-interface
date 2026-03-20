import { NextRequest, NextResponse } from 'next/server';

import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { isValidStellarAddress } from '@/utils/stellar-address';

// ----------------------------------------------------------------------

const sdk = new DefindexSDK({
  apiKey: process.env.DEFINDEX_API_KEY,
  defaultNetwork:
    process.env.NEXT_PUBLIC_NETWORK === 'MAINNET'
      ? SupportedNetworks.MAINNET
      : SupportedNetworks.TESTNET,
});

const VAULT_ADDRESS =
  process.env.NEXT_PUBLIC_NETWORK === 'MAINNET'
    ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
    : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    if (!VAULT_ADDRESS) {
      return NextResponse.json(
        { success: false, error: 'Vault address not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');

    // Fetch vault info and APY in parallel
    const [vaultInfo, apyData] = await Promise.all([
      sdk.getVaultInfo(VAULT_ADDRESS),
      sdk.getVaultAPY(VAULT_ADDRESS),
    ]);

    // Derive total deposits from totalManagedFunds
    // totalManagedFunds is an array of amounts per asset — sum them
    const totalDeposits = Array.isArray(vaultInfo.totalManagedFunds)
      ? vaultInfo.totalManagedFunds
          .reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
          .toString()
      : '0';

    // User position (if wallet connected)
    let userPosition = null;
    if (userAddress && !isValidStellarAddress(userAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address format' },
        { status: 400 }
      );
    }
    if (userAddress) {
      try {
        const balance = await sdk.getVaultBalance(VAULT_ADDRESS, userAddress);
        const underlyingValue = Array.isArray(balance.underlyingBalance)
          ? balance.underlyingBalance.reduce((sum: number, val: number) => sum + val, 0)
          : 0;

        userPosition = {
          shares: balance.dfTokens.toString(),
          currentValue: underlyingValue.toString(),
          earnings: '0', // Earnings require tracking deposits over time — will be derived client-side or via indexer
        };
      } catch (err) {
        // User may not have a position yet — that's fine
        console.warn('Could not fetch user vault balance:', err);
        userPosition = {
          shares: '0',
          currentValue: '0',
          earnings: '0',
        };
      }
    }

    return NextResponse.json({
      success: true,
      vault: {
        address: VAULT_ADDRESS,
        name: vaultInfo.name || 'Normal Savings',
        symbol: vaultInfo.symbol,
        totalDeposits,
        apy: apyData.apy,
        asset: 'USDC',
        fees: vaultInfo.feesBps,
      },
      userPosition,
    });
  } catch (error) {
    console.error('Vault info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vault info' },
      { status: 500 }
    );
  }
}
