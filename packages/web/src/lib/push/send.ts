import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';

import { sendFcm } from './fcm';
import { sendApns } from './apns';
import { pushKillSwitchOn } from './policy';

import type { SendPushOutcome } from './policy';
import type { PushPayload, PushAppVariant } from './types';

// ---------------------------------------------------------------------------
// sendPush — one call per (user, event). Fans out to every enabled device the
// user has registered, routes by platform, and retires tokens the provider
// says are dead. Best-effort by contract: it NEVER throws, because every
// caller is a cron tick that must go on to the next row.
//
// PUSH_DISABLED=1 is the kill switch: nothing is sent, nothing is marked.
// ---------------------------------------------------------------------------

export { pushActive, shouldUnclaim, pushConfigured, pushKillSwitchOn } from './policy';
export type { SendPushOutcome } from './policy';

export async function sendPush(params: {
  supabaseUid: string;
  payload: PushPayload;
}): Promise<SendPushOutcome> {
  const out: SendPushOutcome = { attempted: 0, delivered: 0, disabledTokens: 0, skipped: null };
  if (pushKillSwitchOn()) {
    out.skipped = 'kill_switch';
    return out;
  }

  let devices: { id: string; token: string; platform: string; appVariant: string }[] = [];
  try {
    devices = await prisma.pushDevice.findMany({
      where: { supabaseUid: params.supabaseUid, disabledAt: null },
      select: { id: true, token: true, platform: true, appVariant: true },
      take: 20,
    });
  } catch (e) {
    logger.error('[push] device lookup failed', e);
    return out;
  }
  if (!devices.length) {
    out.skipped = 'no_devices';
    return out;
  }

  // A config error (missing key, rejected provider token) is the same for
  // every device on that platform — report once, do not hammer the provider.
  const configFailed = new Set<string>();

  for (const d of devices) {
    if (configFailed.has(d.platform)) continue;
    out.attempted += 1;
    try {
      const variant: PushAppVariant = d.appVariant === 'dev' ? 'dev' : 'prod';
      const result =
        d.platform === 'ios'
          ? await sendApns(d.token, params.payload, variant)
          : await sendFcm(d.token, params.payload);
      if (result.ok) {
        out.delivered += 1;
        continue;
      }
      if (result.kind === 'invalid_token') {
        out.disabledTokens += 1;
        await prisma.pushDevice
          .update({
            where: { id: d.id },
            data: { disabledAt: new Date(), disabledReason: result.reason.slice(0, 200) },
          })
          .catch((e) => logger.error('[push] could not disable token', e));
        continue;
      }
      if (result.kind === 'config') {
        configFailed.add(d.platform);
        logger.error('[push] provider not configured / rejected credentials', {
          platform: d.platform,
          reason: result.reason,
        });
        continue;
      }
      logger.warn('[push] transient delivery failure', {
        platform: d.platform,
        reason: result.reason,
      });
    } catch (e) {
      logger.error('[push] unexpected send error', e);
    }
  }
  return out;
}
