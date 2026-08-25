// Where an alert goes.
//
// Deliberately the only module that knows about a delivery channel, so the
// jobs that DETECT things never learn what a webhook is. Today that channel
// is a Discord webhook; swapping it later touches this file alone.
//
// UNCONFIGURED IS A VALID STATE. With no webhook set, alerts are written to
// the log at warn/error level and the caller behaves identically. That is what
// lets the detection ship before the team has agreed which Discord channel to
// use — the day ALERT_WEBHOOK_URL exists, the same alerts start arriving there
// with no code change.
//
// BEST EFFORT, ALWAYS. An alert that throws would break the very cron run that
// noticed the problem, which is the worst possible failure for a watchdog.

import { logger } from '@normalfinance/utils';

export interface Alert {
  severity: 'warn' | 'crit';
  title: string;
  fields: { name: string; value: string }[];
  footer?: string;
}

// Discord renders an embed's colour as a left stripe, which is why severity is
// worth encoding at all: the same feed reads as calm or urgent at a glance.
const COLOR = {
  warn: 0xc77b15,
  crit: 0xc1362f,
} as const;

function webhookUrl(): string | null {
  const url = process.env.ALERT_WEBHOOK_URL;
  return url && url.startsWith('https://') ? url : null;
}

/** True when alerts have somewhere to go besides the log. Exposed so a cron
 *  can report its own delivery state instead of appearing to work. */
export function alertsConfigured(): boolean {
  return webhookUrl() !== null;
}

/** Send one alert. Never throws, never returns a failure the caller must
 *  handle — a watchdog must not be able to break the thing it watches. */
export async function sendAlert(alert: Alert): Promise<void> {
  const line = `${alert.title} — ${alert.fields.map((f) => `${f.name}: ${f.value}`).join(', ')}`;
  const url = webhookUrl();

  // Always log, webhook or not: the log is the record, the webhook is the
  // notification. If Discord is down we still want the evidence.
  if (alert.severity === 'crit') logger.error(`[alert] ${line}`);
  else logger.warn(`[alert] ${line}`);

  if (!url) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: alert.title,
            color: COLOR[alert.severity],
            fields: alert.fields.map((f) => ({ name: f.name, value: f.value, inline: true })),
            ...(alert.footer ? { footer: { text: alert.footer } } : {}),
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      // Discord occasionally rate-limits or stalls; a watchdog must not hang
      // on it and be killed mid-run by the platform's function timeout.
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    logger.warn('[alert] delivery failed (the alert above is still recorded)', {
      error: String((e as Error)?.message ?? e).slice(0, 120),
    });
  }
}
