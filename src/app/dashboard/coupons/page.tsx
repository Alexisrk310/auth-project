'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { Tag, Plus, Trash2, Calendar, Percent, DollarSign, Loader2 } from 'lucide-react'
import { createCoupon, deleteCoupon, toggleCouponStatus } from './actions'

interface Coupon {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  expiration_date: string | null
  usage_limit: number | null
  min_purchase_amount: number
  is_active: boolean
  usage_count: number
}

export default function CouponsPage() {
  const { t } = useLanguage()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  
  // Basic fetch - could be server component but client is fine for admin
  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setCoupons(data as Coupon[])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirm_delete') || 'Are you sure?')) return
    await deleteCoupon(id)
    fetchCoupons()
  }

  const handleToggle = async (coupon: Coupon) => {
    await toggleCouponStatus(coupon.id, coupon.is_active)
    fetchCoupons()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Tag className="w-8 h-8 text-primary" />
            {t('dash.coupons') || 'Coupons'}
          </h1>
          <p className="text-muted-foreground text-sm">Manage discount codes</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('add_coupon') || 'Create Coupon'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center p-12 bg-card border border-border rounded-xl">
           <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
           <p className="text-muted-foreground">{t('no_coupons') || 'No coupons found'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className={`bg-card border ${coupon.is_active ? 'border-border' : 'border-red-500/20 bg-red-500/5'} rounded-xl p-5 shadow-sm relative overflow-hidden group`}>
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-black font-mono tracking-wider text-primary">{coupon.code}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {coupon.is_active ? t('dash.active') : t('dash.inactive')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                     <button 
                       onClick={() => handleToggle(coupon)}
                       className="p-2 hover:bg-muted rounded-full transition-colors opacity-0 group-hover:opacity-100"
                       title="Toggle Status"
                     >
                        <Loader2 className="w-4 h-4" /> 
                        {/* Placeholder icon for toggle, could be switch */}
                     </button>
                     <button 
                       onClick={() => handleDelete(coupon.id)}
                       className="p-2 hover:bg-red-100 text-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
               
               <div className="space-y-2 text-sm text-foreground/80">
                  <div className="flex items-center gap-2">
                    {coupon.discount_type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                    <span className="font-bold">
                      {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : ' COP'}
                    </span>
                    <span className="text-muted-foreground">{t('dash.discount_label')}</span>
                  </div>
                  
                  {coupon.expiration_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Exp: {new Date(coupon.expiration_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-border mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>Used: {coupon.usage_count} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : ''}</span>
                    <span>Min: ${coupon.min_purchase_amount}</span>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Basic Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
             <div className="p-6 border-b border-border">
               <h2 className="text-xl font-bold">{t('create_coupon') || 'Create New Coupon'}</h2>
             </div>
             <form action={async (formData) => {
                 setFormLoading(true)
                 const res = await createCoupon(formData)
                 setFormLoading(false)
                 if (res?.error) {
                    alert(res.error)
                 } else {
                    setIsModalOpen(false)
                    fetchCoupons()
                 }
             }} className="p-6 space-y-4">
                 
                 <div>
                   <label className="block text-sm font-medium mb-1">{t('dash.coupon_code')}</label>
                   <input name="code" required className="w-full bg-background border border-border rounded-lg px-3 py-2 font-mono uppercase" placeholder="SUMMER25" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dash.type')}</label>
                        <select name="discountType" className="w-full bg-background border border-border rounded-lg px-3 py-2">
                            <option value="percentage">{t('dash.type_percentage')}</option>
                            <option value="fixed">{t('dash.type_fixed')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dash.value')}</label>
                        <input name="discountValue" type="number" required className="w-full bg-background border border-border rounded-lg px-3 py-2" placeholder="10" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dash.min_purchase')}</label>
                        <input name="minPurchase" type="number" defaultValue="0" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('dash.usage_limit')}</label>
                        <input name="usageLimit" type="number" placeholder={t('dash.unlimited') || 'Unlimited'} className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                    </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium mb-1">{t('dash.expiration')}</label>
                   <input name="expirationDate" type="date" className="w-full bg-background border border-border rounded-lg px-3 py-2" />
                 </div>

                 <div className="flex gap-3 pt-3">
                   <button 
                     type="button" 
                     onClick={() => setIsModalOpen(false)}
                     className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                   >
                     {t('dash.cancel')}
                   </button>
                   <button 
                     type="submit" 
                     disabled={formLoading}
                     className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                   >
                     {formLoading ? t('dash.creating') : t('add_coupon')}
                   </button>
                 </div>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
