import type { NextRequest} from 'next/server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { DefindexSDK, SupportedNetworks } from '@defindex/sdk';
import { isValidStellarAddress } from '@/utils/stellar-address';

export const dynamic = 'force-dynamic';

// ----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const network = cookieStore.get('normal-network')?.value ?? 'testnet';
    const isMainnet = network === 'mainnet';

    const sdk = new DefindexSDK({
      apiKey: process.env.DEFINDEX_API_KEY,
      defaultNetwork: isMainnet ? SupportedNetworks.MAINNET : SupportedNetworks.TESTNET,
    });

    const VAULT_ADDRESS = isMainnet
      ? process.env.NEXT_PUBLIC_MAINNET_DEFINDEX_VAULT || ''
      : process.env.NEXT_PUBLIC_TESTNET_DEFINDEX_VAULT || '';

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

    console.log('vaultInfo', vaultInfo);

    // Derive total deposits from totalManagedFunds (values are in stroops, 7 decimals)
    const DECIMALS = 1e7;
    const totalDeposits = Array.isArray(vaultInfo.totalManagedFunds)
      ? (
          vaultInfo.totalManagedFunds.reduce(
            (sum: number, val: any) => sum + (Number(val) || 0),
            0
          ) / DECIMALS
        ).toString()
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
          ? balance.underlyingBalance.reduce((sum: number, val: number) => sum + val, 0) / DECIMALS
          : 0;

        // Query deposit history to calculate net deposited amount
        const depositRecords = await prisma.vaultDeposit.findMany({
          where: { walletAddress: userAddress, vaultAddress: VAULT_ADDRESS },
          select: { type: true, amount: true },
        });

        let totalDeposited: number;
        if (depositRecords.length === 0) {
          // No DB records — fallback to currentValue for pre-migration users
          totalDeposited = underlyingValue;
        } else {
          totalDeposited = depositRecords.reduce(
            (sum: number, record: { type: string; amount: string }) => {
              const amt = parseFloat(record.amount) || 0;
              return record.type === 'deposit' ? sum + amt : sum - amt;
            },
            0
          );
          // Ensure non-negative
          if (totalDeposited < 0) totalDeposited = 0;
        }

        const earnings = Math.max(underlyingValue - totalDeposited, 0);

        userPosition = {
          shares: (Number(balance.dfTokens) / DECIMALS).toString(),
          currentValue: underlyingValue.toString(),
          totalDeposited: totalDeposited.toString(),
          earnings: earnings.toString(),
        };
      } catch (err) {
        // User may not have a position yet — that's fine
        console.warn('Could not fetch user vault balance:', err);
        userPosition = {
          shares: '0',
          currentValue: '0',
          totalDeposited: '0',
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
