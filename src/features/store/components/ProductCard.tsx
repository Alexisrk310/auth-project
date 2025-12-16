'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, Eye, Heart, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useCartStore, Product } from '@/store/useCartStore'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ui/Toast'
import { useFavorites } from '@/hooks/useFavorites'
import { supabase } from '@/lib/supabase/client'

interface ProductCardProps {
  product: Product & { isNew?: boolean }
  index?: number
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem } = useCartStore()
  const { t } = useLanguage()
  const { addToast } = useToast()
  const { toggleFavorite, isFavorite } = useFavorites()
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] || 'M')
  const [rating, setRating] = useState<number>(0)
  const [reviewCount, setReviewCount] = useState<number>(0)

  useEffect(() => {
    // Auto-select first available size
    if (product) {
       const sizes = product.sizes?.length ? product.sizes : ['S', 'M', 'L', 'XL']
       const firstAvailable = sizes.find(size => {
           return product.stock_by_size ? (product.stock_by_size[size] || 0) > 0 : (product.stock || 0) > 0
       })
       if (firstAvailable) {
           setSelectedSize(firstAvailable)
       } else if (sizes.length > 0) {
           setSelectedSize(sizes[0])
       }
    }
  }, [product])

  useEffect(() => {
    const fetchRating = async () => {
        const { data } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', product.id)
        
        if (data && data.length > 0) {
            const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length
            setRating(avg)
            setReviewCount(data.length)
        }
    }
    fetchRating()
  }, [product.id])

  const checkStock = (size: string) => {
    if (product.stock_by_size && typeof product.stock_by_size === 'object') {
        return (product.stock_by_size[size] || 0) > 0
    }
    return (product.stock || 0) > 0
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!checkStock(selectedSize)) {
        addToast(t('cart.error_stock_limit'), 'error')
        return
    }

    const availableStock = product.stock_by_size ? (product.stock_by_size[selectedSize] || 0) : product.stock
    const effectivePrice = product.sale_price || product.price

    // Show optional loading state or just await
    const success = await addItem({
      id: product.id,
      name: product.name,
      price: effectivePrice,
      image_url: product.images?.[0] || product.image_url || '/placeholder.png',
      description: product.description,
      size: selectedSize,
      stock: availableStock
    })
    
    if (success) {
        addToast(`${t('cart.added_success')} (${selectedSize})`, 'success')
    } else {
        addToast(t('cart.stock_limit_reached'), 'error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500"
    >
       {/* New Badge */}
      {product.is_new && !product.sale_price && (
        <div className="absolute top-3 left-3 z-20 bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md shadow-lg">
           {t('product.new')}
        </div>
      )}

      {/* Sale Badge */}
      {product.sale_price && (
        <div className="absolute top-3 left-3 z-20 bg-gradient-to-r from-red-500 to-pink-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full backdrop-blur-md shadow-lg animate-pulse">
           {t('product.promo')}
        </div>
      )}

      {/* Favorite Button */}
      <button 
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id, product)
        }}
        className={`absolute top-3 right-3 z-20 p-2 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 group-hover:scale-110 ${isFavorite(product.id) ? 'bg-background border border-border text-red-500' : 'bg-black/30 text-white hover:bg-white/20'}`}
      >
        <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
      </button>

      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Image
          src={product.images?.[0] || product.image_url || '/placeholder.png'}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={index < 2}
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2">
            
            {/* Size Selector */}
            <div className="flex justify-center gap-1 bg-black/40 p-1.5 rounded-xl backdrop-blur-md" onClick={(e) => e.preventDefault()}>
                {(product.sizes?.length ? product.sizes : ['S', 'M', 'L', 'XL']).map(size => {
                    const isAvailable = product.stock_by_size ? (product.stock_by_size[size] || 0) > 0 : (product.stock || 0) > 0
                    return (
                        <button
                            key={size}
                            disabled={!isAvailable}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isAvailable) setSelectedSize(size)
                            }}
                            className={`w-8 h-8 text-xs font-bold rounded-lg transition-all relative ${
                                selectedSize === size 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                                    : isAvailable ? 'text-white/80 hover:bg-white/10' : 'text-white/30 cursor-not-allowed'
                            }`}
                        >
                            {size}
                            {!isAvailable && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-full h-px bg-red-500/80 rotate-45 transform origin-center"></div>
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
            {selectedSize && (
                <div className="text-[10px] text-white/90 text-center font-medium">
                     {(() => {
                        const stock = product.stock_by_size 
                            ? (product.stock_by_size[selectedSize] || 0)
                            : (product.stock || 0)
                        return stock > 0 ? `${stock} ${t('product.available_stock')}` : t('products.out_stock')
                     })()}
                </div>
            )}

            <div className="flex gap-2">
                <Link href={`/shop/${product.id}`} className="flex-1">
                    <button className="w-full h-10 rounded-xl bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/20 transition-colors gap-2 text-xs font-bold uppercase tracking-wider">
                        <Eye className="w-4 h-4" /> {t('products.details')}
                    </button>
                </Link>
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 bg-white text-black h-10 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                    {t('products.add')} <ShoppingCart className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pr-2">
            <p className="text-xs text-primary font-medium tracking-wider uppercase mb-1">{t(`cat.${(product.category || 'streetwear').toLowerCase()}`)}</p>
            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors text-foreground">{t(product.name)}</h3>
            
            {/* Rating Stars - Always visible */}
            <div className="flex items-center gap-1 mt-1">
                <div className="flex">
                    {[...Array(5)].map((_, i) => (
                        <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} 
                        />
                    ))}
                </div>
                {reviewCount > 0 && <span className="text-[10px] text-muted-foreground">({reviewCount})</span>}
            </div>
            
          </div>
          <div className="flex flex-col items-end shrink-0">
             {product.sale_price ? (
                <>
                    <span className="font-bold text-lg whitespace-nowrap text-foreground">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sale_price)}
                    </span>
                    <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/50">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price)}
                    </span>
                </>
             ) : (
                <span className="font-bold text-lg whitespace-nowrap text-foreground">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price)}
                </span>
             )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{t(product.description)}</p>
      </div>
    </motion.div>
  )
}
