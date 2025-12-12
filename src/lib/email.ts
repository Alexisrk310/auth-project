import { Resend } from 'resend';
import { emailTranslations } from './email-translations';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'onboarding@resend.dev'; // Defaults to Resend's testing domain

type SupportedLang = 'es' | 'en' | 'fr' | 'pt';

export const sendWelcomeEmail = async (email: string, name: string, lang: SupportedLang = 'es') => {
  const t = emailTranslations[lang]?.welcome || emailTranslations['es'].welcome;
  
  try {
    const { data, error } = await resend.emails.send({
      from: `ThunderXis <${FROM_EMAIL}>`,
      to: [email],
      subject: t.subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>${t.title.replace('{name}', name)}</h1>
          <p>${t.p1}</p>
          <p>${t.p2}</p>
          <a href="https://thunderxis.vercel.app/shop" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">${t.cta}</a>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending welcome email:', error);
    return { success: false, error };
  }
};

export const sendOrderConfirmationEmail = async (email: string, orderId: string, total: number, items: any[], lang: SupportedLang = 'es') => {
  const t = emailTranslations[lang]?.order || emailTranslations['es'].order;
  
  try {
    const itemListHtml = items.map(item => `
      <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
        <strong>${item.name}</strong> x ${item.quantity} - ${item.size}
        <br/>
        <span style="color: #666;">$${item.price.toLocaleString()}</span>
      </div>
    `).join('');

    const { data, error } = await resend.emails.send({
      from: `ThunderXis <${FROM_EMAIL}>`,
      to: [email],
      subject: t.subject.replace('{id}', orderId.slice(0, 8)),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #7c3aed;">${t.title}</h1>
          <p>${t.p1.replace('{id}', orderId.slice(0, 8))}</p>
          
          <h3>${t.details}</h3>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
            ${itemListHtml}
            <div style="margin-top: 20px; text-align: right; font-size: 1.2em; font-weight: bold;">
              ${t.total} $${total.toLocaleString()}
            </div>
          </div>

          <p>${t.track}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending order confirmation:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception sending order confirmation:', error);
    return { success: false, error };
  }
};
