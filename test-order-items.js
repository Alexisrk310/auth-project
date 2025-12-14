// Test script to verify order_items insertion
// Run this in browser console on /dashboard/orders page

async function testOrderItemsInsertion() {
    const { createClient } = await import('@supabase/supabase-js');

    // Get your Supabase credentials from .env.local
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testing order_items insertion...');

    // First, get an existing order_id and product_id
    const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .limit(1);

    const { data: products } = await supabase
        .from('products')
        .select('id, price')
        .limit(1);

    if (!orders || !products || orders.length === 0 || products.length === 0) {
        console.error('Need at least one order and one product');
        return;
    }

    // Try to insert a test order item
    const testData = {
        order_id: orders[0].id,
        product_id: products[0].id,
        quantity: 1,
        price_at_time: products[0].price
    };

    console.log('Attempting to insert:', testData);

    const { data, error } = await supabase
        .from('order_items')
        .insert(testData)
        .select();

    if (error) {
        console.error('❌ Insert failed:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ Insert successful:', data);
    }
}

// Run the test
testOrderItemsInsertion();
