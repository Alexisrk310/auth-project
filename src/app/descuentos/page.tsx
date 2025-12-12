'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Product } from '@/store/useCartStore'
import ProductCard from '@/features/store/components/ProductCard'
import { useLanguage } from '@/components/LanguageProvider'
import { motion } from 'framer-motion'
import { Sparkles, Tag, Timer } from 'lucide-react'

export default function DiscountsPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDiscountedProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .not('sale_price', 'is', null)
          .gt('sale_price', 0)
        
        if (data) {
           const validDiscounts = (data as Product[]).filter(p => (p.sale_price || 0) < p.price)
           setProducts(validDiscounts)
        }
      } catch (error) {
        console.error('Error fetching discounts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDiscountedProducts()
  }, [])

  // Calculate max discount percentage for dynamic display
  const maxDiscount = products.reduce((max, product) => {
    if (!product.sale_price) return max;
    const discount = Math.round(((product.price - product.sale_price) / product.price) * 100);
    return discount > max ? discount : max;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
        {/* Banner Section */}
        <div className="relative pt-32 pb-20 overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-top-left scale-110 z-0" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-5xl md:text-7xl font-black mb-6 text-foreground tracking-tight">
                        {t('nav.discounts')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Premium</span>
                    </h1>
                    
                    {maxDiscount > 0 && (
                        <p className="text-2xl font-bold text-primary max-w-2xl mx-auto leading-relaxed uppercase tracking-wider">
                           {t('promos.upto_off').replace('{0}', maxDiscount.toString())}
                        </p>
                    )}
                </motion.div>
            </div>
        </div>

      <div className="max-w-7xl mx-auto px-6 pb-24 relative z-10">
        {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {[...Array(4)].map((_, i) => (
                     <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-3xl" />
                 ))}
             </div>
        ) : products.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
                 <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-6">
                    <Tag className="w-10 h-10 text-purple-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-foreground mb-3">{t('discounts.no_active')}</h2>
                 <p className="text-muted-foreground mb-8 max-w-md">
                    {t('discounts.updating_inventory')}
                 </p>
                 <a href="/shop" className="px-8 py-3 bg-foreground text-background rounded-xl font-bold hover:bg-foreground/90 transition-colors shadow-lg">
                    {t('discounts.back_to_shop')}
                 </a>
             </div>
        ) : (
             <>
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Timer className="w-4 h-4" /> {t('discounts.limited_time')}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                    ))}
                </div>
             </>
        )}
      </div>
    </div>
  )
}
