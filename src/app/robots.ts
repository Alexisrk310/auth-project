import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thunderxis.vercel.app' // Fallback to example

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/profile/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
