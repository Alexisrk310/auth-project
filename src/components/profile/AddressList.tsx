'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { MapPin, Trash2, Edit2, CheckCircle } from 'lucide-react'
import AddressForm from './AddressForm'

interface Address {
  id: string
  name: string
  recipient_name: string
  street: string
  city: string
  phone: string
  is_default: boolean
}

export default function AddressList() {
  const { t } = useLanguage()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | undefined>(undefined)

  const fetchAddresses = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error) {
      console.error('Error fetching addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAddresses()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    await supabase.from('addresses').delete().eq('id', id)
    fetchAddresses()
  }

  const handleSetDefault = async (id: string) => {
     const { data: { user } } = await supabase.auth.getUser()
     if (!user) return

     // Transaction-like logic: unset others, set this one
     await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id)
     await supabase.from('addresses').update({ is_default: true }).eq('id', id)
     fetchAddresses()
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> {t('profile.addresses')}
            </h2>
            <button 
                onClick={() => { setEditingAddress(undefined); setShowForm(true); }}
                className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
            >
                + {t('address.add')}
            </button>
       </div>

       {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="h-40 bg-muted/40 animate-pulse rounded-xl" />)}
         </div>
       ) : addresses.length === 0 ? (
         <p className="text-muted-foreground text-center py-8">{t('address.no_addresses')}</p>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
                <div key={addr.id} className={`p-5 rounded-xl border-2 transition-all relative group
                    ${addr.is_default ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                >
                    {addr.is_default && (
                        <div className="absolute top-3 right-3 text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {t('address.default')}
                        </div>
                    )}
                    
                    <h3 className="font-bold text-lg mb-1">{addr.name}</h3>
                    <p className="text-sm font-medium text-foreground">{addr.recipient_name}</p>
                    <p className="text-sm text-muted-foreground">{addr.street}</p>
                    <p className="text-sm text-muted-foreground">{addr.city}</p>
                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">📞 {addr.phone}</p>

                    <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
                        <button 
                            onClick={() => { setEditingAddress(addr); setShowForm(true); }}
                            className="flex-1 text-xs font-semibold py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors flex items-center justify-center gap-1"
                        >
                            <Edit2 className="w-3 h-3" /> {t('address.edit')}
                        </button>
                        {!addr.is_default && (
                            <button 
                                onClick={() => handleSetDefault(addr.id)}
                                className="flex-1 text-xs font-semibold py-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            >
                                {t('address.set_default')}
                            </button>
                        )}
                        <button 
                            onClick={() => handleDelete(addr.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
         </div>
       )}

       {showForm && (
         <AddressForm 
            onClose={() => setShowForm(false)} 
            onSuccess={() => { setShowForm(false); fetchAddresses(); }}
            initialData={editingAddress}
         />
       )}
    </div>
  )
}
