'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { Loader2, ArrowRight, Clock } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { useSearchParams } from 'next/navigation'

function PendingContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id')
  const orderId = searchParams.get('external_reference')
  const [isChecking, setIsChecking] = React.useState(true)

  // Polling for status update
  React.useEffect(() => {
      if (!orderId) {
          setIsChecking(false)
          return
      }

      const checkStatus = async () => {
          try {
              const { supabase } = await import('@/lib/supabase/client')
              const { data, error } = await supabase
                  .from('orders')
                  .select('status')
                  .eq('id', orderId)
                  .single()
              
              if (data?.status === 'paid') {
                  window.location.href = `/cart/success?payment_id=${paymentId}&external_reference=${orderId}`
              }
          } catch (e) {
              console.error('Polling error', e)
          }
      }

      // Check immediately
      checkStatus()

      // Poll every 3 seconds for 1 minute max (20 attempts)? Or just infinite loop while open?
      // Let's do intervals
      const interval = setInterval(checkStatus, 3000)

      return () => clearInterval(interval)
  }, [orderId, paymentId])

  return (
    <div className="min-h-[85vh] bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-400/5 rounded-full blur-3xl -z-10" />

      {/* Icon Wrapper with Animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 backdrop-blur-sm">
          <Clock className="w-12 h-12 text-yellow-500 animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white rounded-full p-2 shadow-lg animate-bounce">
            <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-5 duration-500">
        <div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            {t('page.pending.title')}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            {t('page.pending.desc')}
            </p>
        </div>

        {paymentId && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-mono text-sm">
                <span>Ref:</span> 
                <span className="font-bold">{paymentId}</span>
            </div>
        )}

        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
             <Link 
              href="/dashboard" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            >
              {t('page.pending.check_status')} <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link 
              href="/" 
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl border border-border/50 bg-background hover:bg-muted/50 font-semibold transition-all hover:border-foreground/20"
            >
              {t('page.pending.back_home')}
            </Link>
        </div>
      </div>
    </div>
  )
}

export default function PendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div>}>
      <PendingContent />
    </Suspense>
  )
}
