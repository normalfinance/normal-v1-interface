'use client';

import React, { ReactNode } from 'react';
import { BluxProvider as BluxSDKProvider } from '@bluxcc/react';
import { BLUX_CONFIG, BLUX_CONFIG_SIMPLE, ENABLE_BLUX_AUTH } from '@/lib/blux-config';

interface BluxProviderProps {
  children: ReactNode;
}

export function BluxProvider({ children }: BluxProviderProps) {
  console.log('🚀 BluxProvider: Checking if Blux is enabled...', {
    ENABLE_BLUX_AUTH,
    env_value: process.env.NEXT_PUBLIC_ENABLE_BLUX_AUTH,
    network: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
  });

  // If Blux is not enabled, just return children without provider
  if (!ENABLE_BLUX_AUTH) {
    console.log('⚠️ BluxProvider: Blux is disabled, returning children without provider');
    return <>{children}</>;
  }

  // Use the full config now that it's fixed
  const configToUse = BLUX_CONFIG;

  console.log('✅ BluxProvider: Blux is enabled, using full config:', {
    ...configToUse,
    networks: configToUse.networks.map((n: any) => n.name || n),
  });

  try {
    console.log('🔧 BluxProvider: Creating BluxSDKProvider with full config...');
    console.log(
      '🔧 BluxProvider: Final config being passed to Blux:',
      JSON.stringify(configToUse, null, 2)
    );

    // Try to create the provider step by step to catch where exactly the error happens
    const provider = <BluxSDKProvider config={configToUse}>{children}</BluxSDKProvider>;

    console.log('✅ BluxProvider: BluxSDKProvider created successfully');
    return provider;
  } catch (error) {
    console.error('❌ BluxProvider: Error initializing Blux provider:', error);
    console.error(
      '❌ BluxProvider: Error stack:',
      error instanceof Error ? error.stack : 'No stack'
    );
    console.error('❌ BluxProvider: Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error(
      '❌ BluxProvider: Error message:',
      error instanceof Error ? error.message : 'Unknown'
    );
    console.log('🔄 BluxProvider: Falling back to children without provider');
    return <>{children}</>;
  }
}

export default BluxProvider;
