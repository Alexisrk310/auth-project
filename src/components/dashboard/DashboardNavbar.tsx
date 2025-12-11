'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, User, ChevronDown, Globe, Settings, LogOut, Menu } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { useAuth } from '@/hooks/useAuth'
import { LogoutModal } from '@/components/LogoutModal'
import { motion, AnimatePresence } from 'framer-motion'

import { supabase } from '@/lib/supabase/client'

interface DashboardNavbarProps {
  onMenuClick: () => void
}

export function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  const { language, setLanguage, t } = useLanguage()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    // Fetch recent orders for notifications
    const fetchRecentOrders = async () => {
        const { data } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
        
        if (data) setRecentOrders(data)
    }

    if (user?.role === 'owner') {
        fetchRecentOrders()
    }
  }, [user])

  const handleLogout = async () => {
    setIsLogoutModalOpen(false)
    await signOut()
  }

  // Breadcrumbs
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    return paths.map((path, index) => ({
      name: path.charAt(0).toUpperCase() + path.slice(1),
      href: '/' + paths.slice(0, index + 1).join('/')
    }))
  }

  const breadcrumbs = getBreadcrumbs()

  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' }
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-md border-b border-border z-40 ml-0 lg:ml-64 transition-all duration-300">
        <div className="h-full px-6 flex items-center justify-between gap-6">
          
          {/* Left: Menu Toggle, Breadcrumbs & Search */}
          <div className="flex items-center gap-4 flex-1">
            <button 
                onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  <Link 
                    href={crumb.href}
                    className={`font-medium transition-colors ${
                      index === breadcrumbs.length - 1 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {crumb.name}
                  </Link>
                  {index < breadcrumbs.length - 1 && (
                    <span className="text-muted-foreground">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('dash.search_placeholder')}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {recentOrders.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-lg py-1 z-50 max-h-[400px] overflow-y-auto"
                  >
                    <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-muted/30">
                      <p className="text-sm font-semibold">{t('dash.orders')}</p>
                      <Link href="/dashboard/orders" className="text-xs text-primary hover:underline">
                        {t('home.view_all')}
                      </Link>
                    </div>

                    {recentOrders.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        {t('dash.no_orders')}
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {recentOrders.map(order => (
                          <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-semibold text-sm truncate">{order.customer_email?.split('@')[0] || t('dash.customer')}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase
                                ${order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 
                                  order.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}
                              `}>
                                {t(`dash.${order.status}`)}
                              </span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-xs font-mono text-muted-foreground">#{order.id.slice(0, 8)}</p>
                              </div>
                              <p className="font-bold text-sm">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(order.total_amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language Selector */}
            <div className="relative">
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground hidden sm:block">
                  {languages.find(l => l.code === language)?.flag}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-2 z-50"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as any)
                          setIsLangMenuOpen(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          language === lang.code 
                            ? 'bg-primary/10 text-primary font-semibold' 
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-foreground">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{t('dash.owner')}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground">{user?.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('dash.administrator')}</p>
                    </div>
                    
                    <div className="py-2">
                      <Link 
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <User className="w-4 h-4" />
                        {t('dash.profile')}
                      </Link>
                      <Link 
                        href="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        {t('dash.settings')}
                      </Link>
                    </div>

                    <div className="border-t border-border pt-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          setIsLogoutModalOpen(true)
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('auth.logout')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout Modal */}
      <LogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}
