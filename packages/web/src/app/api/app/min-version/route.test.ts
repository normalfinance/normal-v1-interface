import { it, jest, expect, describe, afterEach } from '@jest/globals';

jest.mock('@/utils/logger', () => ({ logger: { error: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('./route') as { GET: () => Response };

const read = async () => (await GET().json()) as { ios: number; android: number };

describe('GET /api/app/min-version', () => {
  afterEach(() => {
    delete process.env.APP_MIN_BUILD_IOS;
    delete process.env.APP_MIN_BUILD_ANDROID;
  });

  it('blocks nothing until a floor is set', async () => {
    expect(await read()).toEqual({ ios: 0, android: 0 });
  });

  it('returns each platform its own floor', async () => {
    process.env.APP_MIN_BUILD_IOS = '3';
    process.env.APP_MIN_BUILD_ANDROID = '4';

    expect(await read()).toEqual({ ios: 3, android: 4 });
  });

  it.each(['1.0.3', 'three', '-1', '2.5'])(
    'treats %s as unset rather than locking every app out',
    async (value) => {
      process.env.APP_MIN_BUILD_IOS = value;

      expect((await read()).ios).toBe(0);
    }
  );

  it('lets the edge cache it for a minute only', () => {
    expect(GET().headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60');
  });
});
