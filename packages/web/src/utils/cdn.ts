export function cdn(path: string): string {
  const base = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/+$/, '') || '';
  const p = path.replace(/^\/+/, '');
  return `${base}/${p}`;
}
