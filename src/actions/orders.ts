'use server'

import { createClient } from '@/lib/supabase/server'
import { sendOrderStatusEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

import { logActivity } from '@/lib/dashboard-logger'

export async function updateOrderStatus(orderId: string, status: string, carrier?: string, trackingNumber?: string) {
  const supabase = await createClient()

  try {
    // 1. Check authentication/authorization (Basic check if user exists, refined RBAC should be in middleware/policies)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' }
    }

    // 2. Update Order
    const updateData: any = { status: status }
    if (carrier) updateData.carrier = carrier
    if (trackingNumber) updateData.tracking_number = trackingNumber

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating order:', updateError)
      return { success: false, error: updateError.message + (updateError.details ? ` (${updateError.details})` : '') }
    }

    // Fetch items separately to avoid ambiguous relationship errors
    // Also fetch product details for email
    const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, products(name, image_url)')
        .eq('order_id', orderId)
    
    // Map items to structure expected by email template
    const formattedItems = (orderItems || []).map((item: any) => ({
        name: item.products?.name || 'Producto',
        size: item.size || 'N/A', // Assuming size is on order_items, otherwise fallback
        quantity: item.quantity,
        price: item.price_at_time || item.price || 0,
        image: item.products?.image_url // In case we add images to email later
    }))

    updatedOrder.order_items = formattedItems

    // 3. Send Email
    if (status === 'shipped' && updatedOrder.customer_email) {
        // Fetch customer name
        let customerName = 'Cliente'
        if (updatedOrder.user_id) {
             const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', updatedOrder.user_id).single()
             if (profile?.full_name) customerName = profile.full_name
        }

        // Use stored language or default to 'es'
        const orderLanguage = updatedOrder.language as 'es' | 'en' | 'fr' | 'pt' || 'es'

        await sendOrderStatusEmail(
            updatedOrder.customer_email, 
            updatedOrder.id, 
            status, 
            orderLanguage, 
            carrier, 
            trackingNumber,
            customerName,
            formattedItems
        )
    }

    // 4. Log Activity
    await logActivity(
        'ORDER_UPDATE', 
        `Updated order #${orderId.slice(0, 8)} status to ${status}`, 
        { order_id: orderId, new_status: status }
    )

    // 5. Revalidate
    revalidatePath('/dashboard/orders')
    
    return { success: true }
    
  } catch (error) {
    console.error('Exception in updateOrderStatus:', error)
    return { success: false, error: 'Internal Server Error' }
  }
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ... (existing updateOrderStatus remains, but need to be careful with imports) 
// Actually I need to keep the file structure.
// Wait, `createClient` on line 3 is from `@/lib/supabase/server`.
// I will use `createAdminClient` helper pattern if I can, or just local.

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!supabaseKey) throw new Error('MISSING_SERVICE_ROLE_KEY')
  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export async function fetchGuestOrders(orderIds: string[]) {
  if (!orderIds || orderIds.length === 0) return { orders: [], error: 'No IDs provided' }

  try {
      const supabase = getAdminClient()

      // Step 1: Fetch orders without embedding order_items
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
            id, created_at, status, total, shipping_address, city, customer_email, user_id
        `)
        .in('id', orderIds)
        .order('created_at', { ascending: false })

      if (ordersError) {
          console.error('Error fetching guest orders:', ordersError)
          return { orders: [], error: ordersError.message }
      }
      
      if (!orders || orders.length === 0) {
          console.log(`Debug: No orders found for IDs: ${orderIds.join(', ')}`)
          return { orders: [], error: null }
      }

      // Step 2: Fetch order_items for these orders separately
      const fetchedOrderIds = orders.map(o => o.id)
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
            id, order_id, product_id, quantity, price_at_time,
            products ( name, image_url )
        `)
        .in('order_id', fetchedOrderIds)

      if (itemsError) {
            console.error('Error fetching order items:', itemsError)
            return { orders: [], error: itemsError.message }
      }

      // Step 3: Attach items to orders in memory
      const ordersWithItems = orders.map(order => {
          return {
              ...order,
              order_items: orderItems ? orderItems.filter(item => item.order_id === order.id) : []
          }
      })
      
      return { orders: ordersWithItems, error: null }

  } catch (error: any) {
      console.error('Exception fetching guest orders:', error)
      return { orders: [], error: error.message || 'Unknown Exception' }
  }
}

export async function linkGuestOrders(userId: string, orderIds: string[]) {
    try {
        const supabase = getAdminClient()
        
        // Only update orders that don't have a user_id yet (safety)
        // Or if we trust local storage "ownership", we can just overwrite.
        // Safer to only update if user_id is null or match.
        // But for simplicty and "claiming", we update where ID matches.
        
        const { data, error } = await supabase
            .from('orders')
            .update({ user_id: userId })
            .in('id', orderIds)
            .is('user_id', null) // Only claim orphan orders!
            .select()

        if (error) {
            console.error('Error linking orders:', error)
            return { success: false, error: error.message }
        }

        return { success: true, count: data?.length || 0 }
    } catch (error: any) {
        console.error('Exception linking orders:', error)
        return { success: false, error: error.message }
    }
}
