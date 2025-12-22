'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Bell, User, ChevronDown, Globe, LogOut, Menu, ShoppingBag, Star, Info, MessageSquare } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { useAuth } from '@/hooks/useAuth'
import { LogoutModal } from '@/components/LogoutModal'
import { motion, AnimatePresence } from 'framer-motion'
import { useClickOutside } from '@/hooks/useClickOutside'

import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'

interface DashboardNavbarProps {
  onMenuClick: () => void
}

export function DashboardNavbar({ onMenuClick }: DashboardNavbarProps) {
  const { language, setLanguage, t } = useLanguage()
  const { user, role, signOut } = useAuth()
  const pathname = usePathname()
  const { addToast } = useToast()
  

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activities, setActivities] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const notificationsRef = React.useRef<HTMLDivElement>(null)
  const langMenuRef = React.useRef<HTMLDivElement>(null)

  useClickOutside(notificationsRef, () => setIsNotificationsOpen(false))
  useClickOutside(langMenuRef, () => setIsLangMenuOpen(false))

  useEffect(() => {
    // Fetch initial activities
    const fetchActivities = async () => {
        console.log('Fetching dashboard activities...')
        const { data, error } = await supabase
            .from('dashboard_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
        
        if (error) {
            console.error('Error fetching activities:', error)
        }
        
        if (data) {
            console.log('Activities fetched:', data.length)
            setActivities(data)
            // Calculare unread if we had a 'read' status logic, but for now just show count of new ones in session
            const unread = data.filter(a => !a.read).length
            setUnreadCount(unread)
        }
    }

    if (role === 'owner') {
        fetchActivities()

        // Real-time subscription
        const channel = supabase
            .channel('dashboard-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'dashboard_activities' },
                (payload) => {
                    const newActivity = payload.new
                    setActivities(prev => [newActivity, ...prev].slice(0, 10))
                    setUnreadCount(prev => prev + 1)
                    
                    // Toast formatted based on action
                    // Toast formatted based on action
                    const actionText = newActivity.action_type === 'ORDER_UPDATE' ? t('dash.activity.order_update') : 
                                     newActivity.action_type === 'USER_UPDATE' ? t('dash.activity.user_update') : t('dash.activity.new')
                    
                    addToast(`${actionText} ${t('dash.activity.by')} ${newActivity.actor_name}`, 'info')
                }
            )
            .subscribe()

        return () => {
             supabase.removeChannel(channel)
        }
    }
  }, [user, role, addToast])
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
      <nav className="fixed top-0 left-0 right-0 h-20 bg-background/95 backdrop-blur-md border-b border-border z-40 ml-0 lg:ml-64 transition-all duration-300">
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
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            
            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => {
                    setIsNotificationsOpen(!isNotificationsOpen)
                    // Optional: Reset count on open or on individual read? User preference.
                    // Let's keep count of UNREAD.
                }}
                className="relative p-2.5 hover:bg-muted rounded-xl transition-colors group"
                title={t('dash.notifications')}
              >
                <Bell className={`w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors ${unreadCount > 0 ? 'animate-bounce-short text-primary' : ''}`} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-background"></span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute -right-16 sm:right-0 mt-2 w-[85vw] sm:w-96 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[60vh] sm:max-h-[500px]"
                  >
                    <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/40 backdrop-blur-sm sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-primary fill-primary/20" />
                          <p className="text-sm font-bold text-foreground">{t('dash.activity.notifications')}</p>
                          {unreadCount > 0 && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
                      </div>
                      {unreadCount > 0 && (
                          <button 
                            onClick={async () => {
                                // Mark all visible as read logic (naive for now)
                                setUnreadCount(0)
                                setActivities(prev => prev.map(a => ({ ...a, read: true })))
                            }} 
                            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            {t('dash.activity.mark_all_read')}
                          </button>
                      )}
                    </div>

                    <div className="overflow-y-auto custom-scrollbar flex-1">
                        {activities.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-muted-foreground">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                <Bell className="w-6 h-6 opacity-20" />
                            </div>
                            <p className="text-sm font-medium">{t('dash.activity.empty')}</p>
                            <p className="text-xs opacity-60 mt-1">{t('dash.activity.empty_desc')}</p>
                        </div>
                        ) : (
                        <div className="divide-y divide-border/30">
                            {activities.map(activity => {
                                const isUnread = !activity.read
                                const type = activity.action_type
                                
                                let Icon = Info
                                let iconColor = 'text-blue-500'
                                let bgIcon = 'bg-blue-500/10'

                                if (type === 'NEW_ORDER') {
                                    Icon = ShoppingBag
                                    iconColor = 'text-emerald-600'
                                    bgIcon = 'bg-emerald-600/10'
                                } else if (type === 'NEW_REVIEW') {
                                    Icon = Star
                                    iconColor = 'text-amber-500'
                                    bgIcon = 'bg-amber-500/10'
                                } else if (type === 'ORDER_UPDATE') {
                                    Icon = MessageSquare
                                    iconColor = 'text-blue-500'
                                    bgIcon = 'bg-blue-500/10'
                                } else if (type === 'USER_UPDATE') {
                                    Icon = User
                                    iconColor = 'text-violet-500'
                                    bgIcon = 'bg-violet-500/10'
                                }

                                return (
                                <Link 
                                    href={activity.metadata?.order_id ? `/dashboard/orders` : '#'} 
                                    key={activity.id} 
                                    onClick={async () => {
                                        if (isUnread) {
                                            setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, read: true } : a))
                                            setUnreadCount(prev => Math.max(0, prev - 1))
                                            // Async mark read (fire and forget)
                                            // await markActivityAsRead(activity.id) 
                                        }
                                        setIsNotificationsOpen(false)
                                    }}
                                    className={`flex gap-4 p-4 hover:bg-muted/40 transition-all duration-200 group ${isUnread ? 'bg-muted/20' : ''}`}
                                >
                                    {/* Icon Box */}
                                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full ${bgIcon} flex items-center justify-center`}>
                                        <Icon className={`w-4 h-4 ${iconColor}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5 gap-2">
                                            <p className={`text-sm font-medium leading-none ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {activity.action_type === 'NEW_ORDER' ? t('dash.activity.new_order_title') || 'New Order' :
                                                 activity.action_type === 'NEW_REVIEW' ? t('dash.activity.new_review_title') || 'New Review' :
                                                 activity.description
                                                }
                                            </p>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                                            {activity.description} 
                                        </p>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                                                <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-[7px] text-gray-700 font-bold">
                                                    {activity.actor_name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-medium text-muted-foreground">
                                                    {activity.actor_name}
                                                </span>
                                            </div>
                                            {activity.metadata?.total && (
                                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                                                    ${activity.metadata.total?.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Unread Dot (Subtle) */}
                                    {isUnread && (
                                        <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 self-start" />
                                    )}
                                </Link>
                                )
                            })}
                        </div>
                        )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button 
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-xl transition-colors"
                title={t('dash.change_language')}
              >
                <Globe className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground hidden sm:block">
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
                            ? 'bg-primary/10 text-primary font-bold' 
                            : 'text-foreground hover:bg-muted font-medium'
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

            {/* User Info (Static) */}
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl border border-transparent">
               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-background">
                 {user?.email?.charAt(0).toUpperCase()}
               </div>
               <div className="hidden md:block text-left mr-1">
                 <p className="text-sm font-bold text-foreground leading-tight">{user?.email?.split('@')[0]}</p>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{t('dash.owner')}</p>
               </div>
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
