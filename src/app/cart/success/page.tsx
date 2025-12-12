'use client'

import Link from 'next/link'
import { Check, ArrowRight, ShoppingBag } from 'lucide-react'
import { useEffect } from 'react'
import { useCartStore } from '@/store/useCartStore'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useLanguage } from '@/components/LanguageProvider'

export default function SuccessPage() {
  const { t, language } = useLanguage()
  const clearCart = useCartStore((state) => state.clearCart)

  useEffect(() => {
    // Only send email if we have items (before clearing)
    // In a real app, you'd pass the order ID via query params to fetch details
    // For this demo, we'll try to use the last state or better yet, assume 'pending' page handles it?
    // Actually, MercadoPago redirect loses state usually. 
    // Ideally, we rely on the webhook.
    // BUT, for this specific request "Transactional Emails", we will trigger it here for immediate gratification
    // assuming we could persist the "latest order" in local storage or fetched from DB if we had the ID.
    
    // To make this robust without ID in URL:
    // We will skip sending HERE effectively because we don't have the order data handy after redirect.
    // The PRO way is Webhooks.
    // The SEMI-PRO way is: /success?order_id=123
    
    // Let's assume the user wants it working now. 
    // I will mock the data or try to fetch the last order for the logged in user?
    // Fetching last order is safer.
    
    const sendEmail = async () => {
      try {
         // Fetch last order
         const { data: { user } } = await import('@/lib/supabase/client').then(m => m.supabase.auth.getUser())
         if (!user) return

         const { data: orders } = await import('@/lib/supabase/client').then(m => m.supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
         )

         if (orders && orders[0]) {
             // Confirm Order & Deduct Stock
             // We do this here for the user waiting on success page
             await fetch('/api/orders/confirm', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ orderId: orders[0].id })
             });

             // Only send if created just now (e.g. < 5 mins ago) to avoid re-sending on refresh
             const orderDate = new Date(orders[0].created_at).getTime()
             if (Date.now() - orderDate > 5 * 60 * 1000) return 

             // Send Email
             await fetch('/api/send-email', {
                 method: 'POST',
                 body: JSON.stringify({
                     type: 'order_confirmation',
                     payload: {
                         email: user.email,
                         orderId: orders[0].id,
                         total: orders[0].total,
                         items: orders[0].order_items || [], 
                         lang: language
                     }
                 })
             })
         }
      } catch (e) {
          console.error(e)
      }
    }

    sendEmail()
    
    clearCart()
    // Trigger confetti
    const duration = 3 * 1000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#16a34a', '#4ade80']
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#16a34a', '#4ade80']
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }, [clearCart])

  return (
    <div className="min-h-[85vh] bg-background flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full" />
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
          <Check className="w-12 h-12 text-white stroke-[3]" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-xl mx-auto space-y-4"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          {t('page.success.title')}
        </h1>
        
        <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
          {t('page.success.desc')}
        </p>

        <div className="pt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/dashboard" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            {t('page.success.view_order')} <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link 
            href="/shop" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border/50 bg-background hover:bg-muted/50 font-semibold transition-all hover:border-foreground/20 group"
          >
            {t('page.success.continue_shopping')} <ShoppingBag className="w-4 h-4 group-hover:-rotate-12 transition-transform" />
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
