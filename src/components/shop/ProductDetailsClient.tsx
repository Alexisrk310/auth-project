'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useCartStore, Product } from '@/store/useCartStore'
import { useLanguage } from '@/components/LanguageProvider'
import { motion } from 'framer-motion'
import { ChevronLeft, Share2, Heart } from 'lucide-react'
import { useFavorites } from '@/hooks/useFavorites'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase/client'
import Image from 'next/image'
import ReviewsList from '@/components/reviews/ReviewsList'

export default function ProductDetailsClient() {
  const { id } = useParams()
  const router = useRouter()
  const { addItem } = useCartStore()
  const { t } = useLanguage()
  const { addToast } = useToast()
  const { toggleFavorite, isFavorite } = useFavorites()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState('M')
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  useEffect(() => {
    const fetchProduct = async () => {
        if (!id) return
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single()
            
            if (error) throw error
            if (data) setProduct(data as unknown as Product)
        } catch (error) {
            console.error('Error fetching product:', error)
        } finally {
            setLoading(false)
        }
    }
    fetchProduct()
  }, [id])

  // Select first available size on load
  useEffect(() => {
    if (product) {
        const sizesToDisplay = product.stock_by_size && Object.keys(product.stock_by_size).length > 0
            ? Object.keys(product.stock_by_size)
            : (product.sizes && product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL'])

        const firstAvailable = sizesToDisplay.find(size => {
            const stock = product.stock_by_size 
                ? (product.stock_by_size[size] || 0) 
                : (product.stock || 0)
            return stock > 0
        })

        if (firstAvailable) {
            setSelectedSize(firstAvailable)
        } else if (sizesToDisplay.length > 0) {
            setSelectedSize(sizesToDisplay[0])
        }
    }
  }, [product])

  const handleAddToCart = async () => {
    if (product) {
      if (product.stock_by_size && product.stock_by_size[selectedSize] < quantity) {
          addToast(t('products.no_stock'), 'error')
          return
      }
      const effectivePrice = product.sale_price || product.price
      const success = await addItem({ ...product, price: effectivePrice, size: selectedSize, quantity })
      
      if (success) {
        addToast(t('products.added_cart'), 'success')
      } else {
        addToast(t('cart.stock_limit_reached'), 'error')
      }
    }
  }

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: product?.name || 'ThunderXis',
                  text: product?.description,
                  url: window.location.href
              })
          } catch (error) {
              console.log('Error sharing:', error)
          }
      } else {
         navigator.clipboard.writeText(window.location.href)
         addToast('Enlace copiado al portapapeles', 'success')
      }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <p className="text-xl font-bold">{t('products.not_found')}</p>
        <Button onClick={() => router.push('/shop')} variant="outline">
          {t('products.back_shop')}
        </Button>
      </div>
    )
  }

  const discountPercentage = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0

  // Fallback images logic
  const mainImage = product.images && product.images.length > 0 
      ? product.images[selectedImageIndex] 
      : (product.image_url || '/placeholder.png')
  
  const allImages = product.images && product.images.length > 0 
      ? product.images 
      : [product.image_url || '/placeholder.png']

  // Effective Price Logic
  const effectivePrice = product.sale_price || product.price
  const oldPrice = product.sale_price ? product.price : product.compare_at_price

  return (
    <div className="min-h-screen bg-background pb-20 pt-24">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Breadcrumb / Back */}
        <div className="flex items-center justify-between mb-8">
            <button 
                onClick={() => router.back()}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
            >
                <div className="p-2 rounded-full bg-muted group-hover:bg-primary/20 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </div>
                <span className="font-medium">{t('products.back')}</span>
            </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20">
          {/* Gallery Section */}
          <div className="space-y-6">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                layoutId={`product-image-${product.id}`}
                className="relative aspect-square rounded-3xl overflow-hidden bg-card border border-border shadow-2xl"
            >
                <Image 
                    src={mainImage} 
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                />
                
                {/* Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.is_new && (
                        <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                            {t('products.new')}
                        </span>
                    )}
                    {discountPercentage > 0 && (
                        <span className="px-3 py-1 bg-destructive text-destructive-foreground text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                            -{discountPercentage}%
                        </span>
                    )}
                </div>

                {/* Floating Actions */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id, product); }}
                        className="p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-all shadow-lg group"
                     >
                        <Heart 
                            className={`w-5 h-5 transition-colors ${isFavorite(product.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground group-hover:text-destructive'}`} 
                        />
                     </button>
                      <button 
                        onClick={handleShare}
                        className="p-3 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-all shadow-lg group"
                     >
                        <Share2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                     </button>
                </div>
            </motion.div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {allImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                                selectedImageIndex === idx 
                                ? 'border-primary ring-2 ring-primary/20 scale-105' 
                                : 'border-transparent opacity-70 hover:opacity-100 hover:border-border'
                            }`}
                        >
                            <Image src={img} alt={`${product.name} ${idx + 1}`} fill className="object-cover" />
                        </button>
                    ))}
                </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col h-full">
            <div className="mb-8">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-black text-foreground mb-4 tracking-tight leading-tight"
                >
                    {product.name}
                </motion.h1>
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-primary">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(effectivePrice)}
                        </span>
                        {oldPrice && (
                            <span className="text-xl text-muted-foreground line-through decoration-destructive/50">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(oldPrice)}
                            </span>
                        )}
                    </div>
                    {(() => {
                        const currentStock = product.stock_by_size 
                            ? (product.stock_by_size[selectedSize] || 0)
                            : (product.stock || 0)
                        
                        return currentStock > 0 ? (
                             <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">
                                {currentStock} {t('product.available_stock') || 'disponibles'}
                             </span>
                        ) : (
                            <span className="px-3 py-1 bg-destructive/10 text-destructive text-xs font-bold rounded-full border border-destructive/20">
                                 {t('products.out_stock')}
                            </span>
                        )
                    })()}
                </div>

                <p className="text-lg text-muted-foreground leading-relaxed">
                    {product.description}
                </p>
            </div>

            <div className="space-y-8 flex-grow">
                {/* Size Selector */}
                {/* Size Selector */}
                {(() => {
                    const sizesToDisplay = product.stock_by_size && Object.keys(product.stock_by_size).length > 0
                        ? Object.keys(product.stock_by_size)
                        : (product.sizes && product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL'])

                    return (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                 <span className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                    {t('products.select_size')}
                                 </span>
                                 <button className="text-xs font-bold text-primary hover:underline">
                                    {t('products.size_guide')}
                                 </button>
                            </div>
                           
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                                {sizesToDisplay.map((size) => {
                                    // Fallback logic for stock availability
                                    const stock = product.stock_by_size 
                                        ? (product.stock_by_size[size] || 0)
                                        : (product.stock || 0)

                                    return (
                                        <button
                                            key={size}
                                            onClick={() => setSelectedSize(size)}
                                            disabled={stock === 0}
                                            className={`
                                                h-12 rounded-xl border-2 font-bold text-sm transition-all relative overflow-hidden
                                                ${selectedSize === size 
                                                    ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                                                    : stock === 0 
                                                        ? 'border-dashed border-border text-muted-foreground/30 cursor-not-allowed bg-muted/20' 
                                                        : 'border-border text-foreground hover:border-primary/50 hover:bg-muted'
                                                }
                                            `}
                                        >
                                            {size}
                                            {stock === 0 && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-full h-px bg-destructive/50 rotate-45 transform scale-125" />
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })()}
                
                {/* Actions */}
                <div className="pt-8 border-t border-border/50">
                     <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center border-2 border-border rounded-xl h-14 w-full sm:w-32 bg-card">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold text-xl"
                            > 
                                - 
                            </button>
                            <span className="flex-1 text-center font-bold text-foreground">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-bold text-xl"
                            > 
                                + 
                            </button>
                        </div>
                         
                        <Button 
                            onClick={handleAddToCart}
                            disabled={!product.stock}
                            className="flex-1 h-14 text-base font-bold rounded-xl shadow-xl shadow-primary/20"
                            size="lg"
                        >
                            {(product.stock ?? 0) > 0 ? t('products.add_cart') : t('products.out_stock')}
                        </Button>
                     </div>
                </div>
            </div>

            {/* Additional Features (Security, Shipping) */}
             <div className="mt-12 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-2 text-center items-center justify-center">
                    <span className="text-2xl">🔒</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('products.secure_checkout')}</span>
                </div>
                 <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col gap-2 text-center items-center justify-center">
                    <span className="text-2xl">🚚</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase">{t('products.fast_shipping')}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-24 pt-12 border-t border-border/50">
             <ReviewsList productId={product.id} />
        </div>
      </div>
    </div>
  )
}
