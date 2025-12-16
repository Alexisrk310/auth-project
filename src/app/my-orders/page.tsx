'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronRight, ShoppingBag, Star, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ui/Toast' // Added Toast import
import Link from 'next/link'
import Image from 'next/image'
import { fetchGuestOrders, linkGuestOrders } from '@/actions/orders'


interface Order {
  id: string
  created_at: string
  status: string
  total: number
  shipping_address: string
  city: string
  order_items?: any[]
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [debugError, setDebugError] = useState<string | null>(null) // New Debug State
  const { user } = useAuth()
  const { t } = useLanguage()
  const { addToast } = useToast()

  // Rating Modal State
  const [ratingModal, setRatingModal] = useState<{
      isOpen: boolean
      productId: string | null
      productName: string
      productImage: string
      rating: number
      comment: string
  }>({
      isOpen: false,
      productId: null,
      productName: '',
      productImage: '',
      rating: 5,
      comment: ''
  })
  
  const [userReviews, setUserReviews] = useState<Set<string>>(new Set())
  const [reviewPrompt, setReviewPrompt] = useState<any>(null)

  useEffect(() => {
    const loadData = async () => {
        setLoading(true)
        setDebugError(null)
        try {
            let localGuestIds = JSON.parse(localStorage.getItem('guest_orders') || '[]')
            console.log('DEBUG: localGuestIds found:', localGuestIds)
            
            // 0. Auto-Link if User Logged In
            if (user && localGuestIds.length > 0) {
                 console.log('DEBUG: Linking guest orders to user...')
                 const linkResult = await linkGuestOrders(user.id, localGuestIds)
                 if (linkResult.success) {
                     console.log(`DEBUG: Linked ${linkResult.count} orders. Clearing local guest storage.`)
                     localStorage.removeItem('guest_orders')
                     localGuestIds = [] // Treat as empty now
                     addToast(t('my_orders.orders_linked'), 'success')
                 } else {
                     console.error('DEBUG: Link Error:', linkResult.error)
                 }
            }

            // 1. Fetch Guest Orders (Server Action)
            let fetchedGuestOrders: any[] = []
            if (localGuestIds.length > 0) {
                // Now returns object { orders, error }
                const result = await fetchGuestOrders(localGuestIds)
                if (result.error) {
                    console.error('DEBUG: Server Error:', result.error)
                    setDebugError(result.error)
                }
                fetchedGuestOrders = result.orders || []
                console.log('DEBUG: fetchedGuestOrders result:', fetchedGuestOrders)
            } else {
                console.log('DEBUG: No local guest IDs found (or cleared after linking).')
            }

            // ... (rest of logic same) ...

            // 2. Fetch User Orders (Supabase Client)
            let fetchedUserOrders: any[] = []
            if (user?.id) {
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        id, created_at, status, total, shipping_address, city,
                        order_items:order_items!order_items_order_id_fkey (
                            id, product_id, quantity, price_at_time,
                            products ( name, image_url )
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                
                if (error) console.error(error)
                if (data) fetchedUserOrders = data

                // Fetch user reviews
                const { data: reviews } = await supabase
                    .from('reviews')
                    .select('product_id')
                    .eq('user_id', user.id)
                
                if (reviews) {
                    setUserReviews(new Set(reviews.map(r => r.product_id)))
                }
            }

            // 3. Merge & Deduplicate
            const allOrdersMap = new Map()
            fetchedGuestOrders.forEach(o => allOrdersMap.set(o.id, o)) // Guest first
            fetchedUserOrders.forEach(o => allOrdersMap.set(o.id, o))   // User overrides (if linked)

            const mergedOrders = Array.from(allOrdersMap.values())
            // Sort by date desc
            mergedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            setOrders(mergedOrders)

        } catch (error) {
            console.error('Error loading orders:', error)
        } finally {
            setLoading(false)
        }
    }
    
    loadData()
  }, [user])

  // Auto-Prompt for Reviews (Restored)
  useEffect(() => {
      if (loading || orders.length === 0) return

      let candidateItem: any = null
      
      for (const order of orders) {
          if (['delivered', 'entregado', 'completed'].includes(order.status.toLowerCase())) {
              for (const item of order.order_items || []) {
                  if (item.product_id && !userReviews.has(item.product_id)) {
                      const storageKey = `review_prompt_${item.product_id}`
                      const alreadyPrompted = localStorage.getItem(storageKey)
                      
                      if (!alreadyPrompted) {
                          candidateItem = item
                          break 
                      }
                  }
              }
          }
          if (candidateItem) break
      }

      if (candidateItem) {
          localStorage.setItem(`review_prompt_${candidateItem.product_id}`, 'true')
          setTimeout(() => {
              setReviewPrompt(candidateItem)
          }, 1000)
      }
  }, [orders, loading, userReviews])



  const openRatingModal = async (item: any) => {
      // 1. Check if delivered
      // Note: We check against 'delivered' (english DB value)
      // If your DB stores localized statuses, adjust accordingly.
      // Assuming 'delivered' based on typical flow.
      const order = orders.find(o => o.order_items?.some(i => i.id === item.id));
      if (order?.status !== 'delivered' && order?.status !== 'entregado') {
          addToast(t('reviews.delivered_only'), 'error')
          return
      }

      // 2. Check if already reviewed (unless owner)
      // We need to know if the user is owner.
      // We can fetch the user's role from profiles or metadata.
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single()
      
      const isOwner = profile?.role === 'owner' || user?.user_metadata?.role === 'owner';

      if (!isOwner) {
          const { data: existingReview } = await supabase
            .from('reviews')
            .select('id')
            .eq('user_id', user!.id)
            .eq('product_id', item.product_id)
            .eq('product_id', item.product_id)
            .maybeSingle()

          if (existingReview) {
              addToast(t('reviews.already_reviewed'), 'error')
              return
          }
      }

      setRatingModal({
          isOpen: true,
          productId: item.product_id,
          productName: item.products?.name || 'Product',
          productImage: item.products?.image_url || '/placeholder.png',
          rating: 5,
          comment: ''
      })
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmitReview = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!ratingModal.productId || !user || isSubmitting) return

      setIsSubmitting(true)
      try {
          const { error } = await supabase.from('reviews').insert({
              user_id: user.id,
              product_id: ratingModal.productId,
              rating: ratingModal.rating,
              comment: ratingModal.comment,
              username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
              created_at: new Date().toISOString()
          })

          if (error) throw error

          addToast(t('reviews.success'), 'success')
          if (ratingModal.productId) {
            setUserReviews(prev => new Set(prev).add(ratingModal.productId!))
          }
          setRatingModal({ isOpen: false, productId: null, productName: '', productImage: '', rating: 5, comment: '' })

      } catch (error) {
          console.error('Error submitting review:', error)
          addToast('Error submitting review', 'error')
      } finally {
          setIsSubmitting(false)
      }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'shipped': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20'
      default: return 'text-muted-foreground bg-muted border-border'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
        case 'paid': return <CheckCircle className="w-4 h-4" />
        case 'pending': return <Clock className="w-4 h-4" />
        case 'shipped': return <Truck className="w-4 h-4" />
        case 'cancelled': return <XCircle className="w-4 h-4" />
        default: return <Package className="w-4 h-4" />
    }
  }

  if (loading) {
      return (
          <div className="min-h-screen pt-24 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-3xl font-bold">{t('my_orders.title')}</h1>
                <p className="text-muted-foreground">{t('my_orders.desc')}</p>
            </div>
        </div>

        <div className="space-y-4">
             {orders.length === 0 ? (
                 <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                     <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                     <h3 className="text-lg font-medium mb-2">{t('my_orders.no_orders')}</h3>
                     <p className="text-muted-foreground mb-6">{t('my_orders.no_orders_desc')}</p>
                     <Link href="/shop" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                        {t('my_orders.start_shopping')}
                     </Link>
                 </div>
             ) : (
                 orders.map((order, i) => (
                     <motion.div 
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group bg-card border border-border/50 rounded-xl p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
                     >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm text-muted-foreground">#{order.id.slice(0, 8)}</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                        {getStatusIcon(order.status)}
                                        <span className="capitalize">{t(`my_orders.status.${order.status.toLowerCase()}`)}</span>
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{order.city}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('my_orders.total')}</p>
                                <p className="font-bold text-lg">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number(order.total))}
                                </p>
                            </div>
                        </div>

                        {/* Order Items List */}
                            <div className="border-t border-border/50 pt-4 space-y-4">
                            {order.order_items?.map((item, idx) => {
                                const hasReview = item.product_id && userReviews.has(item.product_id)
                                return (
                                <div key={idx} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                            {item.products?.image_url && (
                                                <Image src={item.products.image_url} alt={item.products.name} fill className="object-cover" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">{item.products?.name || 'Product'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t('my_orders.qty')}: {item.quantity} • {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.price_at_time)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    
                                    { (['delivered', 'entregado', 'completed'].includes(order.status.toLowerCase())) ? (
                                        hasReview ? (
                                            <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted rounded-lg">
                                                <CheckCircle className="w-3.5 h-3.5" /> {t('reviews.already_reviewed')}
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => openRatingModal(item)}
                                                className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                            >
                                                <Star className="w-3.5 h-3.5" /> {t('reviews.rate_btn')}
                                            </button>
                                        )
                                    ) : (
                                        <div className="text-xs text-muted-foreground/40 px-3 py-1.5 flex items-center gap-1.5 cursor-not-allowed" title={t('reviews.delivered_only')}>
                                            <Star className="w-3.5 h-3.5" /> {t('reviews.rate_btn')}
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                        </div>

                     </motion.div>
                 ))
             )}
        </div>

        {/* Rating Modal */}
        <AnimatePresence>
            {ratingModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden"
                    >
                        <div className="flex justify-between items-center p-4 border-b border-border">
                            <h3 className="font-bold">{t('reviews.modal_title')}</h3>
                            <button onClick={() => setRatingModal(prev => ({ ...prev, isOpen: false }))}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmitReview} className="p-6 space-y-6">
                            {/* Product Preview */}
                            <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-xl border border-border/50">
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                                    {ratingModal.productImage && (
                                        <Image src={ratingModal.productImage} alt="" fill className="object-cover" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold line-clamp-2 text-sm">{ratingModal.productName}</p>
                                    <p className="text-xs text-muted-foreground">{t('reviews.share_exp')}</p>
                                </div>
                            </div>

                            {/* Stars */}
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRatingModal(prev => ({ ...prev, rating: star }))}
                                        className="focus:outline-none transition-transform hover:scale-110 p-1"
                                    >
                                        <Star 
                                            className={`w-10 h-10 ${
                                                ratingModal.rating >= star 
                                                    ? 'text-yellow-400 fill-yellow-400' 
                                                    : 'text-gray-300'
                                            }`} 
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Comment */}
                            <div>
                                <label className="text-xs font-bold mb-2 block">{t('reviews.label')}</label>
                                <textarea 
                                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none h-32 resize-none"
                                    placeholder={t('reviews.placeholder')}
                                    value={ratingModal.comment}
                                    onChange={e => setRatingModal(prev => ({ ...prev, comment: e.target.value }))}
                                    required
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        {t('reviews.submit')}...
                                    </span>
                                ) : t('reviews.submit')}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {/* Interactive Review Prompt Notification */}
        <AnimatePresence>
            {reviewPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    className="fixed bottom-6 right-6 z-50 bg-card border border-border shadow-2xl rounded-xl p-4 w-[320px] backdrop-blur-md"
                >
                    <div className="flex gap-4 items-start">
                         <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                            {reviewPrompt.products?.image_url && (
                                <Image src={reviewPrompt.products.image_url} alt="" fill className="object-cover" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm mb-1">{t('reviews.prompt_title')}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{reviewPrompt.products?.name}</p>
                            
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => {
                                        openRatingModal(reviewPrompt)
                                        setReviewPrompt(null)
                                    }}
                                    className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    {t('reviews.rate_now')}
                                </button>
                                <button 
                                    onClick={() => setReviewPrompt(null)}
                                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold py-1.5 rounded-lg transition-colors border border-border"
                                >
                                    {t('reviews.maybe_later')}
                                </button>
                            </div>
                        </div>
                        <button onClick={() => setReviewPrompt(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
        {/* Debug Section - Temporary */}
        <div className="mt-12 p-4 bg-black/5 rounded-lg text-xs font-mono text-muted-foreground border border-border">
            <p className="font-bold mb-2">Debug Info (Take screenshot if empty):</p>
            <p>Guest IDs in Storage: {typeof window !== 'undefined' ? localStorage.getItem('guest_orders') : 'N/A'}</p>
            <p>Orders Fetched: {orders.length}</p>
            <p>User ID: {user?.id || 'Guest'}</p>
        </div>
      </div>
    </div>
  )
}

