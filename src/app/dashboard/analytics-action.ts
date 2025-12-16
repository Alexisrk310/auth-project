'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Helper to get admin client for analytics across all users
const getAdminSupabase = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// Helper to verify owner (same as in coupon actions)
const checkOwner = async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const adminClient = getAdminSupabase()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    
    return profile?.role === 'owner'
}

export async function getAnalyticsData(dateRange: '7d' | '30d' | '90d' = '30d') {
  // Verify owner first
  const isOwner = await checkOwner()
  if (!isOwner) {
      console.warn('Unauthorized access attempt to analytics')
      return { data: [], stats: { totalSales: 0, totalOrders: 0, avgTicket: 0, newCustomers: 0 }, recentOrders: [] }
  }

  const supabase = getAdminSupabase()
  const now = new Date()
  let startDate = new Date()
  
  if (dateRange === '7d') startDate.setDate(now.getDate() - 7)
  else if (dateRange === '30d') startDate.setDate(now.getDate() - 30)
  else if (dateRange === '90d') startDate.setDate(now.getDate() - 90)

  // 1. Fetch orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total, created_at, status')
    .gte('created_at', startDate.toISOString())
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching analytics:', error)
    return { data: [], stats: { totalSales: 0, totalOrders: 0, avgTicket: 0, newCustomers: 0 }, recentOrders: [] }
  }

  // 2. Fetch New Customers (Profiles created in range)
  const { count: newCustomers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString())

  // 3. Fetch Recent Orders (Manual Fetch)
  const { data: rawRecentOrders } = await supabase
    .from('orders')
    .select('id, created_at, total, status, user_id, customer_email')
    .order('created_at', { ascending: false })
    .limit(5)

  let formattedRecentOrders: any[] = []
  if (rawRecentOrders && rawRecentOrders.length > 0) {
      const userIds = rawRecentOrders.map(o => o.user_id).filter(Boolean)
      let profilesMap: Record<string, string> = {}
      
      if (userIds.length > 0) {
          const { data: profiles } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds)
          profiles?.forEach(p => { profilesMap[p.id] = p.full_name || 'User' })
      }

      formattedRecentOrders = rawRecentOrders.map(o => ({
          id: o.id,
          created_at: o.created_at,
          total: o.total,
          status: o.status,
          customer_name: o.user_id ? (profilesMap[o.user_id] || 'User') : (o.customer_email || 'Guest')
      }))
  }

  // 4. Group Data
  const groupedData: Record<string, { date: string, sales: number, orders: number }> = {}
  for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    groupedData[dateStr] = { date: dateStr, sales: 0, orders: 0 }
  }

  let totalSales = 0
  orders?.forEach(order => {
    const dateStr = new Date(order.created_at).toISOString().split('T')[0]
    if (groupedData[dateStr]) {
      groupedData[dateStr].sales += order.total || 0
      groupedData[dateStr].orders += 1
      totalSales += order.total || 0
    }
  })

  const chartData = Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date))
  const totalOrders = orders?.length || 0
  const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0

  return { 
    data: chartData, 
    stats: {
        totalSales,
        totalOrders,
        avgTicket,
        newCustomers: newCustomers || 0
    },
    recentOrders: formattedRecentOrders
  }
}

export async function getInventoryAlerts() {
    const isOwner = await checkOwner()
    if (!isOwner) return { lowStock: [], outOfStock: [] }

    const supabase = getAdminSupabase()
    
    // Low stock items (assuming stock < 5 is low)
    const { data: lowStock } = await supabase
        .from('products')
        .select('id, name, stock, stock_by_size')
        .lt('stock', 5)
        .limit(5)

    // Out of stock
    const { data: outOfStock } = await supabase
        .from('products')
        .select('id, name')
        .eq('stock', 0)
        .limit(5)

    return { lowStock, outOfStock }
}
