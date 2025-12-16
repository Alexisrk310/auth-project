import { NextResponse } from 'next/server';
import { createPreference } from '@/lib/mercadopago';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: Request) {
  try {
    const { items, orderId } = await req.json();
    
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

    for (const item of items) {
        if (item.id === 'shipping') {
            // Shipping is dynamic based on location, we trust the client logic for shipping cost 
            // BUT ideally this should also be recalculated if we passed the city. 
            // For now, allow passing it but we could validate if it matches our shipping config.
            validatedItems.push(item); 
            continue; 
        }
        
        // Also assuming 'quantity' is passed in the item object.
        if (!item.id || !item.quantity) continue;

        const { data: product, error } = await supabase
            .from('products')
            .select('stock, name, price')
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

        // Push RECONSTRUCTED item with DB price and name
        validatedItems.push({
            id: item.id,
            name: product.name, // Use DB name
            quantity: Number(item.quantity),
            price: Number(product.price), // Use DB price
        });
    }
    // --------------------------------------------------

    const preference = await createPreference(validatedItems, orderId);
    
    return NextResponse.json({ url: preference.init_point });
  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    return NextResponse.json({ error: error.message || 'Payment initialization failed', details: error }, { status: 500 });
  }
}
