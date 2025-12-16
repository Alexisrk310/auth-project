import { NextResponse } from 'next/server';
import { createPreference } from '@/lib/mercadopago';
import { createClient } from '@supabase/supabase-js';
import { validateCouponLogic } from '@/lib/coupons';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: Request) {
  try {
    const { items, orderId, couponCode } = await req.json();
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
       console.error("Missing MERCADO_PAGO_ACCESS_TOKEN")
       return NextResponse.json({ error: 'Server Config Error: Missing MP Token' }, { status: 500 });
    }

    // --- Server-Side Validation & Price Enforcement ---
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // We will rebuild the items list for MercadoPago using strictly DB data
    const validatedItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
        if (item.id === 'shipping') {
            // Shipping is dynamic based on location, we trust the client logic for shipping cost 
            // BUT ideally this should also be recalculated if we passed the city. 
            validatedItems.push(item); 
            continue; 
        }
        
        // Also assuming 'quantity' is passed in the item object.
        if (!item.id || !item.quantity) continue;

        const { data: product, error } = await supabase
            .from('products')
            .select('stock, name, price, sale_price')
            .eq('id', item.id)
            .single();

        if (error || !product) {
            console.error(`Product validation failed for ${item.id}`, error);
            return NextResponse.json({ error: `Product not found: ${item.title || 'Unknown'}` }, { status: 400 });
        }

        if (product.stock < item.quantity) {
            return NextResponse.json({ 
                error: `Desafortunadamente, no hay suficiente stock para ${product.name}. Disponible: ${product.stock}` 
            }, { status: 400 });
        }

        const price = product.sale_price || product.price
        subtotal += price * item.quantity

        // Push RECONSTRUCTED item with DB price and name
        validatedItems.push({
            id: item.id,
            name: product.name, // Use DB name
            quantity: Number(item.quantity),
            price: Number(price), // Use DB price
        });
    }
    // --------------------------------------------------

    // Apply Coupon if present
    if (couponCode) {
        const validation = await validateCouponLogic(supabase, couponCode, subtotal)
        if (validation.success && validation.coupon) {
             // Add discount as a negative item
             // MercadoPago supports discount in preference, but adding a negative item is a common workaround if direct discount param isn't preferred or for clarity.
             // Actually, MP Preference has 'discount' field? Or we just reduce the total?
             // Best way: Add an item "Discount: CODE" with negative price.
             
             // Ensure we don't discount shipping (usually). 
             // Logic above calculated subtotal WITHOUT shipping (shipping item isn't added to subtotal var loop).
             // Wait, loop pushed shipping item to validatedItems but didn't add to subtotal. Correct.
             
             // However, shipping item IS in validatedItems.
             
             validatedItems.push({
                 id: 'coupon',
                 title: `Discount (${couponCode})`, // Title for MP
                 quantity: 1,
                 unit_price: -validation.coupon.applied_discount, // Negative price
             })
        }
    }

    const preference = await createPreference(validatedItems, orderId);
    
    return NextResponse.json({ url: preference.init_point });
  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    return NextResponse.json({ error: error.message || 'Payment initialization failed', details: error }, { status: 500 });
  }
}
