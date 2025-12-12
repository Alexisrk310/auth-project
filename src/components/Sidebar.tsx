import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Filter, Ruler, Tag, DollarSign } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

export function Sidebar({ className = "" }: { className?: string }) {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentGender = searchParams.get('gender')
  const currentCategory = searchParams.get('category')
  const currentSize = searchParams.get('size')
  const currentMin = searchParams.get('minPrice')
  const currentMax = searchParams.get('maxPrice')

  const [minPrice, setMinPrice] = useState(currentMin || '')
  const [maxPrice, setMaxPrice] = useState(currentMax || '')

  // Update local state when URL changes (e.g. clear filters)
  useEffect(() => {
    setMinPrice(currentMin || '')
    setMaxPrice(currentMax || '')
  }, [currentMin, currentMax])

  const isActive = (type: 'gender' | 'category' | 'size', value: string) => {
    if (type === 'gender') return currentGender === value.toLowerCase()
    if (type === 'category') return currentCategory === value.toLowerCase()
    if (type === 'size') return currentSize === value
    return false
  }

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/shop?${params.toString()}`)
  }

  const applyPrice = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (minPrice) params.set('minPrice', minPrice)
    else params.delete('minPrice')
    
    if (maxPrice) params.set('maxPrice', maxPrice)
    else params.delete('maxPrice')
    
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <aside className={`w-full space-y-4 h-fit ${className}`}>
       {/* Filters */}
       <div className="p-4 rounded-xl bg-card border border-border/50 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-2 mb-4 text-primary border-b border-border/50 pb-3">
             <Filter className="w-4 h-4" />
             <h3 className="font-bold text-sm uppercase tracking-wide">{t('filters.title')}</h3>
          </div>
          
          <div className="space-y-6">
             {/* Gender */}
             <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <UserIcon /> {t('filters.gender')}
                </h4>
                <div className="space-y-1">
                   <button 
                        onClick={() => updateFilter('gender', isActive('gender', 'men') ? null : 'men')}
                        className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-all text-xs ${isActive('gender', 'men') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'}`}
                   >
                      <div className={`w-3 h-3 border border-current rounded flex items-center justify-center ${isActive('gender', 'men') ? 'bg-current' : ''}`}>
                          {isActive('gender', 'men') && <span className="text-white text-[8px]">✓</span>}
                      </div> 
                      {t('filters.men')}
                   </button>
                    <button 
                        onClick={() => updateFilter('gender', isActive('gender', 'women') ? null : 'women')}
                        className={`w-full flex items-center gap-2 p-1.5 rounded-lg transition-all text-xs ${isActive('gender', 'women') ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      <div className={`w-3 h-3 border border-current rounded flex items-center justify-center ${isActive('gender', 'women') ? 'bg-current' : ''}`}>
                          {isActive('gender', 'women') && <span className="text-white text-[8px]">✓</span>}
                      </div>
                      {t('filters.women')}
                   </button>
                </div>
             </div>
            
             {/* Price Range */}
             <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3" /> {t('filters.price_title')}
                </h4>
                <div className="flex flex-col gap-2 mb-2">
                    <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">$</span>
                        <input 
                            type="number" 
                            placeholder={t('filters.min_placeholder')} 
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-full pl-4 pr-2 py-1.5 text-xs bg-muted/30 border border-border rounded-md focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">$</span>
                        <input 
                            type="number" 
                            placeholder={t('filters.max_placeholder')} 
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full pl-4 pr-2 py-1.5 text-xs bg-muted/30 border border-border rounded-md focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>
                <button 
                    onClick={applyPrice}
                    className="w-full py-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded-md hover:bg-primary/90 transition-colors"
                >
                    {t('filters.apply')}
                </button>
             </div>

             {/* Sizes */}
             <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Ruler className="w-3 h-3" /> {t('filters.size_title')}
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                        <button
                            key={size}
                            onClick={() => updateFilter('size', currentSize === size ? null : size)}
                            className={`py-1 text-[10px] font-bold rounded-md border transition-all ${
                                currentSize === size 
                                    ? 'bg-primary text-primary-foreground border-primary' 
                                    : 'bg-background border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
             </div>

             {/* Categories */}
             <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Tag className="w-3 h-3" /> {t('filters.categories')}
                </h4>
                <div className="flex flex-col gap-0.5">
                   {['T-Shirts', 'Hoodies', 'Pants', 'Accessories', 'Caps'].map(cat => (
                      <Link 
                        key={cat} 
                        href={`/shop?category=${cat.toLowerCase()}`} 
                         className={`block text-xs py-1.5 px-2 rounded-md transition-all ${
                            isActive('category', cat.toLowerCase()) 
                                ? 'bg-primary/10 text-primary font-bold translate-x-1' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                         {t(`cat.${cat.toLowerCase()}`)}
                      </Link>
                   ))}
                </div>
             </div>
          </div>
       </div>
       
       {/* Promo Banner Compact */}
       <div className="p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
          <h4 className="font-bold text-sm mb-1 relative z-10">{t('filters.banner.title')}</h4>
          <p className="text-xs text-muted-foreground mb-3 relative z-10 leading-tight">{t('filters.banner.desc')}</p>
          <Link href="/descuentos" className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline relative z-10">
             {t('filters.banner.cta')} &rarr;
          </Link>
       </div>
    </aside>
  )
}

function UserIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
    )
}
