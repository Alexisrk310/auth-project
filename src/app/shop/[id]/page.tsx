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

export default function ProductDetailsPage() {
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
  
  if (loading) return <div className="min-h-screen pt-24 flex justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
  if (!product) return <div className="min-h-screen pt-24 text-center">{t('product.not_found')}</div>

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url, // Keep main image for cart
      description: product.description,
      quantity: quantity,
      size: selectedSize
    })
    addToast(`${t('cart.added_success')} (${selectedSize} x${quantity})`, 'success')
  }

  // Ensure images array exists, fallback to single image_url if not
  const images = (product as any).images && (product as any).images.length > 0 
      ? (product as any).images 
      : [product.image_url]

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-6">
        
        <button onClick={() => router.back()} className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors font-medium">
            <ChevronLeft className="w-5 h-5" /> {t('home.view_all')}
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            {/* Image Gallery */}
            <div className="space-y-6">
                <motion.div 
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="relative aspect-[3/4] md:aspect-square rounded-3xl overflow-hidden bg-muted border border-border shadow-lg"
                >
                    <Image 
                        src={images[selectedImageIndex] || product.image_url} 
                        alt={product.name} 
                        fill
                        className="object-cover"
                        priority
                    />
                </motion.div>
                
                {/* Thumbnails */}
                {images.length > 1 && (
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {images.map((img: string, idx: number) => (
                            <button 
                                key={idx}
                                onClick={() => setSelectedImageIndex(idx)}
                                className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? 'border-primary shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100 hover:border-border'}`}
                            >
                                <Image src={img} alt="" fill className="object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Info */}
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
               className="space-y-8"
            >
                <div>
                    {product.is_new && (
                        <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-primary/20">
                            {t('product.new')}
                        </span>
                    )}
                    <h1 className="text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">{product.name}</h1>
                    <p className="text-lg text-primary font-medium tracking-wide uppercase">{product.category || 'Collection'}</p>
                   
                    {product.sale_price ? (
                        <div className="flex items-baseline gap-4 mt-4">
                            <p className="text-4xl font-bold text-foreground">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.sale_price)}
                            </p>
                            <p className="text-xl text-muted-foreground line-through">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price)}
                            </p>
                            <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-bold uppercase rounded-lg">
                                {Math.round(((product.price - product.sale_price) / product.price) * 100)}% OFF
                            </span>
                        </div>
                    ) : (
                       <p className="text-3xl font-bold text-foreground mt-4">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(product.price)}
                       </p>
                    )}
                </div>

                <div className="prose prose-sm text-muted-foreground leading-relaxed border-l-2 border-primary/20 pl-4">
                    <p>{product.description}</p>
                </div>
                
                <div className="flex items-center gap-3 text-sm font-medium p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className={`w-2.5 h-2.5 rounded-full ${(product.stock || 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className={(product.stock || 0) > 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {(product.stock || 0) > 0 ? `${product.stock} ${t('product.available_stock')}` : t('product.out_of_stock')}
                    </span>
                </div>

                <div className="space-y-6 pt-6 border-t border-border/50">
                    {/* Sizes */}
                    <div>
                       <div className="flex justify-between items-center mb-3">
                           <h3 className="font-bold text-foreground">{t('product.select_size')}</h3>
                           <button className="text-xs text-primary hover:underline font-medium">{t('product.size_guide')}</button>
                       </div>
                       <div className="flex gap-3 flex-wrap">
                          {((product as any).sizes?.length > 0 ? (product as any).sizes : ['S', 'M', 'L', 'XL']).map((size: string) => (
                              <button
                                key={size}
                                onClick={() => setSelectedSize(size)}
                                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold border-2 transition-all duration-200
                                    ${selectedSize === size 
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105' 
                                        : 'bg-background border-border text-foreground hover:border-primary/50'}`}
                              >
                                  {size}
                              </button>
                          ))}
                       </div>
                    </div>

                    {/* Quantity */}
                    <div>
                       <h3 className="font-bold mb-3 text-foreground">{t('product.quantity')}</h3>
                       <div className="flex items-center gap-6 bg-muted/40 w-fit rounded-xl border border-border p-1.5">
                          <button 
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-10 h-10 bg-background hover:bg-muted rounded-lg flex items-center justify-center transition-colors text-foreground shadow-sm border border-border/50"
                          >
                            -
                          </button>
                          <span className="w-10 text-center font-bold text-lg text-foreground">{quantity}</span>
                          <button 
                            onClick={() => setQuantity(q => q + 1)}
                            className="w-10 h-10 bg-background hover:bg-muted rounded-lg flex items-center justify-center transition-colors text-foreground shadow-sm border border-border/50"
                          >
                            +
                          </button>
                       </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                    <Button 
                        onClick={handleAddToCart}
                        className="flex-1 h-16 text-lg font-bold bg-primary text-white hover:bg-primary/90 hover:scale-[1.01] transition-all duration-300 rounded-2xl shadow-xl shadow-primary/20"
                    >
                        {t('products.add')}
                    </Button>
                    <button 
                        onClick={() => toggleFavorite(product.id, product)}
                        className={`h-16 w-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${isFavorite(product.id) ? 'bg-red-50 border-red-200 text-red-500' : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-primary'}`}
                    >
                        <Heart className={`w-7 h-7 ${isFavorite(product.id) ? 'fill-red-500' : ''}`} />
                    </button>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 pt-6 text-xs text-muted-foreground">
                   <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                        <Share2 className="w-4 h-4" />
                        <span>{t('product.shipping_info')}</span>
                   </div>
                   <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                        <Share2 className="w-4 h-4" />
                        <span>{t('product.return_policy')}</span>
                   </div>
                </div>

            </motion.div>
        </div>

        {/* Reviews Section */}
        <div className="mt-20 border-t border-border pt-12">
            <ReviewsList productId={product!.id} />
        </div>

      </div>
    </div>
  )
}
