import { logger } from '@normalfinance/utils';
import { createClient } from '@vercel/edge-config';

const edgeConfig = createClient(process.env.EDGE_CONFIG);

export async function getEdgeConfig<T>(key: string, fallback: T): Promise<T> {
  if (!edgeConfig) {
    logger.warn('Edge Config not initialized, returning fallback value for key:', key);
    return fallback;
  }

  try {
    const value = await edgeConfig.get<T>(key);
    return value ?? fallback;
  } catch (error) {
    logger.error(`Failed to get Edge Config for key ${key}:`, error);
    return fallback;
  }
}

export async function getEdgeConfigs(keys: string[]): Promise<Record<string, any>> {
  if (!edgeConfig) {
    logger.warn('Edge Config not initialized, returning empty object');
    return {};
  }

  try {
    const values = await edgeConfig.getAll(keys);
    return values || {};
  } catch (error) {
    logger.error('Failed to get batch Edge Config:', error);
    return {};
  }
}

export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  return getEdgeConfig(`features.${flagName}`, false);
}

export async function getApiConfig(endpoint: string) {
  const config = await getEdgeConfig(`api.${endpoint}`, {
    enabled: true,
    rateLimitOverride: null,
    additionalHeaders: {},
    timeout: 30000,
  });

  return config;
}

export async function getRateLimitConfig(endpoint: string) {
  const config = await getEdgeConfig(`rateLimit.${endpoint}`, {
    requests: 100,
    windowMs: 60000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  });

  return config;
}

export async function getEnvironmentConfig() {
  const environment = process.env.NODE_ENV || 'development';
  const config = await getEdgeConfig(`environment.${environment}`, {
    debug: environment === 'development',
    logLevel: environment === 'production' ? 'error' : 'info',
    enableMetrics: environment === 'production',
  });

  return config;
}

export async function getSecurityConfig() {
  const config = await getEdgeConfig('security', {
    enableCors: true,
    allowedOrigins: ['*'],
    enableRateLimiting: true,
    maxPayloadSize: '10mb',
  });

  return config;
}

export async function getCircuitBreakerConfig(service: string) {
  const config = await getEdgeConfig(`circuitBreaker.${service}`, {
    enabled: false,
    failureThreshold: 5,
    timeout: 60000,
    resetTimeout: 30000,
  });

  return config;
}

export async function isMaintenanceMode(): Promise<boolean> {
  return getEdgeConfig('maintenance.enabled', false);
}

export async function getMaintenanceMessage(): Promise<string> {
  return getEdgeConfig(
    'maintenance.message',
    'Service temporarily unavailable. Please try again later.'
  );
}

export { edgeConfig };
