'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, X } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

interface LogoutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  const { t } = useLanguage()

  // Prevent scrolling when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border/50 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-border/50 bg-gradient-to-r from-primary/10 to-purple-600/10">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5" />
                <div className="relative flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/50">
                    <LogOut className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-foreground">{t('auth.logout_confirm.title')}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t('auth.logout_confirm.description')}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-muted hover:bg-muted/80 transition-all border border-border/50 hover:scale-105"
                >
                  {t('auth.logout_confirm.cancel')}
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-primary to-purple-600 text-white hover:opacity-90 transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:scale-105"
                >
                  {t('auth.logout_confirm.confirm')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
