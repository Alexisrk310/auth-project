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
export const SHIPPING_RATES: { [key: string]: number } = {
  'Bogotá': 8000,
  'Medellín': 12000,
  'Cali': 12000,
  'Barranquilla': 15000,
  'Cartagena': 15000,
  'Bucaramanga': 12000,
  'Pereira': 12000,
  'Manizales': 12000,
  'Cúcuta': 15000,
  'Ibagué': 10000,
  'Villavicencio': 10000,
  'Santa Marta': 15000,
}

export const DEFAULT_SHIPPING_COST = 20000

export default function CartPage() {
  const { items, removeItem, updateQuantity, total } = useCartStore()
  const { t } = useLanguage()
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [loading, setLoading] = useState(false)
  
  // Shipping Form State
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
  const shippingCost = useMemo(() => {
    if (!formData.city) return 0
    return SHIPPING_RATES[formData.city] || DEFAULT_SHIPPING_COST
  }, [formData.city])

  // Empty State
  if (items.length === 0) {
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

  const handleCheckout = async () => {
    // Validate Form
    if (!formData.name || !formData.email || !formData.address || !formData.city || !formData.phone) {
        addToast(`${t('checkout.missing_fields')}`, 'error')
        return
    }

    setLoading(true)

    try {
      let userId = user?.id

      if (!userId) {
         addToast(t('cart.login_required'), 'error')
         setLoading(false)
         return
      }

      const orderId = uuidv4()
      const finalTotal = total() + shippingCost
      const fullAddress = formData.neighborhood 
        ? `${formData.address}, ${formData.neighborhood}` 
        : formData.address

      const { error: matchError } = await supabase
        .from('orders')
        .insert({
            id: orderId,
            user_id: userId,
            status: 'pending',
            total: finalTotal,
            customer_name: formData.name,
            customer_email: formData.email, // Save email
            shipping_address: fullAddress, // Combine address + neighborhood
            city: formData.city,
            phone: formData.phone,
            shipping_cost: shippingCost
        })

      if (matchError) {
          console.error('Supabase Order Insert Error:', matchError)
          throw new Error(`DB Error: ${matchError.message} (${matchError.code})`)
      }

      // 1.5 Insert Order Items
      const orderItemsData = items.map(item => ({
          order_id: orderId,
          product_id: item.id,
          quantity: item.quantity,
          price_at_time: item.price
      }))

      console.log('Inserting order items:', JSON.stringify(orderItemsData, null, 2))

      const { data: insertedItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select()

      if (itemsError) {
          console.error('Error inserting items:', itemsError)
          console.error('Error details:', JSON.stringify(itemsError, null, 2))
          throw new Error(`Failed to save order items: ${itemsError.message}`)
      }

      console.log('Order items inserted successfully:', insertedItems)

      // 2. Create MP Preference linked to Order
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            items: [...items, { id: 'shipping', name: t('cart.shipping_item_name'), price: shippingCost, quantity: 1 }],
            orderId 
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
      console.error('Error Details:', error)
      const errorMsg = error?.message || error?.error || t('cart.checkout_error_default')
      addToast(`${t('cart.error_prefix')}${errorMsg}`, 'error')
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
                className="flex gap-6 p-4 rounded-2xl bg-card border border-border/50 shadow-sm"
              >
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <Image
                    src={item.image_url} 
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
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
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                    placeholder={t('checkout.placeholder_name')}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('auth.email')}</label>
                                <input 
                                    type="email" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                    placeholder={t('auth.email_placeholder')}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('checkout.address')}</label>
                                <input 
                                    type="text" 
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none mb-2"
                                    placeholder={t('checkout.placeholder_address')}
                                />
                                <input 
                                    type="text" 
                                    value={formData.neighborhood}
                                    onChange={(e) => setFormData({...formData, neighborhood: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                    placeholder={t('address.neighborhood_placeholder')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t('checkout.city')}</label>
                                    <select 
                                        value={formData.city}
                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
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
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
                        <div className="border-t border-border/50 pt-4 flex justify-between font-bold text-xl">
                        <span>{t('checkout.total')}</span>
                        <span>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(total() + shippingCost)}</span>
                        </div>
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
