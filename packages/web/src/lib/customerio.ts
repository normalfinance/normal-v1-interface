const TRACK_BASE = 'https://track.customer.io';

function authHeader() {
  const siteId = process.env.CUSTOMERIO_SITE_ID ?? '';
  const apiKey = process.env.CUSTOMERIO_API_KEY ?? '';
  return `Basic ${Buffer.from(`${siteId}:${apiKey}`).toString('base64')}`;
}

export async function cioIdentify(
  userId: string,
  attributes: Record<string, string | number | boolean | null>
) {
  if (!process.env.CUSTOMERIO_SITE_ID || !process.env.CUSTOMERIO_API_KEY) return;

  await fetch(`${TRACK_BASE}/api/v2/entity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: authHeader() },
    body: JSON.stringify({
      type: 'person',
      identifiers: { id: userId },
      action: 'identify',
      attributes,
    }),
  });
}

export async function cioSetMarketingOptIn(userId: string, email: string, optIn: boolean) {
  await cioIdentify(userId, {
    email,
    marketing_opt_in: optIn,
    ...(optIn
      ? { marketing_opt_in_date: new Date().toISOString().split('T')[0] }
      : { marketing_opt_out_date: new Date().toISOString().split('T')[0] }),
  });
}
