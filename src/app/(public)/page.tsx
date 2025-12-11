'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Carousel from '@/components/Carousel'
import { Sidebar } from '@/components/Sidebar'
import ProductCard from '@/features/store/components/ProductCard'
import { motion } from 'framer-motion'
import { useLanguage } from '@/components/LanguageProvider'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/store/useCartStore'
import Link from 'next/link'

export default function ShopPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNewArrivals = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_new', true)
          .order('created_at', { ascending: false })
          .limit(8)
        
        if (data) {
           setProducts(data as Product[])
        }
      } catch (error) {
        console.error('Error fetching new arrivals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNewArrivals()
  }, [])

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero / Carousel */}
      <Carousel />
      
      {/* Shop Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
         <div className="flex flex-col md:flex-row gap-12">
            
            {/* Sidebar Filters */}
            <div className="sticky top-24 h-fit hidden md:block">
                <Suspense fallback={<div className="w-64 h-96 bg-muted/20 animate-pulse rounded-2xl" />}>
                    <Sidebar />
                </Suspense>
            </div>

            {/* Product Grid */}
            <div className="flex-1">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold flex flex-wrap items-center gap-4 sm:gap-6">
                    {t('home.new_arrivals')}
                    <span className="text-xs font-normal text-primary px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 whitespace-nowrap">
                        {products.length} {t('home.new_drops')}
                    </span>
                  </h2>
                  <Link href="/shop" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                      {t('home.view_all')} &rarr;
                  </Link>
               </div>

               {loading ? (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="aspect-[3/4] bg-muted/20 animate-pulse rounded-2xl" />
                        ))}
                   </div>
               ) : products.length === 0 ? (
                   <div className="text-center py-20 bg-muted/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                        <p className="text-lg text-muted-foreground mb-4">No new drops at the moment.</p>
                        <Link href="/shop" className="text-primary hover:underline">
                           Browse all collection
                        </Link>
                   </div>
               ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product, index) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                        >
                           <ProductCard product={product} />
                        </motion.div>
                      ))}
                   </div>
               )}
            </div>
         </div>
      </div>
    </div>
  )
}
