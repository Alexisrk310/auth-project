import { NextResponse } from 'next/server';
import { createPreference } from '@/lib/mercadopago';

export async function POST(req: Request) {
  try {
    const { items, orderId } = await req.json();
    
    // Validate items (should also check DB for real prices in a real app)
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
       console.error("Missing MERCADO_PAGO_ACCESS_TOKEN")
       return NextResponse.json({ error: 'Server Config Error: Missing MP Token' }, { status: 500 });
    }

    const preference = await createPreference(items, orderId);
    
    return NextResponse.json({ url: preference.init_point });
  } catch (error: any) {
    console.error('Mercado Pago Error:', error);
    return NextResponse.json({ error: error.message || 'Payment initialization failed', details: error }, { status: 500 });
  }
}
