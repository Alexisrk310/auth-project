import { NextResponse } from 'next/server';
import { confirmOrder } from '@/lib/orders';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const result = await confirmOrder(orderId);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Order Confirmation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
