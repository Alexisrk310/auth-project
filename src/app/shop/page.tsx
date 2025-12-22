
'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import ProductCard from '@/features/store/components/ProductCard'
import { ProductSkeleton } from '@/features/store/components/ProductSkeleton'
import { useLanguage } from '@/components/LanguageProvider'
import { Filter, X } from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { Product } from '@/store/useCartStore'

function ShopContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  // const { isFavorite, favorites } = useFavorites() // Temporarily disabled sorting by favorites to simplify first pass
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  // Get active filters
  const categoryFilter = searchParams.get('category')
  const genderFilter = searchParams.get('gender')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const sizeFilter = searchParams.get('size')

  useEffect(() => {
    fetchProducts()
    setIsMobileFiltersOpen(false) 
  }, [categoryFilter, genderFilter, minPrice, maxPrice, sizeFilter])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      let query = supabase.from('products').select('*')

      if (categoryFilter) {
        query = query.ilike('category', categoryFilter)
      }

      if (genderFilter) {
        query = query.ilike('gender', genderFilter)
      }

      if (minPrice) {
        query = query.gte('price', minPrice)
      }

      if (maxPrice) {
        query = query.lte('price', maxPrice)
      }

      if (sizeFilter) {
        // Force JSONB syntax: ["S"] instead of {S}
        // This prevents the client from sending Postgres Array syntax which fails on JSONB columns
        query = query.filter('sizes', 'cs', `["${sizeFilter}"]`)
      }

      const { data, error } = await query
      
      if (error) throw error
      
      if (data) {
        setProducts(data as Product[])
      }
    } catch (error: any) {
      console.error('Error fetching products:', error.message || error)
      if (typeof error === 'object') {
          console.error('Full error details:', JSON.stringify(error, null, 2))
      }
      // Check for Auth error
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
         console.warn('Potential Auth Error detected. Clearing session might be needed.')
         setError('auth_error')
      } else {
         setError(error.message || 'Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-24">      
      <div className="max-w-7xl mx-auto px-6">
         <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            
            {/* Desktop Sidebar Filters */}
            <div className="sticky top-24 h-fit hidden md:block">
                <Sidebar className="w-48" />
            </div>

            {/* Product Grid */}
            <div className="flex-1">
               <div className="flex flex-col gap-6 mb-8">
                  <div className="flex justify-between items-center">
                      <h1 className="text-3xl font-bold">{t('nav.shop')}</h1>
                      <span className="text-sm text-muted-foreground hidden md:block">{products.length} {t('shop.items_count')}</span>
                  </div>
                  
                  <div className="sticky top-20 z-30 bg-background/95 backdrop-blur-sm py-3 -mx-6 px-6 md:static md:bg-transparent md:p-0 md:m-0 border-b md:border-none border-border/40 transition-all">
                      <div className="flex flex-wrap gap-4 items-center justify-between">
                          {/* Mobile Filter Toggle */}
                          <button 
                            onClick={() => setIsMobileFiltersOpen(true)}
                            className="md:hidden flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                          >
                             <Filter className="w-4 h-4" /> {t('filters.title')}
                          </button>


                            {/* Active Filters Badges */}
                          {(categoryFilter || genderFilter || sizeFilter || minPrice || maxPrice) && (
                              <div className="flex flex-wrap gap-2">
                                 {categoryFilter && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full uppercase">{t(`cat.${categoryFilter.toLowerCase()}`)}</span>}
                                 {genderFilter && <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full uppercase">{t(`filters.${genderFilter.toLowerCase()}`)}</span>}
                                 {sizeFilter && <span className="text-xs bg-muted text-foreground px-2 py-1 rounded-full font-bold">{t('filters.size_title')}: {sizeFilter}</span>}
                                 {(minPrice || maxPrice) && <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">${minPrice || 0} - ${maxPrice || '∞'}</span>}
                              </div>
                          )}
                          
                          <span className="text-sm text-muted-foreground md:hidden">{products.length} {t('shop.items')}</span>
                      </div>
                  </div>
               </div>
               

               {loading ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        {[...Array(6)].map((_, i) => (
                            <ProductSkeleton key={i} />
                        ))}
                   </div>
               ) : error ? (
                   <div className="text-center py-20 bg-red-500/10 rounded-3xl border border-red-500/20 px-4">
                        <p className="text-lg text-red-400 font-bold mb-2">{t('shop.error_title') || 'Error loading products'}</p>
                        <p className="text-sm text-red-300/80 mb-6 max-w-md mx-auto">
                            {error === 'auth_error' 
                                ? "We encountered an authentication issue. Please try refreshing or logging in again." 
                                : error}
                        </p>
                        <button 
                            onClick={async () => {
                                if (error === 'auth_error') {
                                    // Optional: Force logout or just reload
                                    await supabase.auth.signOut()
                                    window.location.href = '/login'
                                } else {
                                    window.location.reload()
                                }
                            }} 
                            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold transition-colors"
                        >
                            {error === 'auth_error' ? t('auth.login') : t('common.retry')}
                        </button>
                   </div>
               ) : products.length === 0 ? (
                   <div className="text-center py-20 bg-muted/10 rounded-3xl border border-white/5">
                        <p className="text-lg text-muted-foreground">{t('shop.no_results')}</p>
                        <button onClick={() => window.location.href = '/shop'} className="mt-4 text-primary hover:underline">{t('shop.clear_filters')}</button>
                   </div>
               ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
               )}
            </div>
         </div>
      </div>
      
      {/* Mobile Filters Overlay */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-[60] flex justify-start">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setIsMobileFiltersOpen(false)}
            />
            
            {/* Drawer */}
            <div className="relative w-[85%] max-w-sm h-full bg-background border-r border-border shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-left duration-300">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold">{t('filters.title')}</h2>
                    <button onClick={() => setIsMobileFiltersOpen(false)} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <Sidebar className="w-full" />
            </div>
        </div>
      )}
    </div>
  )
}

export default function ShopPage() {
  const { t } = useLanguage()
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-background pt-32 text-center">{t('shop.loading')}</div>}>
      <ShopContent />
    </Suspense>
  )
}
