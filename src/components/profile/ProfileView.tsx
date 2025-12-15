'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { 
    User, MapPin, Plus, Trash2, CheckCircle2, Star, 
    Loader2, Lock, Shield, Menu, 
    ChevronRight, Sparkles, AlertCircle, Key, Mail 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SHIPPING_RATES } from '@/config/shipping'
import { useToast } from '@/components/ui/Toast'

interface Address {
  id: string
  recipient_name: string
  address_line1: string
  neighborhood?: string
  city: string
  phone: string
  is_default: boolean
}

type Tab = 'general' | 'addresses' | 'security'

export function ProfileView({ isDashboard = false, initialTab = 'general', showSidebar = true }: { isDashboard?: boolean; initialTab?: Tab; showSidebar?: boolean }) {
  const { user, loading: authLoading } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Data State
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [gender, setGender] = useState<string>('')
  
  // Loading States
  const [savingProfile, setSavingProfile] = useState(false)
  const [submittingAddress, setSubmittingAddress] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Forms
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    address_line1: '',
    neighborhood: '',
    city: '',
    phone: '',
    is_default: false
  })

  // --- Data Fetching ---
  const fetchAddresses = async () => {
    if (!user) return
    try {
        const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error('Error fetching addresses:', error)
            if (error.code === '42P01') {
                addToast('Error: Addresses table missing.', 'error')
            }
        }
        if (data) setAddresses(data)
    } catch (e) {
        console.error(e)
    } finally {
        setLoadingAddresses(false)
    }
  }

  const fetchProfile = async () => {
    if (!user) return
    const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single()
    if (data?.gender) setGender(data.gender)
  }

  useEffect(() => {
    if (!authLoading && !user) {
        router.push('/login')
        return
    }
    if (user) {
        fetchAddresses()
        fetchProfile()
    }
  }, [user, authLoading, router])

  // --- Validation Helpers ---

  const validateAddressForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!newAddress.recipient_name.trim()) {
        newErrors.recipient_name = t('address.recipient_required') || 'Recipient name required'
    } else if (newAddress.recipient_name.length < 3) {
        newErrors.recipient_name = t('error.name_length')
    }

    if (!newAddress.address_line1.trim()) {
        newErrors.address_line1 = t('address.street_required') || 'Address required'
    }

    if (!newAddress.neighborhood.trim()) {
        newErrors.neighborhood = t('address.neighborhood_required') || 'Neighborhood required'
    }

    if (!newAddress.city) {
        newErrors.city = t('address.city_required') || 'City required'
    }

    if (!newAddress.phone.trim()) {
        newErrors.phone = t('address.phone_required') || 'Phone required'
    } else if (!/^\d{7,15}$/.test(newAddress.phone.replace(/\D/g, ''))) {
        newErrors.phone = t('error.phone_invalid')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePasswordForm = () => {
      const newErrors: Record<string, string> = {}
      
      if (!currentPassword) {
          newErrors.currentPassword = t('profile.current_password_required') || 'Current password required'
      }

      if (newPassword.length < 8) {
          newErrors.newPassword = t('error.password_length')
      }
      
      if (newPassword !== confirmPassword) {
          newErrors.confirmPassword = t('error.password_match')
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
  }


  // --- Handlers ---

  const handleUpdateProfile = async () => {
      if (!user) return
      setSavingProfile(true)
      try {
         const { error } = await supabase.from('profiles').update({ gender }).eq('id', user.id)
         if (error) throw error
         addToast(t('profile.updated'), 'success')
      } catch (error: any) {
         addToast(error.message, 'error')
      } finally {
         setSavingProfile(false)
      }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!user?.email) return
      
      if (!validatePasswordForm()) return

      setChangingPassword(true)
      try {
          // Verify current password first
          const { error: signInError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: currentPassword
          })

          if (signInError) {
              setErrors(prev => ({ ...prev, currentPassword: t('profile.error_password_incorrect') || 'Incorrect password' }))
              setChangingPassword(false)
              return
          }

          // If successful, update password
          const { error } = await supabase.auth.updateUser({ password: newPassword })
          if (error) throw error
          
          addToast(t('profile.password_success'), 'success')
          setNewPassword('')
          setConfirmPassword('')
          setCurrentPassword('')
          setErrors({})
      } catch (error: any) {
          addToast(error.message, 'error')
      } finally {
          setChangingPassword(false)
      }
  }

  const handleAddAddress = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!user) return

      if (!validateAddressForm()) {
          // Identify first error and focus? (Optional, skipping for brevity)
          return
      }

      const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()
      if (!profile) {
          addToast(t('profile.error_profile_not_found'), 'error')
          return
      }

      setSubmittingAddress(true)
      try {
          const { error } = await supabase.from('addresses').insert({
              user_id: user.id,
              recipient_name: newAddress.recipient_name,
              address_line1: newAddress.address_line1,
              neighborhood: newAddress.neighborhood,
              city: newAddress.city,
              phone: newAddress.phone,
              is_default: newAddress.is_default
          })
          
          if (error) {
             console.error('Supabase Error:', error)
             addToast(`Error saving: ${error.message}`, 'error')
          } else {
              setNewAddress({ recipient_name: '', address_line1: '', neighborhood: '', city: '', phone: '', is_default: false })
              setIsAddingAddress(false)
              fetchAddresses()
              addToast(t('address.saved'), 'success')
              setErrors({})
          }
      } catch (e: any) {
          console.error(e)
          addToast(`Unexpected error: ${e.message}`, 'error')
      } finally {
          setSubmittingAddress(false)
      }
  }

  const handleDeleteAddress = async (id: string) => {
      if (!confirm(t('profile.delete_confirm_address'))) return
      await supabase.from('addresses').delete().eq('id', id)
      fetchAddresses()
  }

  const handleSetDefault = async (id: string) => {
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
      await supabase.from('addresses').update({ is_default: true }).eq('id', id)
      fetchAddresses() 
  }

  const clearError = (field: string) => {
      if (errors[field]) {
          setErrors(prev => {
              const newErrors = { ...prev }
              delete newErrors[field]
              return newErrors
          })
      }
  }

  // --- Components ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: Tab, icon: any, label: string }) => (
      <button 
        onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false) }}
        className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden group ${
            activeTab === id 
            ? 'bg-purple-100 text-purple-900' 
            : 'bg-transparent hover:bg-purple-50 text-purple-600 hover:text-purple-900'
        }`}
      >
          <div className={`relative z-10 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${activeTab === id ? 'text-purple-700' : 'text-purple-400 group-hover:text-purple-600 transition-colors'}`} />
              {label}
          </div>
          {activeTab === id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute inset-0 bg-purple-100"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
          )}
      </button>
  )

  const ErrorMsg = ({ error }: { error?: string }) => {
      if (!error) return null
      return (
          <motion.div 
            initial={{ opacity: 0, y: -5 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="flex items-center gap-1.5 mt-1.5 text-red-500"
          >
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{error}</span>
          </motion.div>
      )
  }

  if (authLoading || !user) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
    </div>
  )

  return (
    <div className={`${isDashboard ? 'bg-transparent' : 'bg-white'} text-purple-950 relative overflow-hidden ${isDashboard ? 'w-full h-auto min-h-full rounded-3xl' : 'min-h-screen'}`}>
      {/* Background Ambience - Only show if NOT in dashboard for clean professional look */}
      {!isDashboard && (
          <div className="fixed inset-0 pointer-events-none">
              <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-[100px]" />
              <div className="absolute bottom-[10%] left-[10%] w-[500px] h-[500px] bg-fuchsia-100/50 rounded-full blur-[100px]" />
          </div>
      )}

      <div className={`relative z-10 max-w-6xl mx-auto px-4 md:px-8 ${isDashboard ? 'pt-4 pb-8' : 'pt-28 pb-20'}`}>
        
        {/* Header */}
        {!isDashboard && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12"></div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sidebar */}
            {showSidebar && (
              <div className="hidden md:block md:col-span-3 lg:col-span-3">
                  <div className="sticky top-28 space-y-3">
                      <SidebarItem id="general" icon={User} label={t('profile.personal')} />
                      <SidebarItem id="addresses" icon={MapPin} label={t('profile.addresses')} />
                      <SidebarItem id="security" icon={Shield} label={t('profile.security')} />
                  </div>
              </div>
            )}

            {/* Mobile Menu */}
            {showSidebar && (
              <div className="md:hidden col-span-1">
                  <button 
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="w-full flex items-center justify-between bg-white p-4 rounded-xl border border-border text-sm font-bold text-foreground shadow-sm"
                  >
                      <span className="flex items-center gap-2">
                          {activeTab === 'general' ? <User className="w-4 h-4 text-primary" /> : activeTab === 'addresses' ? <MapPin className="w-4 h-4 text-primary" /> : <Shield className="w-4 h-4 text-primary" />}
                          {activeTab === 'general' ? t('profile.personal') : activeTab === 'addresses' ? t('profile.addresses') : t('profile.security')}
                      </span>
                      <Menu className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                      {isMobileMenuOpen && (
                          <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="bg-white border border-border rounded-xl mt-2 overflow-hidden shadow-xl"
                          >
                              <div className="p-2 space-y-1">
                                  <SidebarItem id="general" icon={User} label={t('profile.personal')} />
                                  <SidebarItem id="addresses" icon={MapPin} label={t('profile.addresses')} />
                                  <SidebarItem id="security" icon={Shield} label={t('profile.security')} />
                              </div>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
            )}

            {/* Content Area */}
            <div className={`${showSidebar ? 'md:col-span-9 lg:col-span-9' : 'col-span-1 md:col-span-12'}`}>
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, type: "spring" }}
                    className={`${isDashboard ? (activeTab === 'security' ? 'bg-transparent border-none shadow-none' : 'bg-card border border-border shadow-sm') : 'bg-white/50 backdrop-blur-xl'} rounded-3xl p-6 md:p-10 relative overflow-hidden min-h-[500px]`}
                >
                    {/* Decorative glow inside card - hidden for dashboard */}
                    {!isDashboard && <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50/50 rounded-full blur-[80px] pointer-events-none" />}

                    {activeTab === 'general' && (
                        <div className="max-w-xl relative">
                            {/* ... kept largely same but could optimize colors if needed ... */}
                            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2 text-foreground">
                                {t('profile.personal')}
                            </h2>
                            <p className="text-muted-foreground mb-8 text-sm font-medium">{t('profile.personal_desc')}</p>
                            
                            <div className="space-y-6">
                                <div className="group">
                                     <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block tracking-wider pl-1">{t('auth.email')}</label>
                                    <div className={`${isDashboard ? 'bg-background border border-border' : 'bg-purple-50'} px-5 py-4 rounded-2xl flex items-center text-sm font-bold text-foreground transition-all`}>
                                        {user.email}
                                        <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {t('profile.verify_badge')}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="group">
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block tracking-wider pl-1">{t('auth.name')}</label>
                                    <div className={`${isDashboard ? 'bg-background border border-border' : 'bg-purple-50'} px-5 py-4 rounded-2xl text-sm font-bold text-foreground transition-all`}>
                                        {user.user_metadata?.full_name || 'N/A'}
                                    </div>
                                </div>

                                <div>
                                     <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block tracking-wider pl-1">{t('profile.gender')}</label>
                                     <div className="relative">
                                         <select 
                                            value={gender} 
                                            onChange={(e) => setGender(e.target.value)}
                                            className={`w-full ${isDashboard ? 'bg-background border border-border hover:bg-muted/50' : 'bg-purple-50 hover:bg-purple-100'} rounded-2xl px-5 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none text-foreground cursor-pointer`}
                                         >
                                             <option value="" className="text-muted-foreground">{t('profile.select_gender_placeholder')}</option>
                                             <option value="male">{t('gender.male')}</option>
                                             <option value="female">{t('gender.female')}</option>
                                             <option value="other">{t('gender.other')}</option>
                                         </select>
                                         <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none rotate-90" />
                                     </div>
                                </div>

                                <div className="pt-6">
                                    <button 
                                        onClick={handleUpdateProfile}
                                        disabled={savingProfile}
                                        className="bg-primary text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all transform active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                                        {t('profile.save_gender')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'addresses' && (
                       // ... Minimal updates for addresses to match theme ...
                       <div className="h-full relative">
                            <div className="flex justify-between items-center mb-8">
                               <div>
                                   <h2 className="text-2xl font-bold mb-1 text-foreground">
                                       {t('profile.addresses')}
                                   </h2>
                                   <p className="text-muted-foreground text-sm font-medium">{t('profile.addresses_desc')}</p>
                               </div>
                               {!isAddingAddress && (
                                   <button 
                                       onClick={() => setIsAddingAddress(true)}
                                       className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-all hover:-translate-y-0.5"
                                   >
                                       <Plus className="w-4 h-4" />
                                       {t('address.add')}
                                   </button>
                               )}
                           </div>
                           {/* ... passing through existing logic for addresses ... */}
                            <AnimatePresence mode="wait">
                                {isAddingAddress ? (
                                    <motion.form 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onSubmit={handleAddAddress}
                                        className={`${isDashboard ? 'bg-background border border-border' : 'bg-white'} rounded-3xl p-6 md:p-8 space-y-6 max-w-2xl relative`}
                                    >
                                        {/* ... form content ... */}
                                        <div className="flex justify-between items-center pb-2 border-b border-border/50">
                                            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-primary" />
                                                {t('address.add')}
                                            </h3>
                                            <button 
                                                type="button" 
                                                onClick={() => setIsAddingAddress(false)} 
                                                className="text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
                                            >
                                                {t('dash.cancel')}
                                            </button>
                                        </div>
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase text-muted-foreground pl-1">{t('address.recipient')}</label>
                                                <input 
                                                    value={newAddress.recipient_name}
                                                    onChange={e => {
                                                        setNewAddress({...newAddress, recipient_name: e.target.value})
                                                        clearError('recipient_name')
                                                    }}
                                                    className={`w-full bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium ${errors.recipient_name ? 'bg-red-50 text-red-900' : ''}`}
                                                    placeholder={t('checkout.placeholder_name')}
                                                />
                                                <ErrorMsg error={errors.recipient_name} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase text-muted-foreground pl-1">{t('address.phone')}</label>
                                                <input 
                                                    value={newAddress.phone}
                                                    onChange={e => {
                                                        setNewAddress({...newAddress, phone: e.target.value})
                                                        clearError('phone')
                                                    }}
                                                    className={`w-full bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium ${errors.phone ? 'bg-red-50 text-red-900' : ''}`}
                                                    placeholder={t('checkout.placeholder_phone')}
                                                />
                                                <ErrorMsg error={errors.phone} />
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold uppercase text-muted-foreground pl-1">{t('address.street')}</label>
                                                <input 
                                                    value={newAddress.address_line1}
                                                    onChange={e => {
                                                        setNewAddress({...newAddress, address_line1: e.target.value})
                                                        clearError('address_line1')
                                                    }}
                                                    className={`w-full bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3 text-sm focus:outline-none mb-2 transition-all text-foreground placeholder:text-muted-foreground font-medium ${errors.address_line1 ? 'bg-red-50 text-red-900' : ''}`}
                                                    placeholder={t('checkout.placeholder_address')}
                                                />
                                                <ErrorMsg error={errors.address_line1} />
                                                <input 
                                                    value={newAddress.neighborhood}
                                                    onChange={e => setNewAddress({...newAddress, neighborhood: e.target.value})}
                                                    className="w-full bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3 text-sm focus:outline-none transition-all text-foreground placeholder:text-muted-foreground font-medium mt-3"
                                                    placeholder={t('address.neighborhood_placeholder')}
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-1.5">
                                                <label className="text-xs font-bold uppercase text-muted-foreground pl-1">{t('address.city')}</label>
                                                <div className="relative">
                                                    <select 
                                                        value={newAddress.city}
                                                        onChange={e => {
                                                            setNewAddress({...newAddress, city: e.target.value})
                                                            clearError('city')
                                                        }}
                                                        className={`w-full bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3 text-sm focus:outline-none text-foreground font-medium appearance-none cursor-pointer hover:bg-muted/50 transition-colors ${errors.city ? 'bg-red-50 text-red-900' : ''}`}
                                                    >
                                                        <option value="">{t('checkout.select_city')}</option>
                                                        {Object.keys(SHIPPING_RATES).map(city => (
                                                            <option key={city} value={city}>{city}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none rotate-90" />
                                                </div>
                                                <ErrorMsg error={errors.city} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 py-3 px-4 bg-muted/30 border border-border/50 rounded-xl">
                                            <div className="relative flex items-center">
                                                <input 
                                                    type="checkbox" 
                                                    id="is_default"
                                                    checked={newAddress.is_default}
                                                    onChange={e => setNewAddress({...newAddress, is_default: e.target.checked})}
                                                    className="peer w-5 h-5 appearance-none rounded bg-white border border-border checked:bg-primary checked:border-primary transition-all cursor-pointer"
                                                />
                                                <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                            </div>
                                            <label htmlFor="is_default" className="text-sm cursor-pointer select-none font-bold text-foreground">{t('address.set_default')}</label>
                                        </div>

                                        <button 
                                            disabled={submittingAddress}
                                            type="submit" 
                                            className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
                                        >
                                            {submittingAddress && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {t('address.save')}
                                        </button>
                                    </motion.form>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        {loadingAddresses ? (
                                            [...Array(2)].map((_, i) => <div key={i} className="h-40 bg-muted/50 animate-pulse rounded-2xl" />)
                                        ) : addresses.length === 0 ? (
                                            <div className="col-span-2 text-center py-24 text-muted-foreground bg-muted/20 border border-dashed border-border rounded-3xl flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                                                    <MapPin className="w-10 h-10 text-muted-foreground/50" />
                                                </div>
                                                <p className="font-bold text-xl text-foreground mb-2">{t('address.no_addresses')}</p>
                                                <p className="text-sm opacity-70 font-medium">{t('profile.no_addresses_desc')}</p>
                                                <button 
                                                    onClick={() => setIsAddingAddress(true)}
                                                    className="mt-8 text-white bg-primary px-6 py-2 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all"
                                                >
                                                    {t('profile.add_address_btn')}
                                                </button>
                                            </div>
                                        ) : (
                                            addresses.map(addr => (
                                                <motion.div 
                                                    key={addr.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.95 }} 
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={`relative rounded-2xl p-6 transition-all group duration-300 overflow-hidden border ${
                                                        addr.is_default 
                                                        ? 'bg-primary/5 border-primary/20 shadow-none' 
                                                        : 'bg-card border-border hover:border-primary/30 hover:shadow-md'
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-start relative z-10">
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="flex items-center gap-3 mb-1.5">
                                                                    <h3 className="font-bold text-lg text-foreground tracking-tight">{addr.recipient_name}</h3>
                                                                    {addr.is_default && (
                                                                        <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                                            <CheckCircle2 className="w-3 h-3" /> {t('address.default')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                                                                    {addr.address_line1} <br />
                                                                    {addr.neighborhood && <span className="text-foreground">{addr.neighborhood}, </span>}
                                                                    {addr.city}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-foreground bg-muted w-fit px-3 py-1.5 rounded-lg font-mono">
                                                                 <span className="uppercase font-bold tracking-wider opacity-70">Tel:</span> {addr.phone}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                                                             {!addr.is_default && (
                                                                 <button 
                                                                    onClick={() => handleSetDefault(addr.id)}
                                                                    className="p-2.5 text-muted-foreground hover:text-white hover:bg-primary rounded-xl transition-all"
                                                                    title={t('address.set_default')}
                                                                 >
                                                                     <Star className="w-4 h-4" />
                                                                 </button>
                                                             )}
                                                             <button 
                                                                onClick={() => handleDeleteAddress(addr.id)}
                                                                className="p-2.5 text-muted-foreground hover:text-white hover:bg-red-500 rounded-xl transition-all"
                                                                title={t('address.delete')}
                                                             >
                                                                 <Trash2 className="w-4 h-4" />
                                                             </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </AnimatePresence>
                       </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="w-full relative h-full flex flex-col justify-center">
                            <div className="text-center mb-8">
                                {!isDashboard && (
                                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Shield className="w-10 h-10 text-primary" />
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
                                    <Shield className={`w-6 h-6 text-primary ${!isDashboard && 'hidden'}`} />
                                    {t('profile.security')}
                                </h2>
                                <p className="text-muted-foreground font-medium max-w-md mx-auto leading-relaxed text-sm">{t('profile.security_desc')}</p>
                            </div>
                            
                            <form onSubmit={handleChangePassword} className={`${isDashboard ? 'bg-transparent' : 'bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl'} max-w-5xl mx-auto w-full`}>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                     {/* Column 1: Current Password */}
                                     <div className="space-y-2">
                                         <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">{t('profile.current_password')}</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Key className="h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <input 
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => {
                                                    setCurrentPassword(e.target.value)
                                                    clearError('currentPassword')
                                                }}
                                                className={`w-full pl-12 bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all font-medium ${errors.currentPassword ? 'bg-red-50 text-red-900 ring-1 ring-red-100' : ''}`}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <ErrorMsg error={errors.currentPassword} />
                                    </div>
                                     
                                     {/* Column 2: New Password */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">{t('profile.new_password')}</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <input 
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => {
                                                    setNewPassword(e.target.value)
                                                    clearError('newPassword')
                                                }}
                                                className={`w-full pl-12 bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all font-medium ${errors.newPassword ? 'bg-red-50 text-red-900 ring-1 ring-red-100' : ''}`}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <ErrorMsg error={errors.newPassword} />
                                    </div>

                                    {/* Column 3: Confirm Password */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-1">{t('profile.confirm_password')}</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <CheckCircle2 className="h-5 w-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                            </div>
                                            <input 
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value)
                                                    clearError('confirmPassword')
                                                }}
                                                className={`w-full pl-12 bg-muted/30 border border-transparent focus:border-primary/20 focus:bg-background rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none transition-all font-medium ${errors.confirmPassword ? 'bg-red-50 text-red-900 ring-1 ring-red-100' : ''}`}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <ErrorMsg error={errors.confirmPassword} />
                                    </div>
                                </div>

                                {/* Tips & Strength Indicator Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                     <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 flex items-center gap-4">
                                        <div className="p-2 bg-primary/10 rounded-full">
                                             <Sparkles className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-xs text-foreground mb-1">{t('profile.tips_title')}</h4>
                                            <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                <span>• {t('profile.tip_length')}</span>
                                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                                                <span>• {t('profile.tip_mix')}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50 flex flex-col justify-center">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: newPassword.length >= 8 ? '100%' : newPassword.length > 5 ? '66%' : newPassword.length > 0 ? '33%' : '0%' }}
                                                    className={`h-full transition-all duration-500 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : newPassword.length > 5 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                />
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase ${newPassword.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {newPassword.length >= 8 ? t('profile.strength_strong') : t('profile.strength_weak')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-border/50">
                                    <button 
                                        type="submit"
                                        disabled={changingPassword || !newPassword || !currentPassword}
                                        className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary/90 transition-all transform hover:scale-[1.005] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                                    >
                                        {changingPassword ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {t('profile.updating')}
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="w-5 h-5" />
                                                {t('profile.update_password')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </motion.div>

                {/* Footer Decor */}
                <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity">
                    <p className="text-xs text-muted-foreground font-mono flex items-center justify-center gap-2">
                        <Shield className="w-3 h-3" />
                         {t('profile.secured_by')}
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
