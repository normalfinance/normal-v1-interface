import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import {
  getApiConfig,
  isFeatureEnabled,
  isMaintenanceMode,
  getSecurityConfig,
  getMaintenanceMessage,
} from './edge-config';

export { getApiConfig } from './edge-config';

export interface EdgeConfigMiddlewareOptions {
  endpoint: string;
  requireFeatureFlag?: string;
  skipMaintenanceCheck?: boolean;
  skipSecurityCheck?: boolean;
}

export async function withEdgeConfig(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: EdgeConfigMiddlewareOptions
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      if (!options.skipMaintenanceCheck) {
        const maintenanceEnabled = await isMaintenanceMode();
        if (maintenanceEnabled) {
          const message = await getMaintenanceMessage();
          return NextResponse.json({ error: 'Service unavailable', message }, { status: 503 });
        }
      }

      if (options.requireFeatureFlag) {
        const featureEnabled = await isFeatureEnabled(options.requireFeatureFlag);
        if (!featureEnabled) {
          return NextResponse.json({ error: 'Feature not available' }, { status: 404 });
        }
      }

      const apiConfig = await getApiConfig(options.endpoint);
      if (!apiConfig.enabled) {
        return NextResponse.json({ error: 'Endpoint disabled' }, { status: 503 });
      }

      if (!options.skipSecurityCheck) {
        const securityConfig = await getSecurityConfig();

        if (securityConfig.enableCors) {
          const origin = req.headers.get('origin');
          const allowedOrigins = securityConfig.allowedOrigins;

          if (origin && !allowedOrigins.includes('*') && !allowedOrigins.includes(origin)) {
            return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
          }
        }
      }

      const response = await handler(req);

      if (apiConfig.additionalHeaders) {
        Object.entries(apiConfig.additionalHeaders).forEach(([key, value]) => {
          response.headers.set(key, value as string);
        });
      }

      return response;
    } catch (error) {
      console.error(`Edge Config middleware error for ${options.endpoint}:`, error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export function createEdgeConfigHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  endpoint: string,
  requireFeatureFlag?: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const wrappedHandler = await withEdgeConfig(handler, {
      endpoint,
      requireFeatureFlag,
    });
    return wrappedHandler(req);
  };
}

export async function checkRateLimit(
  endpoint: string,
  identifier: string
): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}> {
  const apiConfig = await getApiConfig(endpoint);

  return {
    allowed: true,
    limit: (apiConfig.rateLimitOverride as any)?.requests || 100,
    remaining: 99,
    resetTime: Date.now() + 60000,
  };
}

export async function logWithConfig(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const envConfig = await import('./edge-config').then((m) => m.getEnvironmentConfig());

  if (
    level === 'error' ||
    envConfig.logLevel === 'info' ||
    (envConfig.logLevel === 'warn' && level !== 'info')
  ) {
    console[level](message, data);
  }
}
