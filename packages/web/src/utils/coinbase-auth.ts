import { generateJwt } from '@coinbase/cdp-sdk/auth';

const ONRAMP_HOST = 'api.developer.coinbase.com';
const ONRAMP_PATH = '/onramp/v1/token';

export async function getCdpBearerToken() {
  const apiKeyId = process.env.COINBASE_KEY_ID!;
  const apiKeySecret = process.env.COINBASE_SECRET!;
  if (!apiKeyId || !apiKeySecret) throw new Error('Missing COINBASE_KEY_ID / COINBASE_SECRET');

  // Build a JWT specifically for the Session Token request
  // (JWTs expire quickly; generate per request)
  const jwt = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: 'POST',
    requestHost: ONRAMP_HOST,
    requestPath: ONRAMP_PATH,
    // expiresIn: 120, // optional, defaults to 120s
  });

  return { jwt, host: ONRAMP_HOST, path: ONRAMP_PATH };
}
