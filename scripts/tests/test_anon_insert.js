const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read ../../.env.local manually
try {
    const envPath = path.resolve(__dirname, '../../.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    }
} catch (e) {
    console.error('Error reading ../../.env.local:', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonInsert() {
    console.log('Testing Anon Order Insert...');

    // Fetch a real product for valid FK
    const { data: products } = await supabase.from('products').select('id').limit(1);
    const validProductId = products && products.length > 0 ? products[0].id : null;

    if (!validProductId) {
        console.warn('⚠️ No products found to test item insert. Skipping item test.');
    }

    // Simple UUID v4 generator
    const orderId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    // Attempt simple insert
    const { data, error } = await supabase
        .from('orders')
        .insert({
            id: orderId,
            status: 'pending',
            total: 100,
            customer_email: 'test@anon.com',
            shipping_address: 'Test Address',
            city: 'Test City',
            language: 'es'
        })
        .select();

    if (error) {
        console.error('❌ Order Insert Failed:', error);
    } else {
        console.log('✅ Order Insert Successful:', data);

        if (validProductId) {
            // Now test Order Items
            const { error: itemError } = await supabase
                .from('order_items')
                .insert({
                    order_id: orderId,
                    product_id: validProductId,
                    quantity: 1,
                    price_at_time: 100,
                    size: 'M'
                });

            if (itemError) {
                console.error('❌ Order Item Insert Failed:', itemError);
            } else {
                console.log('✅ Order Item Insert Successful');
            }
        }
    }
}

testAnonInsert();
