'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Truck, Users, Settings, LogOut, Home, MessageSquare, Shield, Store, X, Tag } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { useAuth } from '@/hooks/useAuth'
import { LogoutModal } from '@/components/LogoutModal'

interface DashboardSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { signOut } = useAuth()
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  const links = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/dashboard/products', label: t('dash.products'), icon: ShoppingBag },
    { href: '/dashboard/orders', label: t('dash.orders'), icon: Truck },
    { href: '/dashboard/reviews', label: t('dash.reviews'), icon: MessageSquare },
    { href: '/dashboard/users', label: t('dash.users'), icon: Users },
    { href: '/dashboard/coupons', label: t('dash.coupons') || 'Coupons', icon: Tag },
    { href: '/dashboard/security', label: t('profile.security'), icon: Shield },
  ]

  const handleLogout = async () => {
    setIsLogoutModalOpen(false)
    await signOut()
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed left-0 top-0 h-full w-64 bg-card/95 backdrop-blur-md border-r border-border/50 pt-6 pb-8 px-4 flex flex-col z-50 transition-transform duration-300 ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:translate-x-0 lg:shadow-none`}>
         {/* Header */}
         <div className="mb-8 px-3 flex items-center justify-between">
            <div>
                <h2 className="text-lg font-bold text-foreground">
                ThunderXis <span className="text-primary">{t('dash.admin')}</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-1">{t('dash.panel')}</p>
            </div>
            {/* Mobile Close Button */}
            <button onClick={onClose} className="lg:hidden p-1 hover:bg-muted rounded-md transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
            </button>
         </div>



         {/* Navigation */}
         <nav className="flex-1 space-y-1">
            {links.map((link) => {
               const Icon = link.icon
               const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
               
               return (
                  <Link 
                     key={link.href} 
                     href={link.href}
                     className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm relative
                        ${isActive 
                          ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                  >
                     <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                     <span>{link.label}</span>
                     
                     {/* Subtle active indicator */}
                     {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                     )}
                  </Link>
               )
            })}
         </nav>

         {/* Footer */}
         <div className="mt-auto pt-6 border-t border-border/50 space-y-1">
             <Link href="/" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-muted/50">
                <Store className="w-5 h-5" />
                <span className="font-medium">{t('nav.go_to_store')}</span>
             </Link>
            <button 
               onClick={() => setIsLogoutModalOpen(true)}
               className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all w-full font-medium text-sm"
            >
               <LogOut className="w-5 h-5" />
               <span>{t('auth.logout')}</span>
            </button>
         </div>
      </aside>
      
      {/* Logout Confirmation Modal */}
      <LogoutModal 
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
    </>
  )
}
