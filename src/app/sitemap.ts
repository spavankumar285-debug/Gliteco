import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gliteco.vercel.app';
  const lastModified = new Date();

  return [
    { url: `kbaseUrl|`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/templates`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
