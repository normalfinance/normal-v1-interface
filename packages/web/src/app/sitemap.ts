import type { MetadataRoute } from 'next';

// The marketing site only. The app lives under /app behind sign-in, so it has
// nothing for a search engine to read.
const BASE_URL = 'https://normalfinance.io';

const PAGES: {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}[] = [
  { path: '', changeFrequency: 'monthly', priority: 1 },
  // Business pages
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/roadmap', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/blocked', changeFrequency: 'never', priority: 0.3 },
  // Legal
  { path: '/legal/tos', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/pp', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/legal/disclaimer', changeFrequency: 'yearly', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
