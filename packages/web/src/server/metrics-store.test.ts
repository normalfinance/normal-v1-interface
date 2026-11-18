jest.mock('@/server/rateLimiter', () => ({ redis: {} }));

import { metricsEnvironment } from './metrics-store';

describe('metrics snapshot key environment', () => {
  it('uses the Vercel environment on Vercel', () => {
    expect(metricsEnvironment({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(
      'production'
    );
    expect(metricsEnvironment({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe('preview');
  });

  it('never gives a local server the live key, even in production mode', () => {
    expect(metricsEnvironment({ NODE_ENV: 'production' })).toBe('local-production');
    expect(metricsEnvironment({ NODE_ENV: 'development' })).toBe('local-development');
    expect(metricsEnvironment({})).toBe('local-development');
  });
});
