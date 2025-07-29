import type { NextRequest } from 'next/server';

import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { getApiConfig, logWithConfig, createEdgeConfigHandler } from '@/lib/edge-config-middleware';

async function stellarHandler(req: NextRequest) {
  const filePath = path.join(process.cwd(), './stellar.toml');

  try {
    // Get API-specific configuration
    const apiConfig = await getApiConfig('stellar');

    const fileContents = fs.readFileSync(filePath, 'utf8');

    await logWithConfig('info', 'Stellar TOML file served successfully');

    return new NextResponse(fileContents, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
        ...apiConfig.additionalHeaders,
      },
    });
  } catch (error) {
    await logWithConfig('error', 'Error reading stellar.toml', { error });

    return new NextResponse('Error reading stellar.toml', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

export const GET = createEdgeConfigHandler(stellarHandler, 'stellar');
