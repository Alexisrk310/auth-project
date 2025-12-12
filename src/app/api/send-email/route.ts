import { NextResponse } from 'next/server';
import { sendWelcomeEmail, sendOrderConfirmationEmail } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

// Simple security measure: Ensure caller is authenticated
// Ideally you verify the session, OR use a shared secret if calling from webhooks.
// For client-side checks after checkout, we can verify the user session.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, payload } = body;

    // Optional: Verify user session here if needed
    // const supabase = createClient();
    // const { data: { user } } = await supabase.auth.getUser();

    if (type === 'welcome') {
      const { email, name, lang } = payload;
      const result = await sendWelcomeEmail(email, name, lang);
      return NextResponse.json(result);
    }

    if (type === 'order_confirmation') {
      const { email, orderId, total, items, lang } = payload;
      const result = await sendOrderConfirmationEmail(email, orderId, total, items, lang);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
  } catch (error) {
    console.error('API Error sending email:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
