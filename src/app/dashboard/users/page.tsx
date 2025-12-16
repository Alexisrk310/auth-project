'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { updateUserPassword } from '@/actions/users'
import { Search, Mail, Shield, Trash2, Loader2, AlertCircle, FileSpreadsheet, ArrowUpDown, Key } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/components/LanguageProvider'
import { TableSkeleton, StatsCardSkeleton } from '@/components/dashboard/skeletons'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { toast } from 'sonner' // Import toast

import { Modal } from '@/components/ui/Modal'

interface User {
  id: string
  email: string
  created_at: string
  role: 'user' | 'owner'
  full_name?: string
  totalSpent: number
  orderCount: number
  lastActive: string | null
}

type SortField = 'created_at' | 'totalSpent' | 'orderCount' | 'lastActive'
type SortOrder = 'asc' | 'desc'

export default function DashboardUsers() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('totalSpent')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  
  // Modal States
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    type: 'delete' | 'role' | 'password' | null
    userId: string | null
    userData: any | null
  }>({
    isOpen: false,
    type: null,
    userId: null,
    userData: null
  })

  const [newPassword, setNewPassword] = useState('')

  // Loading states for actions
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsersAndAnalytics()
  }, [])

  const fetchUsersAndAnalytics = async () => {
    try {
      setLoading(true)
      
      // 1. Fetch Profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name, created_at')
      
      if (profilesError) throw profilesError

      // 2. Fetch Orders for analytics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total, created_at, status')
        .neq('status', 'cancelled') // Exclude cancelled orders from spend

      if (ordersError) throw ordersError

      // 3. Aggregate Data
      const usersWithStats = profiles?.map((profile: any) => {
        const userOrders = orders?.filter(o => o.user_id === profile.id) || []
        
        const totalSpent = userOrders.reduce((acc, order) => {
          // Only count "real" money from paid/fulfilled orders
          if (['paid', 'shipped', 'delivered'].includes(order.status || '')) {
            return acc + (order.total || 0)
          }
          return acc
        }, 0)
        const orderCount = userOrders.length
        
        // Find last active date (latest order date)
        const lastActive = userOrders.length > 0 
          ? userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null

        return {
          ...profile,
          totalSpent,
          orderCount,
          lastActive: lastActive || profile.created_at // Fallback to signup date
        }
      }) || []

      setUsers(usersWithStats)

    } catch (e) {
      console.error('Error fetching data:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    // Handle null values
    if (aValue === null) return 1
    if (bValue === null) return -1
    
    // Compare
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const filteredUsers = sortedUsers.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Top Users')

    // Styling
    worksheet.columns = [
      { header: t('dash.excel_email'), key: 'email', width: 30 },
      { header: t('dash.excel_name'), key: 'full_name', width: 25 },
      { header: t('dash.excel_role'), key: 'role', width: 10 },
      { header: t('dash.excel_spent'), key: 'totalSpent', width: 15 },
      { header: t('dash.excel_orders'), key: 'orderCount', width: 10 },
      { header: t('dash.excel_last_active'), key: 'lastActive', width: 20 },
      { header: t('dash.excel_joined'), key: 'created_at', width: 20 },
    ]

    // Style Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' }
    }

    filteredUsers.forEach(user => {
      worksheet.addRow({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        totalSpent: user.totalSpent,
        orderCount: user.orderCount,
        lastActive: user.lastActive ? new Date(user.lastActive).toLocaleDateString() : '-',
        created_at: new Date(user.created_at).toLocaleDateString()
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `ThunderXis_Users_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // --- Actions ---

  const openRoleModal = (user: User) => {
    setModalConfig({
        isOpen: true,
        type: 'role',
        userId: user.id,
        userData: user
    })
  }

  const openDeleteModal = (user: User) => {
    setModalConfig({
        isOpen: true,
        type: 'delete',
        userId: user.id,
        userData: user
    })
  }

  const openPasswordModal = (user: User) => {
    setNewPassword('')
    setModalConfig({
        isOpen: true,
        type: 'password',
        userId: user.id,
        userData: user
    })
  }

  const closeModal = () => {
    setModalConfig({ isOpen: false, type: null, userId: null, userData: null })
    setNewPassword('')
  }

  const handleConfirmAction = async () => {
    if (!modalConfig.userId || !modalConfig.type) return

    setActionLoading(true)
    try {
        if (modalConfig.type === 'role') {
            const currentRole = modalConfig.userData.role
            const newRole = currentRole === 'owner' ? 'user' : 'owner'
            
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', modalConfig.userId)
            
            if (error) throw error
        } 
        else if (modalConfig.type === 'delete') {
            const { error } = await supabase.rpc('delete_user_by_id', {
                user_id: modalConfig.userId
            })
            
            if (error) throw error
        }
        else if (modalConfig.type === 'password') {
            if (newPassword.length < 6) {
                toast.error(t('dash.password_min_length'))
                setActionLoading(false)
                return
            }

            const result = await updateUserPassword(modalConfig.userId!, newPassword)
            if (!result.success) throw new Error(result.error)
            
            toast.success(t('dash.password_updated'))
        }

        await fetchUsersAndAnalytics()
        closeModal()
    } catch (e: any) {
        console.error('Error:', e)
        const errorMsg = modalConfig.type === 'delete' ? t('dash.error_delete_user') : 
                        modalConfig.type === 'password' ? t('dash.error_password_change') : t('dash.error_role_change')
        toast.error(`${errorMsg}: ${e.message || ''}`)
    } finally {
        setActionLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dash.user_management')}</h1>
          <p className="text-muted-foreground">{t('dash.user_desc')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('dash.search_users')} 
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl hover:bg-green-700 transition-colors shadow-sm"
            title={t('dash.export_excel')}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="hidden md:inline">{t('dash.excel_export')}</span>
          </button>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-500">{t('dash.warning_zone')}</p>
          <p className="text-muted-foreground">{t('dash.role_warning')}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-4">
             <TableSkeleton rows={8} columns={6} />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            {searchTerm ? t('dash.no_users_search') : t('dash.no_users')}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">{t('dash.user')}</th>
                    <th className="px-6 py-4">
                        <button onClick={() => handleSort('totalSpent')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {t('dash.revenue')}
                        <ArrowUpDown className="w-3 h-3" />
                        </button>
                    </th>
                    <th className="px-6 py-4">
                        <button onClick={() => handleSort('orderCount')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {t('dash.orders')}
                        <ArrowUpDown className="w-3 h-3" />
                        </button>
                    </th>
                    <th className="px-6 py-4">
                        <button onClick={() => handleSort('lastActive')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        {t('dash.last_active_short')}
                        <ArrowUpDown className="w-3 h-3" />
                        </button>
                    </th>
                    <th className="px-6 py-4">{t('dash.role')}</th>
                    <th className="px-6 py-4 text-right">{t('dash.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                            {(user.full_name || user.email)?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">
                              {user.full_name || user.email?.split('@')[0]}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        ${user.totalSpent?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">
                          {user.orderCount}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openRoleModal(user)}
                          className={`group relative px-3 py-1.5 rounded-lg text-xs font-bold border transition-all min-w-[80px] hover:scale-105 ${
                            user.role === 'owner' 
                              ? 'bg-purple-500/10 text-purple-500 border-purple-500/30 hover:bg-purple-500/20' 
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20'
                          }`}
                        >
                          <Shield className="w-3 h-3 inline mr-1" />
                          {user.role.toUpperCase()}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button 
                            onClick={() => openPasswordModal(user)}
                            className="p-2 hover:bg-yellow-500/10 rounded-lg transition-all group"
                            title={t('dash.change_password')}
                        >
                            <Key className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(user)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-all group"
                          title={t('dash.delete_user')}
                        >
                          <Trash2 className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-background border border-border p-4 rounded-xl flex flex-col gap-4 shadow-sm">
                        {/* Header: Avatar, Name, Email */}
                        <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-md text-lg">
                                {(user.full_name || user.email)?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-foreground truncate">
                                    {user.full_name || user.email?.split('@')[0]}
                                </h4>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                             <div className="bg-muted/30 p-2 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">{t('dash.revenue')}</p>
                                <p className="font-mono font-semibold">${user.totalSpent?.toLocaleString()}</p>
                             </div>
                             <div className="bg-muted/30 p-2 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-1">{t('dash.orders')}</p>
                                <p className="font-semibold">{user.orderCount}</p>
                             </div>
                             <div className="bg-muted/30 p-2 rounded-lg col-span-2 flex justify-between items-center">
                                <span className="text-xs text-muted-foreground">{t('dash.last_active_short')}</span>
                                <span className="text-xs">{user.lastActive ? new Date(user.lastActive).toLocaleDateString() : '-'}</span>
                             </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between pt-2">
                             <button
                                onClick={() => openRoleModal(user)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                                    user.role === 'owner' 
                                    ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' 
                                    : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                                }`}
                            >
                                <Shield className="w-3 h-3" />
                                {user.role.toUpperCase()}
                            </button>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => openPasswordModal(user)}
                                    className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg hover:bg-yellow-500/20 transition-colors"
                                >
                                    <Key className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => openDeleteModal(user)}
                                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
             <StatsCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card/50 border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('dash.total_users')}</p>
            <p className="text-2xl font-black text-foreground">{users.length}</p>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('dash.owners')}</p>
            <p className="text-2xl font-black text-purple-500">{users.filter(u => u.role === 'owner').length}</p>
          </div>
          <div className="bg-card/50 border border-border/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{t('dash.ltv_total')}</p>
            <p className="text-2xl font-black text-green-500">
              ${users.reduce((acc, u) => acc + u.totalSpent, 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmAction}
        isLoading={actionLoading}
        title={
            modalConfig.type === 'delete' 
                ? t('dash.delete_user') 
                : modalConfig.type === 'password'
                ? t('dash.change_password')
                : t('dash.role')
        }
        description={
            modalConfig.type === 'delete'
                ? t('dash.delete_confirm_user').replace('{email}', modalConfig.userData?.email || '')
                : modalConfig.type === 'password'
                ? t('dash.password_change_confirm').replace('{email}', modalConfig.userData?.email || '')
                : t('dash.role_change_confirm').replace('{role}', modalConfig.userData?.role === 'owner' ? 'USER' : 'OWNER')
        }
        confirmText={
            modalConfig.type === 'password' ? t('dash.save_password') : t('dash.actions')
        }
        variant={modalConfig.type === 'delete' ? 'danger' : 'warning'}
      >
        {modalConfig.type === 'password' && (
            <div className="bg-background rounded-lg mx-auto w-3/4 border border-border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border-none py-2 px-3 text-center font-mono text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
                    placeholder={t('dash.new_password_placeholder')}
                    autoFocus
                />
            </div>
        )}
      </Modal>
    </div>
  )
}
