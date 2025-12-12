import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thunderxis.vercel.app'
  
  // Static Routes
  const routes = [
    '',
    '/shop',
    '/auth',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  try {
    const supabase = await createClient()
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
    
    const productRoutes = products?.map((product) => ({
      url: `${baseUrl}/shop/${product.id}`,
      lastModified: new Date(product.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })) || []

    return [...routes, ...productRoutes]
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return routes
  }
}
