const DUNE_API_KEY = process.env.DUNE_API_KEY!;
const DUNE_NAMESPACE = process.env.DUNE_NAMESPACE ?? 'normalfinance';
const BASE_URL = 'https://api.dune.com/api/v1/uploads';

export async function duneInsert(tableName: string, rows: object[]): Promise<void> {
  if (!rows.length) return;

  const ndjson = rows.map((r) => JSON.stringify(r)).join('\n');

  const res = await fetch(`${BASE_URL}/${DUNE_NAMESPACE}/${tableName}/insert`, {
    method: 'POST',
    headers: {
      'X-DUNE-API-KEY': DUNE_API_KEY,
      'Content-Type': 'application/x-ndjson',
    },
    body: ndjson,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Dune insert failed for ${tableName}: ${res.status} ${body}`);
  }
}

export async function duneClear(tableName: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${DUNE_NAMESPACE}/${tableName}/clear`, {
    method: 'POST',
    headers: { 'X-DUNE-API-KEY': DUNE_API_KEY },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Dune clear failed for ${tableName}: ${res.status} ${body}`);
  }
}
