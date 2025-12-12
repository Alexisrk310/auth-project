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

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      console.log('Fetching orders for user:', user?.id)
      if (!user?.id) {
         console.warn('User ID is undefined, skipping fetch')
         return 
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
            id, created_at, status, total, shipping_address, city,
            order_items (
                id, product_id, quantity, price_at_time,
                products ( name, image_url )
            )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setOrders(data)
    } catch (error: any) {
      console.error('Error fetching orders:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

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
            .single()

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

  const handleSubmitReview = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!ratingModal.productId || !user) return

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
          setRatingModal({ isOpen: false, productId: null, productName: '', productImage: '', rating: 5, comment: '' })

      } catch (error) {
          console.error('Error submitting review:', error)
          addToast('Error submitting review', 'error')
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
                                        <span className="capitalize">{order.status}</span>
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
                            {order.order_items?.map((item, idx) => (
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
                                                Qty: {item.quantity} • {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.price_at_time)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Rate Button - Only show active if delivered, but we let handle logic show toast if clicked on others or maybe hide it? 
                                        User asked: "Enable rating ONLY for delivered orders". 
                                        Let's grayscale it if not delivered. 
                                    */}
                                    { (order.status === 'delivered' || order.status === 'entregado') ? (
                                        <button 
                                            onClick={() => openRatingModal(item)}
                                            className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                                        >
                                            <Star className="w-3.5 h-3.5" /> {t('reviews.rate_btn')}
                                        </button>
                                    ) : (
                                        <div className="text-xs text-muted-foreground/40 px-3 py-1.5 flex items-center gap-1.5 cursor-not-allowed" title={t('reviews.delivered_only')}>
                                            <Star className="w-3.5 h-3.5" /> {t('reviews.rate_btn')}
                                        </div>
                                    )}
                                </div>
                            ))}
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
                            <h3 className="font-bold">Rate Product</h3>
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
                                    <p className="text-xs text-muted-foreground">Share your experience!</p>
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
                                <label className="text-xs font-bold mb-2 block">Your Review</label>
                                <textarea 
                                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none h-32 resize-none"
                                    placeholder="What did you like or dislike? How was the quality?"
                                    value={ratingModal.comment}
                                    onChange={e => setRatingModal(prev => ({ ...prev, comment: e.target.value }))}
                                    required
                                />
                            </div>

                            <button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity">
                                Submit Review
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

      </div>
    </div>
  )
}
