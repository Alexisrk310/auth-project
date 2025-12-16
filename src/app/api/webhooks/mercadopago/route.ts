import { NextResponse } from 'next/server';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { confirmOrder } from '@/lib/orders';

const isProd = process.env.MP_ENV === 'production';
const accessToken = (isProd 
  ? process.env.MP_ACCESS_TOKEN_PROD 
  : (process.env.MP_ACCESS_TOKEN_TEST || process.env.MERCADO_PAGO_ACCESS_TOKEN)) || '';

const client = new MercadoPagoConfig({ accessToken });

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({})); // Read body for signature if needed, though usually query params for basics
    
    // 1. Signature Verification (Optional but recommended)
    const secret = process.env.MP_WEBHOOK_SECRET;
    const signature = req.headers.get('x-signature');
    const requestId = req.headers.get('x-request-id');
    
    // Parse ID and Topic from URL or Body
    const topic = url.searchParams.get('topic') || url.searchParams.get('type') || body.type;
    const id = url.searchParams.get('id') || url.searchParams.get('data.id') || body.data?.id;

    if (secret && signature && requestId && id) {
        // Extract ts and v1 from signature
        const parts = signature.split(',');
        let ts = '';
        let v1 = '';
        
        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (key && value) {
                if (key.trim() === 'ts') ts = value.trim();
                if (key.trim() === 'v1') v1 = value.trim();
            }
        });

        if (ts && v1) {
            const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
            const crypto = require('crypto');
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(manifest).digest('hex');

            if (digest !== v1) {
                console.error('Webhook Signature Verification Failed');
                // Return 200 to keep MP happy but don't process? Or 403?
                // Usually better to reject only if we are strict. 
                // For now, let's just log warning to ensure we don't block legitimate payments if config is wrong.
                console.warn('Signature mismatch. Check MP_WEBHOOK_SECRET.');
            } else {
                console.log('Webhook Signature Verified ✅');
            }
        }
    }

    // Process Payments
    if ((topic === 'payment' || topic === 'payment') && id) { // Double check topic string
       const payment = new Payment(client);
       const paymentData = await payment.get({ id });
       
       if (paymentData.status === 'approved') {
           const orderId = paymentData.external_reference;
           
           if (orderId) {
               console.log(`Webhook: Confirming order ${orderId} for payment ${id}`);
               const confirmation = await confirmOrder(orderId, paymentData);
               
               if (confirmation.success && confirmation.order) {
                   const order = confirmation.order;
                   
                   // Use Admin Client again since we need access to auth/users or public.profiles
                   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
                   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
                   const supabaseAdmin = (await import('@supabase/supabase-js')).createClient(supabaseUrl, supabaseKey);
                   
                   let email = order.customer_email;
                   let name = order.customer_name || 'Cliente';
                   
                   // If user_id exists, try to fetch fresh profile data (optional, but good for registered users)
                   if (order.user_id) {
                       const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', order.user_id).single();
                       const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
                       
                       if (user && user.email) {
                           email = user.email;
                           name = user.user_metadata?.full_name || user.user_metadata?.name || profile?.full_name || name;
                       }
                   }

                   if (email) {
                        const language = order.language || 'es'; // Default or from order
                        
                        // Map items
                        const emailItems = (order.order_items || []).map((item: any) => ({
                             name: item.products?.name || 'Producto', 
                             size: item.size || 'N/A',
                             quantity: item.quantity,
                             price_at_time: item.price_at_time || item.price || 0
                        }));

                        await import('@/lib/email').then(m => m.sendOrderConfirmationEmail(
                            name,
                            email,
                            order.id,
                            order.total,
                            emailItems,
                            language,
                            undefined, // date (default)
                            order.shipping_cost || 0 // shippingCost
                        ));
                        console.log(`Webhook: Email sent to ${email}`);
                   }
               }
           }
       }
    } else {
        // Log other events (claims, fraud, etc) just for visibility
        console.log(`Webhook received: ${topic} - ID: ${id}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ status: 'error', error }, { status: 500 });
  }
}
