'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/components/LanguageProvider'
import { useToast } from '@/components/ui/Toast'
import { User, Lock, MapPin, Loader2, LogOut } from 'lucide-react'
import AddressList from '@/components/profile/AddressList'

export default function ProfilePage() {
  const { t } = useLanguage()
  const { addToast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  // Tabs: 'personal', 'addresses', 'security'
  const [activeTab, setActiveTab] = useState('personal')

  // Password Form
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [updatingPass, setUpdatingPass] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) {
      addToast('Passwords do not match', 'error')
      return
    }
    setUpdatingPass(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new })
      if (error) throw error
      addToast(t('profile.password_success'), 'success')
      setPasswords({ new: '', confirm: '' })
    } catch (error) {
      console.error(error)
      addToast('Error updating password', 'error')
    } finally {
      setUpdatingPass(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className="min-h-screen pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>

  return (
    <div className="min-h-screen bg-muted/20 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-black mb-8 px-2">{t('profile.title')}</h1>

        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Menu */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                <button 
                  onClick={() => setActiveTab('personal')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'personal' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-card text-foreground hover:bg-muted'}`}
                >
                  <User className="w-5 h-5" /> {t('profile.personal')}
                </button>
                <button 
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'addresses' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-card text-foreground hover:bg-muted'}`}
                >
                  <MapPin className="w-5 h-5" /> {t('profile.addresses')}
                </button>
                <button 
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'security' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-card text-foreground hover:bg-muted'}`}
                >
                  <Lock className="w-5 h-5" /> {t('profile.security')}
                </button>

                 <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 mt-8 transition-colors"
                >
                  <LogOut className="w-5 h-5" /> {t('nav.logout')}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
                
                {activeTab === 'personal' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-3xl font-bold text-primary">
                                {user.email?.[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{user.user_metadata?.full_name || 'User'}</h2>
                                <p className="text-muted-foreground">{user.email}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm leading-relaxed">
                            Currently, personal details are managed via your Google/Email provider or during checkout. 
                            Address management serves as your primary contact info.
                        </div>
                    </div>
                )}

                {activeTab === 'addresses' && (
                    <AddressList />
                )}

                {activeTab === 'security' && (
                    <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                        <h2 className="text-xl font-bold mb-4">{t('profile.password_title')}</h2>
                        <div>
                            <label className="block text-sm font-semibold mb-1">{t('profile.new_password')}</label>
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">{t('profile.confirm_password')}</label>
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                className="w-full bg-background border border-border rounded-lg px-4 py-2"
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={updatingPass}
                            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {updatingPass ? '...' : t('profile.save')}
                        </button>
                    </form>
                )}

            </div>
        </div>
      </div>
    </div>
  )
}
