import MercadoPagoConfig, { Preference } from 'mercadopago';

const isProd = process.env.MP_ENV === 'production';

const accessToken = (isProd 
  ? process.env.MP_ACCESS_TOKEN_PROD 
  : (process.env.MP_ACCESS_TOKEN_TEST || process.env.MERCADO_PAGO_ACCESS_TOKEN)) || '';

const client = new MercadoPagoConfig({ 
  accessToken: accessToken
});

export const createPreference = async (items: { id: string; name: string; quantity: number; price: number }[], orderId: string) => {
  const preference = new Preference(client);
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://auth-project-x5d8.vercel.app';

  const response = await preference.create({
    body: {
      items: items.map(item => ({
        id: item.id,
        title: item.name,
        quantity: item.quantity,
        unit_price: Number(item.price),
        currency_id: 'COP' 
      })),
      external_reference: orderId,
      back_urls: {
        success: `${baseUrl}/cart/success`,
        failure: `${baseUrl}/cart/failure`,
        pending: `${baseUrl}/cart/pending`,
      },
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      auto_return: 'approved',
    }
  });

  return response;
};
