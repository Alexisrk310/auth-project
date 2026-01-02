'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trash2, ArrowRight, Loader2 } from 'lucide-react'
import { useCartStore } from '@/store/useCartStore'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ui/Toast' // Custom Toast
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { logNewOrder } from '@/actions/orders'
import { SHIPPING_RATES, DEFAULT_SHIPPING_COST } from '@/config/shipping'

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, isLoading, coupon, applyCoupon, removeCoupon } = useCartStore()
  const { t } = useLanguage()
  const { user } = useAuth()
  const { addToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [couponInput, setCouponInput] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  const handleApplyCoupon = async () => {
    if (!couponInput) return
    setValidatingCoupon(true)
    try {
      const { validateCoupon } = await import('../coupon-actions')
      const res = await validateCoupon(couponInput, total())

      if (res.error) {
        // Check if error is a key that needs params
        if (res.error === 'coupons.error.min_purchase') {
          addToast(t(res.error).replace('{0}', res.minPurchase), 'error')
        } else {
          addToast(t(res.error), 'error')
        }
      } else if (res.success && res.coupon) {
        applyCoupon(res.coupon)
        addToast(t('cart.coupon_applied'), 'success')
        setCouponInput('')
      }
    } catch (error) {
      console.error(error)
      addToast(t('cart.error_prefix'), 'error')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val)

  // ... (shipping form state) ...
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    neighborhood: '',
    city: '',
    phone: '',
  })

  useEffect(() => {
    // Check for user and pre-fill address
    const checkUserAndAddress = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: address } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single()

        if (address) {
          setFormData(prev => ({
            ...prev,
            name: address.recipient_name,
            phone: address.phone,
            address: address.address_line1,
            neighborhood: address.neighborhood || '',
            city: address.city,
            email: user.email || '' // Prefill email
          }))
        }
      }
    }
    checkUserAndAddress()
  }, [])

  // Calculate dynamic shipping cost
  // ... (keep existing) ...
  const shippingCost = useMemo(() => {
    if (!formData.city) return 0
    return SHIPPING_RATES[formData.city] || DEFAULT_SHIPPING_COST
  }, [formData.city])


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t('cart.verifying_prices')}</p>
      </div>
    )
  }

  // Empty State (keep existing)
  if (items.length === 0) {
    // ... keep existing empty state
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">{t('nav.cart')}</h1>
        <p className="text-muted-foreground mb-8 text-lg">{t('cart.empty')}</p>
        <Link
          href="/shop"
          className="bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {t('home.view_all')}
        </Link>
      </div>
    )
  }

  // ... rest of component rendering ...
  const handleCheckout = async () => {
    // ... (keep existing handleCheckout logic) ...
    // Validate Form
    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.phone) {
      addToast(`${t('checkout.missing_fields')}`, 'error')
      return
    }

    setLoading(true)

    setLoading(true)

    // Save to local storage for guest tracking (optional, but we won't have ID yet)
    // We can't save ID here easily unless API returns it or we fetch it later.
    // Actually, API returns preference URL. 
    // If we want guest orders to persist in local storage, we might need the API to return the OrderID too.

    /* 
       Optimization: Request API to return orderId as well.
       Let's update API later if needed. For now, guest order tracking might break slightly unless we get ID back.
       But fixing the CRITICAL "Payment not processed" is higher priority.
    */

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items,
          couponCode: coupon?.code,
          shippingCost: shippingCost,
          metadata: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            city: formData.city,
            address: formData.address,
            neighborhood: formData.neighborhood,
            user_id: user?.id || null
          }
        }),
      })

      const data = await response.json()

      if (data.url) {
        addToast(t('checkout.redirecting'), 'success')
        window.location.href = data.url
      } else {
        console.error('Checkout failed. Server response:', data)
        const serverError = data.error || t('checkout.init_failed')
        addToast(serverError, 'error')
      }
    } catch (error: any) {
      console.error('Full Checkout Error:', JSON.stringify(error, null, 2))
      const errorMsg = error?.message || error?.error || 'cart.checkout_error_default'
      // Try to translate the error if it's a key
      const translatedError = t(errorMsg).startsWith(errorMsg) && !errorMsg.includes(' ') ? t(errorMsg) : t(errorMsg)

      // If the error message from backend is NOT a key (has spaces), it might be hard to translate directly.
      // Ideally backend returns keys.
      // For now, we assume if it has spaces, it's a raw string, otherwise it's a key.
      // But t() returns the key if not found.

      addToast(`${t('cart.error_prefix')}${translatedError}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-12">{t('nav.cart')}</h1>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {items.map((item, index) => (
              <motion.div
                key={`${item.id}-${item.size}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-2xl bg-card border border-border/50 shadow-sm"
              >
                <div className="relative w-full sm:w-24 h-32 sm:h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 96px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between gap-4 sm:gap-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{item.name}</h3>
                      <div className="flex gap-2 text-sm text-muted-foreground mt-1">
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-xs font-mono uppercase">
                          {t('cart.size')}: {item.size || 'M'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-background rounded-md transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-lg">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Checkout & Shipping Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">

              {/* Shipping Info */}
              <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  {t('checkout.shipping')}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('checkout.name')}</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder={t('checkout.placeholder_name')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('auth.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder={t('auth.email_placeholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('checkout.address')}</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none mb-2"
                      placeholder={t('checkout.placeholder_address')}
                    />
                    <input
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      placeholder={t('address.neighborhood_placeholder')}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('checkout.city')}</label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="">{t('checkout.select_city')}</option>
                        {Object.keys(SHIPPING_RATES).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('checkout.phone')}</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                        placeholder={t('checkout.placeholder_phone')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-card border border-border/50 p-6 shadow-xl">
                <h2 className="text-xl font-bold mb-6">{t('checkout.summary')}</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('checkout.subtotal')}</span>
                    <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(total())}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{t('checkout.shipping_cost')}</span>
                    <span className={!formData.city ? 'text-xs italic' : ''}>
                      {formData.city
                        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(shippingCost)
                        : t('checkout.select_city_calc')
                      }
                    </span>
                  </div>
                  {coupon && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>{t('checkout.discount')} ({coupon.code})</span>
                      <span>-{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(coupon.applied_discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-border/50 pt-4 flex justify-between font-bold text-xl">
                    <span>{t('checkout.total')}</span>
                    <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(total() + shippingCost - (coupon?.applied_discount || 0))}</span>
                  </div>
                </div>

                {/* Coupon Input */}
                <div className="mb-6">
                  {!coupon ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder={t('checkout.coupon_placeholder')}
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none uppercase font-mono"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={validatingCoupon || !couponInput}
                        className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted/80 disabled:opacity-50"
                      >
                        {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : t('checkout.apply')}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <span className="text-green-600 font-bold font-mono text-sm">{coupon.code}</span>
                        <span className="text-green-600/80 text-xs block">-{formatCurrency(coupon.applied_discount)} {t('checkout.discount_applied')}</span>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-accent text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {t('checkout.pay')} <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  {t('checkout.secure_payment')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
