'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { X, RefreshCw, HelpCircle, AlertOctagon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/components/LanguageProvider'

function FailureContent() {
  const { t } = useLanguage()

  return (
    <div className="min-h-[85vh] bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
       {/* Decorative Background */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-400/5 rounded-full blur-3xl -z-10" />

       <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
          <X className="w-16 h-16 text-white stroke-[3]" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-red-600 text-white rounded-full p-2 shadow-lg animate-pulse">
            <AlertOctagon className="w-6 h-6" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-xl mx-auto space-y-6"
      >
        <div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mb-4">
            {t('page.failure.title')}
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            {t('page.failure.desc')}
            </p>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/cart" 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
          >
            <RefreshCw className="w-4 h-4" /> {t('page.failure.try_again')}
          </Link>
          
          <button 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-border/50 bg-background hover:bg-muted/50 font-semibold transition-all hover:border-foreground/20"
            onClick={() => window.open('https://api.whatsapp.com/send?phone=573001234567', '_blank')}
          >
            <HelpCircle className="w-4 h-4" /> {t('page.failure.contact_support')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function FailurePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">...</div>}>
            <FailureContent />
        </Suspense>
    )
}
