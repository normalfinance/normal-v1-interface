import { j } from '@/utils/http';
import { withAuth } from '@/lib/with-auth';
import { mgiApiBase } from '@/lib/mgi/server-base';

/**
 * POST /api/mgi/sep24/transaction/moreinfo
 * Body: { token: string; id: string }
 *
 * Uses the anchor's `GET /sep24/transaction?id=...` with SEP-10 Bearer token
 * and returns a fresh more_info_url (these JWT URLs can expire quickly).
 */
export const POST = withAuth(async (req: Request) => {
  try {
    // Authenticate

    const { token, id } = (await req.json()) as { token?: string; id?: string };
    if (!token) return j(400, { error: 'Missing token' });
    if (!id) return j(400, { error: 'Missing transaction id' });

    const base = mgiApiBase();
    if (!base) return j(500, { error: 'Server missing MGI_ACCESS_HOST' });

    const url = `${base}/sep24/transaction?id=${encodeURIComponent(id)}`;

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await r.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!r.ok) {
      return j(r.status || 502, {
        error: 'Fetching transaction failed',
        status: r.status,
        details: typeof data === 'string' ? { raw: data } : data,
      });
    }

    const tx = data?.transaction ?? data;
    const more = tx?.more_info_url;
    if (!more) {
      return j(502, { error: 'No more_info_url in response', details: tx });
    }

    return j(200, { more_info_url: more });
  } catch (e: any) {
    console.error('[MGI] route crashed:', e); // detail stays in logs (doc 90 1c)
    return j(500, { error: 'MoneyGram is temporarily unavailable — please try again.' });
  }
});
