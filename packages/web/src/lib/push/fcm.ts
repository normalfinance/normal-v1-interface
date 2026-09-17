import { sign } from 'node:crypto';

import { flattenData } from './messages';

import type { PushPayload, PushDeliveryResult } from './types';

// ---------------------------------------------------------------------------
// FCM HTTP v1 with a hand-signed service-account JWT (RS256) exchanged for an
// OAuth access token. No firebase-admin, no google-auth-library: two fetches.
//
// Config: FIREBASE_SERVICE_ACCOUNT — the service-account JSON, base64-encoded
// (or raw JSON). Needs client_email, private_key, project_id.
// ---------------------------------------------------------------------------

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const REQUEST_TIMEOUT_MS = 10_000;

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cachedAccount: ServiceAccount | null = null;
let cachedAccess: { token: string; expiresAt: number } | null = null;

export class FcmConfigError extends Error {}

function serviceAccount(): ServiceAccount {
  if (cachedAccount) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) throw new FcmConfigError('FCM is not configured (FIREBASE_SERVICE_ACCOUNT)');
  const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as Partial<ServiceAccount>;
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new FcmConfigError(
      'FIREBASE_SERVICE_ACCOUNT lacks client_email / private_key / project_id'
    );
  }
  cachedAccount = {
    client_email: parsed.client_email,
    private_key: parsed.private_key.replace(/\\n/g, '\n'),
    project_id: parsed.project_id,
    token_uri: parsed.token_uri,
  };
  return cachedAccount;
}

/** Exposed for tests: the signed assertion from explicit inputs. */
export function buildGoogleAssertion(
  account: Pick<ServiceAccount, 'client_email' | 'private_key' | 'token_uri'>,
  iat: number
): string {
  const aud = account.token_uri ?? 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: account.client_email, scope: SCOPE, aud, iat, exp: iat + 3600 })
  );
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), account.private_key);
  return `${header}.${claims}.${b64url(signature)}`;
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccess && cachedAccess.expiresAt - 60 > now) return cachedAccess.token;
  const account = serviceAccount();
  const assertion = buildGoogleAssertion(account, now);
  const res = await fetch(account.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  } | null;
  if (!res.ok || !data?.access_token) {
    throw new FcmConfigError(
      `google token exchange failed: ${res.status} ${data?.error ?? ''}`.trim()
    );
  }
  cachedAccess = { token: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedAccess.token;
}

export async function sendFcm(
  deviceToken: string,
  payload: PushPayload
): Promise<PushDeliveryResult> {
  let token: string;
  let projectId: string;
  try {
    projectId = serviceAccount().project_id;
    token = await accessToken();
  } catch (e) {
    return { ok: false, kind: 'config', reason: (e as Error).message };
  }

  let res: Response;
  try {
    res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: payload.title, body: payload.body },
          data: flattenData(payload.data as unknown as Record<string, unknown>),
          android: { priority: 'HIGH' },
        },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    return { ok: false, kind: 'transient', reason: `fcm request: ${(e as Error).message}` };
  }
  if (res.ok) return { ok: true };

  const data = (await res.json().catch(() => null)) as {
    error?: { status?: string; message?: string; details?: { errorCode?: string }[] };
  } | null;
  const code =
    data?.error?.details?.find((d) => d.errorCode)?.errorCode ?? data?.error?.status ?? '';
  const reason = `fcm ${res.status} ${code} ${data?.error?.message ?? ''}`.trim();

  // UNREGISTERED: the app was uninstalled or the token rotated. INVALID_ARGUMENT
  // on the token field: garbage token. Either way, stop sending to it.
  if (res.status === 404 || code === 'UNREGISTERED' || code === 'NOT_FOUND') {
    return { ok: false, kind: 'invalid_token', reason };
  }
  if (code === 'INVALID_ARGUMENT' && /token/i.test(data?.error?.message ?? '')) {
    return { ok: false, kind: 'invalid_token', reason };
  }
  if (res.status === 401 || res.status === 403) {
    cachedAccess = null;
    return { ok: false, kind: 'config', reason };
  }
  return { ok: false, kind: 'transient', reason };
}
