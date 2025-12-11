'use client'

import { motion } from 'framer-motion'
import { ShoppingCart, Eye, Heart } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useCartStore, Product } from '@/store/useCartStore'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ui/Toast'
import { useFavorites } from '@/hooks/useFavorites'

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.images?.[0] || product.image_url || '/placeholder.png',
      description: product.description,
      size: selectedSize
    })
    
    addToast(`${t('cart.added_success')} (${selectedSize})`, 'success')
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
           PROMO
        </div>
      )}

      {/* Favorite Button */}
      <button 
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id, product)
        }}
        className={`absolute top-3 right-3 z-50 p-2 rounded-full backdrop-blur-md shadow-lg transition-all duration-300 group-hover:scale-110 ${isFavorite(product.id) ? 'bg-background border border-border text-red-500' : 'bg-black/30 text-white hover:bg-white/20'}`}
      >
        <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
      </button>

      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Image
          src={product.images?.[0] || product.image_url || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Overlay Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-2">
            
            {/* Size Selector */}
            <div className="flex justify-center gap-1 bg-black/40 p-1.5 rounded-xl backdrop-blur-md" onClick={(e) => e.preventDefault()}>
                {(product.sizes?.length ? product.sizes : ['S', 'M', 'L', 'XL']).map(size => (
                    <button
                        key={size}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedSize(size)
                        }}
                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all ${
                            selectedSize === size 
                                ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                                : 'text-white/80 hover:bg-white/10'
                        }`}
                    >
                        {size}
                    </button>
                ))}
            </div>

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
            <p className="text-xs text-primary font-medium tracking-wider uppercase mb-1">{product.category || 'Streetwear'}</p>
            <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1 text-foreground">{product.name}</h3>
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
        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
      </div>
    </motion.div>
  )
}
