'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react'
import { useRef, useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  isLoading?: boolean
  children?: React.ReactNode
}

import { useLanguage } from '@/components/LanguageProvider'

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'info',
  isLoading = false,
  children
}: ModalProps) {
  const { t } = useLanguage()
  const effectiveConfirmText = confirmText || t('common.confirm')
  const effectiveCancelText = cancelText || t('common.cancel')
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  const variants = {
    danger: {
      iconBg: 'bg-red-500/10 text-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20',
      icon: AlertCircle
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-500',
      button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
      icon: AlertCircle
    },
    info: {
      iconBg: 'bg-blue-500/10 text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
      icon: HelpCircle
    },
    success: {
       iconBg: 'bg-green-500/10 text-green-500',
       button: 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/20',
       icon: CheckCircle
    }
  }

  const currentVariant = variants[variant] || variants.info
  const Icon = currentVariant.icon

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
            className="fixed inset-0 bg-black/40 backdrop-blur-[4px] z-[60] flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              ref={modalRef}
              className="w-full max-w-lg bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden relative flex flex-col"
            >
                {/* Close Button */}
                <div className="absolute top-4 right-4 z-10">
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 sm:p-8 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${currentVariant.iconBg} ring-8 ring-background`}>
                        <Icon className="w-8 h-8" strokeWidth={2.5} />
                    </div>

                    {/* Content */}
                    <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                        {title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                        {description}
                    </p>

                    {/* Children (e.g. Inputs) */}
                    {children && (
                        <div className="w-full mt-6 text-left bg-muted/30 p-1 rounded-xl">
                            {children}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-6 bg-muted/30 border-t border-border/50 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-background rounded-xl transition-all border border-transparent hover:border-border"
                    >
                        {effectiveCancelText}
                    </button>
                    
                    {onConfirm && (
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full sm:w-auto px-8 py-3 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${currentVariant.button} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading && (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {effectiveConfirmText}
                        </button>
                    )}
                </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
