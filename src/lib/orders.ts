import { createClient } from '@supabase/supabase-js';

// Admin client for backend operations
export async function confirmOrder(orderId: string, paymentData?: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseKey) {
    console.error('confirmOrder: Missing SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }

  // Admin client for backend operations
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  console.log(`confirmOrder: Fetching order ${orderId}`);
  // 1. Fetch Order
  const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*, products(name, images, image_url))')
      .eq('id', orderId)
      .single();

  if (orderError || !order) {
      throw new Error('Order not found');
  }

  // 2. Check if already processed
  if (order.status === 'paid' || order.status === 'delivered') {
      return { message: 'Order already processed', alreadyPaid: true };
  }

  // 3. Deduct Stock
  if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
          const { error: stockError } = await supabaseAdmin.rpc('decrement_stock', { 
              p_id: item.product_id, 
              qty: item.quantity 
          });

          if (stockError) {
              // Fallback to manual update
              const { data: product } = await supabaseAdmin.from('products').select('stock').eq('id', item.product_id).single();
              if (product) {
                  const newStock = Math.max(0, product.stock - item.quantity);
                  await supabaseAdmin.from('products').update({ stock: newStock }).eq('id', item.product_id);
              }
          }
      }
  }

  // 4. Update Order Status and Payment Info
  const updatePayload: any = { status: 'paid' };
  if (paymentData) {
      updatePayload.payment_info = paymentData;
  }

  const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

  if (updateError) {
       throw updateError;
  }

  return { success: true, order };
}
