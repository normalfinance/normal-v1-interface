// Every static asset (token icons, logo, marketing images) resolves through
// here so the host lives in ONE place. 2026-10-09: cdn.normalapi.com vanished
// from DNS (the normalapi.com zone lost its `cdn` record) and every image on
// the site broke at once. The files themselves are safe in the Cloudflare R2
// bucket `normal-assets-us`; the app now reaches them through its own origin
// (`NEXT_PUBLIC_CDN_URL=/cdn`, proxied by next.config.mjs to `CDN_ORIGIN`), so
// a DNS record on a second domain can never take the images down again.
//
// Accepts an absolute base (`https://host`) or a same-origin path (`/cdn`).
export function cdn(path: string): string {
  const base = process.env.NEXT_PUBLIC_CDN_URL?.replace(/\/+$/, '') || '';
  const p = path.replace(/^\/+/, '');
  return `${base}/${p}`;
}
