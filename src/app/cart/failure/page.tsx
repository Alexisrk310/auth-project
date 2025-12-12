'use client'

import Link from 'next/link'
import { X, RefreshCw, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/components/LanguageProvider'

export default function FailurePage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-[85vh] bg-background flex flex-col items-center justify-center p-6 text-center">
       <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-2xl shadow-red-500/30">
          <X className="w-12 h-12 text-white stroke-[3]" />
        </div>
      </motion.div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="max-w-xl mx-auto space-y-4"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
          {t('page.failure.title')}
        </h1>
        
        <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
          {t('page.failure.desc')}
        </p>

        <div className="pt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
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
