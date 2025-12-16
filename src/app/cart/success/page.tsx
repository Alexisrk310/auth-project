'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, ArrowRight, ShoppingBag, Loader2, Download, Package } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useLanguage } from '@/components/LanguageProvider'
import { supabase } from '@/lib/supabase/client'

function SuccessContent() {
  const { t } = useLanguage()
  const clearCart = useCartStore((state) => state.clearCart)
  const searchParams = useSearchParams()
  const router = useRouter() // Use router if we need to redirect, though unlikely here
  
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract params from Mercado Pago return URL
  const orderId = searchParams.get('external_reference')
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const status = searchParams.get('status') || searchParams.get('collection_status')
  const paymentType = searchParams.get('payment_type')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount)
  }

  useEffect(() => {
    const processOrder = async () => {
        if (!orderId) {
            setError(t('page.success.no_order_id') || 'No se encontró el ID de la orden.')
            setLoading(false)
            return
        }

        try {
            // 1. Confirm Order via API (Backup for Webhook)
            // Construct basic payment data from URL params as fallback
            const paymentData = {
                payment_method_id: paymentType || 'unknown',
                transaction_id: paymentId,
                status: status,
                date_approved: new Date().toISOString()
            }

            await fetch('/api/orders/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId, 
                    paymentData // Pass URL params as payment data
                })
            });

            // 2. Fetch Order Details for Display
            const { data: orderData, error: fetchError } = await supabase
                .from('orders')
                .select('*, order_items(*, products(name, image_url, images))')
                .eq('id', orderId)
                .single()

            if (fetchError || !orderData) {
                console.error('Error fetching order', fetchError)
                // If fetch fails (e.g. RLS issues for guest), we might just show a generic success
                // But usually public read is allowed or we rely on session. 
                // If guest, they might not see it if RLS is strict. 
                // For now, assume RLS allows reading own order or public read by ID (if configured).
                // If not, we just show success message without details.
            } else {
                setOrder(orderData)
            }

        } catch (err) {
            console.error('Processing Error:', err)
        } finally {
            setLoading(false)
            clearCart()
        }
    }

    processOrder()

    // Confetti
    const duration = 3 * 1000
    const end = Date.now() + duration
    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#22c55e', '#16a34a', '#4ade80'] })
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#22c55e', '#16a34a', '#4ade80'] })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()

  }, [orderId, paymentId, status, paymentType, clearCart, t])

  if (loading) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <div className="relative w-20 h-20">
                  <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-4 text-muted-foreground font-medium animate-pulse">{t('checkout.processing') || 'Procesando tu pedido...'}</p>
          </div>
      )
  }

  return (
    <div className="min-h-[85vh] bg-background flex flex-col items-center justify-start pt-16 pb-12 px-4 sm:px-6 relative overflow-visible">
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
          <Check className="w-10 h-10 text-white stroke-[3]" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-2xl w-full mx-auto space-y-8 text-center"
      >
        <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-3">
            {t('page.success.title')}
            </h1>
            <p className="text-muted-foreground leading-relaxed max-w-lg mx-auto">
            {t('page.success.desc')}
            </p>
            {paymentId && (
                <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 inline-block px-2 py-1 rounded">
                    Ref: {paymentId}
                </p>
            )}
        </div>

        {order && (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm text-left relative overflow-hidden"
            >
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-6 border-b border-border/50 gap-4">
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('invoice.order_num')}</p>
                        <p className="font-mono font-black text-xl tracking-tight">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                         <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {t('dash.paid')}
                        </span>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-4 mb-6">
                    {order.order_items?.map((item: any, idx: number) => {
                         const img = item.products?.image_url || item.products?.images?.[0]
                         return (
                            <div key={idx} className="flex items-center gap-4 group">
                                <div className="w-16 h-16 bg-muted rounded-2xl relative overflow-hidden flex-shrink-0 border border-border/50 shadow-sm group-hover:shadow-md transition-all">
                                    {img ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={img} alt={item.products?.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground font-bold">{t('dash.image_abbr')}</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground text-sm truncate">{item.products?.name || t('dash.product')}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {t('dash.size')}: <span className="font-medium text-foreground">{item.size || 'N/A'}</span> • {t('dash.table_qty')}: <span className="font-medium text-foreground">{item.quantity}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-foreground text-sm">{formatCurrency(item.price_at_time * item.quantity)}</p>
                                </div>
                            </div>
                         )
                    })}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-6"></div>

                {/* Shipping & Totals */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">{t('checkout.shipping')}</span>
                        <div className="text-right">
                             <p className="font-medium text-foreground">{order.city}</p>
                             <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{order.shipping_address}</p>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 mt-2 border-t border-border/30">
                        <span className="font-black text-lg">{t('checkout.total')}</span>
                        <div className="text-right">
                            <span className="font-black text-3xl text-primary">{formatCurrency(order.total)}</span>
                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide mt-1">{t('dash.included_badge')}</p>
                        </div>
                    </div>
                </div>
            </motion.div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Package className="w-5 h-5" /> {t('page.success.view_order')}
          </Link>
          
          <Link 
            href="/shop" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-border bg-card hover:bg-muted font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingBag className="w-5 h-5" /> {t('page.success.continue_shopping')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default function SuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
            <SuccessContent />
        </Suspense>
    )
}
