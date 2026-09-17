import http2 from 'node:http2';
import { sign, createPrivateKey } from 'node:crypto';

import { flattenData } from './messages';

import type { PushPayload, PushAppVariant, PushDeliveryResult } from './types';

// ---------------------------------------------------------------------------
// APNs over HTTP/2 with a token-based (ES256 .p8) provider JWT. No library:
// the protocol is one POST per device and node:http2 + node:crypto cover it.
//
// Config (server env, declared in turbo.jsonc):
//   APNS_KEY_ID          10-char key id from the Apple Developer portal
//   APNS_TEAM_ID         FA938A596N
//   APNS_KEY             the .p8 file — base64 of the PEM, or the PEM itself
//   APNS_BUNDLE_ID_PROD  io.normalfinance.app      (apns-topic, production host)
//   APNS_BUNDLE_ID_DEV   io.normalfinance.app.dev  (apns-topic, sandbox host)
//
// `appVariant` chooses the HOST. A token minted by an Xcode-signed build only
// exists on the sandbox gateway; sending it to production returns
// BadDeviceToken. The app derives the variant from how it was signed.
// ---------------------------------------------------------------------------

const HOSTS: Record<PushAppVariant, string> = {
  dev: 'https://api.sandbox.push.apple.com',
  prod: 'https://api.push.apple.com',
};

/** Apple wants a fresh provider token at most hourly, at least every 20 min. */
const JWT_LIFETIME_S = 50 * 60;
const REQUEST_TIMEOUT_MS = 10_000;

const b64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cachedJwt: { token: string; iat: number } | null = null;

/** The .p8 may arrive base64-encoded (Vercel-friendly) or as PEM with literal \n. */
function loadPem(raw: string): string {
  const s = raw.trim();
  if (s.includes('-----BEGIN')) return s.replace(/\\n/g, '\n');
  return Buffer.from(s, 'base64').toString('utf8');
}

export class PushConfigError extends Error {}

function providerJwt(): string {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const rawKey = process.env.APNS_KEY;
  if (!keyId || !teamId || !rawKey) {
    throw new PushConfigError('APNs is not configured (APNS_KEY_ID / APNS_TEAM_ID / APNS_KEY)');
  }
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.iat < JWT_LIFETIME_S) return cachedJwt.token;

  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const key = createPrivateKey(loadPem(rawKey));
  // JWT ES256 wants the raw r||s (64 bytes), not DER — ieee-p1363 does that.
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  cachedJwt = { token: `${header}.${claims}.${b64url(signature)}`, iat: now };
  return cachedJwt.token;
}

/** Exposed for tests: builds the JWT from explicit inputs, no env, no cache. */
export function buildApnsJwt(keyId: string, teamId: string, pem: string, iat: number): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const claims = b64url(JSON.stringify({ iss: teamId, iat }));
  const signature = sign('sha256', Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey(pem),
    dsaEncoding: 'ieee-p1363',
  });
  return `${header}.${claims}.${b64url(signature)}`;
}

function topicFor(variant: PushAppVariant): string {
  const topic =
    variant === 'dev' ? process.env.APNS_BUNDLE_ID_DEV : process.env.APNS_BUNDLE_ID_PROD;
  if (!topic) throw new PushConfigError(`APNs bundle id for '${variant}' is not configured`);
  return topic;
}

export async function sendApns(
  deviceToken: string,
  payload: PushPayload,
  variant: PushAppVariant
): Promise<PushDeliveryResult> {
  let jwt: string;
  let topic: string;
  try {
    jwt = providerJwt();
    topic = topicFor(variant);
  } catch (e) {
    return { ok: false, kind: 'config', reason: (e as Error).message };
  }

  const body = JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' },
    ...flattenData(payload.data as unknown as Record<string, unknown>),
  });

  return new Promise<PushDeliveryResult>((resolve) => {
    let settled = false;
    const done = (r: PushDeliveryResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        // close() waits for open streams — on a timeout/error that is exactly
        // what is hanging, so tear the session down instead.
        if (r.ok || r.kind === 'invalid_token') session.close();
        else session.destroy();
      } catch {
        /* already gone */
      }
      resolve(r);
    };

    const session = http2.connect(HOSTS[variant]);
    const timer = setTimeout(
      () => done({ ok: false, kind: 'transient', reason: 'apns timeout' }),
      REQUEST_TIMEOUT_MS
    );
    session.on('error', (e) =>
      done({ ok: false, kind: 'transient', reason: `apns session: ${e.message}` })
    );

    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      // Store-and-forward for a day: a phone that is offline at this 2-minute
      // tick still gets it, which is the whole closed-app case. '0' would mean
      // "deliver now or never".
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 86_400),
      'content-type': 'application/json',
    });

    let status = 0;
    let chunks = '';
    req.on('response', (headers) => {
      status = Number(headers[':status'] ?? 0);
    });
    req.setEncoding('utf8');
    req.on('data', (c: string) => {
      chunks += c;
    });
    req.on('end', () => {
      if (status === 200) return done({ ok: true });
      let reason = `apns ${status}`;
      try {
        reason =
          `apns ${status} ${(JSON.parse(chunks) as { reason?: string }).reason ?? ''}`.trim();
      } catch {
        /* no body */
      }
      // 410 = the device token is no longer active for the topic; 400
      // BadDeviceToken = wrong host or garbage token. Both mean: stop sending.
      if (status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(reason)) {
        return done({ ok: false, kind: 'invalid_token', reason });
      }
      if (status === 403) {
        cachedJwt = null; // a rejected provider token is re-minted next time
        return done({ ok: false, kind: 'config', reason });
      }
      return done({ ok: false, kind: 'transient', reason });
    });
    req.on('error', (e) =>
      done({ ok: false, kind: 'transient', reason: `apns request: ${e.message}` })
    );
    req.end(body);
  });
}
