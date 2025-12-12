'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLanguage } from '@/components/LanguageProvider'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { DollarSign, ShoppingBag, Users as UsersIcon, TrendingUp, Download, Loader2, Calendar } from 'lucide-react'
import { StatsCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/dashboard/skeletons'

interface Order {
  id: string
  created_at: string
  total: number
  status: string
  customer_name: string
}

interface DashboardStats {
  totalSales: number
  totalOrders: number
  newCustomers: number
  salesData: { name: string; sales: number; orders: number }[]
  recentOrders: Order[]
}

export default function DashboardOverview() {
  const { t } = useLanguage()
  const [timeRange, setTimeRange] = useState('Weekly')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    newCustomers: 0,
    salesData: [],
    recentOrders: []
  })

  useEffect(() => {
    if (timeRange !== 'Custom' || (customStartDate && customEndDate)) {
      fetchDashboardData()
    }
  }, [timeRange, customStartDate, customEndDate])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      const now = new Date()
      let startDate: Date
      let endDate: Date = now // Default to now

      if (timeRange === 'Custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate)
        // Set end date to end of the selected day
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        endDate = end
      } else {
        const daysToFetch = timeRange === 'Daily' ? 1 : timeRange === 'Weekly' ? 7 : 30
        startDate = new Date(now.getTime() - daysToFetch * 24 * 60 * 60 * 1000)
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        // Filter for valid "paid" statuses
        .in('status', ['approved', 'paid', 'shipped', 'delivered', 'completed'])
        .order('created_at', { ascending: false })

      if (ordersError) throw ordersError

      const totalSales = orders?.reduce((sum, order) => sum + parseFloat(order.total?.toString() || '0'), 0) || 0
      const totalOrders = orders?.length || 0
      const uniqueCustomers = new Set(orders?.map(o => o.user_id)).size

      const salesByDay = new Map<string, { sales: number; orders: number }>()
      
      orders?.forEach(order => {
        const date = new Date(order.created_at)
        const dayKey = timeRange === 'Daily' 
          ? date.toLocaleTimeString('en', { hour: '2-digit' })
          : date.toLocaleDateString('en', { weekday: 'short' })
        
        const existing = salesByDay.get(dayKey) || { sales: 0, orders: 0 }
        salesByDay.set(dayKey, {
          sales: existing.sales + parseFloat(order.total?.toString() || '0'),
          orders: existing.orders + 1
        })
      })

      const salesData = Array.from(salesByDay.entries()).map(([name, data]) => ({
        name,
        ...data
      }))

      const recentOrders = orders?.slice(0, 5) || []

      setStats({
        totalSales,
        totalOrders,
        newCustomers: uniqueCustomers,
        salesData: salesData.length > 0 ? salesData : [{ name: t('dash.no_data'), sales: 0, orders: 0 }],
        recentOrders
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
  }

  const handleExport = async () => {
    if (!stats.recentOrders || stats.recentOrders.length === 0) {
      alert(t('dash.no_data_export'))
      return
    }

    try {
      const ExcelJS = (await import('exceljs')).default
      const { saveAs } = (await import('file-saver'))

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Sales Report')

      // Define Columns
      worksheet.columns = [
        { header: t('dash.order_id'), key: 'id', width: 20 },
        { header: t('dash.date'), key: 'date', width: 15 },
        { header: t('dash.customer'), key: 'customer', width: 25 },
        { header: t('dash.status'), key: 'status', width: 15 },
        { header: t('dash.amount'), key: 'amount', width: 15 },
      ]

      // Style Header Row
      const headerRow = worksheet.getRow(1)
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' } // Primary Purple
      }
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
      headerRow.height = 30

      // Add Data
      stats.recentOrders.forEach(order => {
        const row = worksheet.addRow({
          id: order.id.slice(0, 8),
          date: new Date(order.created_at).toLocaleDateString(),
          customer: order.customer_name || 'N/A',
          status: t(`dash.${order.status}`), // Translate status
          amount: order.total
        })

        // Style Data Row
        row.alignment = { vertical: 'middle', horizontal: 'left' }
        row.getCell('amount').numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00'
        row.getCell('status').alignment = { horizontal: 'center' }
        
        // Add borders to all cells in the row
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })
      })

      // Generate Buffer and Save
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Sales_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.xlsx`)

    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert('Error generating Excel file')
    }
  }

  const STATS_CONFIG = [
    { label: t('dash.total_sales'), value: formatCurrency(stats.totalSales), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', iconBg: 'bg-emerald-100' },
    { label: t('dash.total_orders'), value: stats.totalOrders.toString(), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
    { label: t('dash.customers'), value: stats.newCustomers.toString(), icon: UsersIcon, color: 'text-purple-600', bg: 'bg-purple-50', iconBg: 'bg-purple-100' },
    { label: t('dash.avg_order'), value: stats.totalOrders > 0 ? formatCurrency(stats.totalSales / stats.totalOrders) : '$0', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', iconBg: 'bg-orange-100' },
  ]



  return (
    <div className="space-y-6">
      
      {/* Clean Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">{t('dash.analytics')}</h1>
          <p className="text-sm text-muted-foreground">{t('dash.monitor_performance')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          {timeRange === 'Custom' && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input 
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <span className="text-muted-foreground">-</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input 
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-background border border-border rounded-lg px-4 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="Daily">{t('dash.daily')}</option>
              <option value="Weekly">{t('dash.weekly')}</option>
              <option value="Monthly">{t('dash.monthly')}</option>
              <option value="Custom">{t('dash.custom')}</option>
            </select>
            <button 
              onClick={handleExport}
              disabled={loading || stats.totalOrders === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t('dash.export')}
            </button>
          </div>
        </div>
      </div>

      {/* Clean Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))
        ) : (
          STATS_CONFIG.map((stat) => (
            <div 
              key={stat.label} 
              className={`${stat.bg} rounded-xl p-5 border border-border/50 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`${stat.iconBg} p-2.5 rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))
        )}
      </div>

      {/* Charts Section - Clean Design */}
      <div className="grid lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Revenue Chart */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-6">{t('dash.revenue_trend')}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.salesData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9ca3af" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px', 
                        padding: '8px 12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: '#8b5cf6', fontWeight: '600', fontSize: '14px' }}
                      labelStyle={{ color: '#6b7280', fontWeight: '600', fontSize: '12px' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#8b5cf6" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Orders Chart */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-bold text-foreground mb-6">{t('dash.orders_volume')}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9ca3af" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(139, 92, 246, 0.05)'}}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '8px', 
                        padding: '8px 12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      itemStyle={{ color: '#3b82f6', fontWeight: '600', fontSize: '14px' }}
                      labelStyle={{ color: '#6b7280', fontWeight: '600', fontSize: '12px' }}
                    />
                    <Bar dataKey="orders" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Orders - Clean Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-lg font-bold text-foreground">{t('dash.recent_orders')}</h3>
          <button className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">{t('dash.view_all')}</button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={5} columns={5} header={false} />
            </div>
          ) : stats.recentOrders.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              {t('dash.no_orders')}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-3">{t('dash.order_id')}</th>
                  <th className="px-6 py-3">{t('dash.customer')}</th>
                  <th className="px-6 py-3">{t('dash.date')}</th>
                  <th className="px-6 py-3">{t('dash.amount')}</th>
                  <th className="px-6 py-3">{t('dash.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-medium text-primary">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {order.customer_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('es-CO', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
                        ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
