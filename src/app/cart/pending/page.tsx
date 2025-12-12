'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { Loader2, ArrowRight } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

function PendingContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-[80vh] bg-background flex flex-col items-center justify-center p-6 text-center">
      {/* Icon Wrapper with Animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/30 shadow-2xl shadow-yellow-500/10">
          <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4 animate-in slide-in-from-bottom-5 duration-500">
        <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/60 tracking-tight">
          {t('page.pending.title')}
        </h1>
        
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t('page.pending.desc')}
        </p>

        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
             <Link 
              href="/dashboard" 
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('page.pending.check_status')} <ArrowRight className="w-4 h-4" />
            </Link>
            
            <Link 
              href="/" 
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-border/50 bg-background hover:bg-muted/50 font-semibold transition-all hover:border-foreground/20"
            >
              {t('page.pending.back_home')}
            </Link>
        </div>
        
        <p className="text-sm text-muted-foreground pt-8">
            Transaction ID: {new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('payment_id') || 'Pending'}
        </p>
      </div>
    </div>
  )
}

export default function PendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <PendingContent />
    </Suspense>
  )
}
