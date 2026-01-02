import { NextResponse } from 'next/server';
import { createPreference } from '@/lib/mercadopago';
import { createClient } from '@supabase/supabase-js';
import { validateCouponLogic } from '@/lib/coupons';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
    try {
        const { items, couponCode, metadata, total, shippingCost } = await req.json();

        // Metadata contains: { name, email, phone, city, address, neighborhood, user_id }

        // Validate Email basic format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (metadata?.email && !emailRegex.test(metadata.email)) {
            return NextResponse.json({ error: 'validation.email_invalid' }, { status: 400 });
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'cart.empty_error' }, { status: 400 });
        }

        if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
            console.error("Missing MERCADO_PAGO_ACCESS_TOKEN")
            return NextResponse.json({ error: 'error.config_missing' }, { status: 500 });
        }

        // Use Admin Client for Order Creation to bypass RLS if needed, or stick to Anon if policies allow.
        // Ideally Service Role ensures we can always write orders even if user is guest?
        // Guest RLS usually allows INSERT if policies are set right. 
        // Let's use Service Role to be SAFE against "Order Not Found" issues due to RLS.
        const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

        // --- Server-Side Validation & Price Enforcement ---
        const validatedItems: any[] = [];
        let calculatedSubtotal = 0;
        const orderItemsData: any[] = [];
        const orderId = uuidv4();

        for (const item of items) {
            if (item.id === 'shipping') {
                // Skip shipping in item validation loop, handle separately
                continue;
            }

            if (!item.id || !item.quantity) continue;

            const { data: product, error } = await supabase
                .from('products')
                .select('stock, name, price, sale_price, description, category')
                .eq('id', item.id)
                .single();

            if (error || !product) {
                console.error(`Product validation failed for ${item.id}`, error);
                return NextResponse.json({ error: 'product.not_found_dynamic', params: { item: item.title || 'Unknown' } }, { status: 400 });
            }

            if (product.stock < item.quantity) {
                return NextResponse.json({
                    error: 'cart.error_stock_dynamic',
                    params: { product: product.name, stock: product.stock }
                }, { status: 400 });
            }

            const price = product.sale_price || product.price
            calculatedSubtotal += price * item.quantity

            // Prepare Item for MP
            validatedItems.push({
                id: item.id,
                name: product.name,
                description: product.description?.substring(0, 250),
                category_id: product.category,
                quantity: Number(item.quantity),
                price: Number(price),
            });

            // Prepare Item for DB
            orderItemsData.push({
                order_id: orderId,
                product_id: item.id,
                quantity: item.quantity,
                price_at_time: price,
                size: item.size || 'M' // We need size passed from client item
            });
        }

        let discountAmount = 0;

        // Apply Coupon
        if (couponCode) {
            const validation = await validateCouponLogic(supabase, couponCode, calculatedSubtotal)
            if (validation.success && validation.coupon) {
                discountAmount = validation.coupon.applied_discount;

                // Add distinct discount item for MP
                validatedItems.push({
                    id: 'coupon',
                    name: `Discount (${couponCode})`,
                    quantity: 1,
                    price: -discountAmount,
                })
            }
        }

        // Use passed shipping cost (trusting client for now as it depends on city which we have)
        // Ideally verify city matches cost.
        const trustedShippingCost = Number(shippingCost) || 0;
        const finalTotal = calculatedSubtotal + trustedShippingCost - discountAmount;

        // --- CREATE ORDER IN DB ---
        const { name, email, phone, city, address, neighborhood, user_id } = metadata || {};
        const fullAddress = neighborhood ? `${address}, ${neighborhood}` : address;

        // 1. Insert Order
        const { error: insertError } = await supabase
            .from('orders')
            .insert({
                id: orderId,
                user_id: user_id || null,
                status: 'pending',
                total: finalTotal,
                customer_name: name,
                customer_email: email,
                shipping_address: fullAddress,
                city: city,
                phone: phone,
                shipping_cost: trustedShippingCost,
                coupon_code: couponCode || null,
                discount_amount: discountAmount,
                // language? We can pass it in metadata if needed
            });

        if (insertError) {
            console.error('DB Insert Order Error:', insertError);
            throw new Error('checkout.error.create_order');
        }

        // 2. Insert Items
        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData);

        if (itemsError) {
            console.error('DB Insert Items Error:', itemsError);
            // Should rollback order? For now throw.
            throw new Error('checkout.error.create_items');
        }

        console.log(`Order ${orderId} created successfully. Generating MP Preference...`);

        // 3. Create Preference
        // Add shipping as item for MP if needed, or let MP handle logic. 
        // We didn't add shipping to validatedItems loop. Let's add it now.
        if (trustedShippingCost > 0) {
            validatedItems.push({
                id: 'shipping',
                name: 'Costo de envío',
                quantity: 1,
                price: trustedShippingCost
            });
        }

        const preference = await createPreference(validatedItems, orderId);

        return NextResponse.json({ url: preference.init_point });
    } catch (error: any) {
        console.error('Mercado Pago Checkout Error:', error);
        return NextResponse.json({ error: error.message || 'Payment initialization failed', details: error }, { status: 500 });
    }
}
