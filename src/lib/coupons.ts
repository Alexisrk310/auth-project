import { SupabaseClient } from '@supabase/supabase-js'

export async function validateCouponLogic(supabase: SupabaseClient, code: string, cartTotal: number) {
  const { data: coupon, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()

  if (error || !coupon) {
    return { error: 'Invalid or inactive coupon code' }
  }

  // Check expiration
  if (coupon.expiration_date && new Date(coupon.expiration_date) < new Date()) {
    return { error: 'Coupon has expired' }
  }

  // Check usage limit
  if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
    return { error: 'Coupon usage limit reached' }
  }

  // Check min purchase
  if (cartTotal < (coupon.min_purchase_amount || 0)) {
    return { error: `Minimum purchase of $${coupon.min_purchase_amount || 0} required` }
  }

  // Calculate discount
  let discountAmount = 0
  if (coupon.discount_type === 'percentage') {
    discountAmount = (cartTotal * coupon.discount_value) / 100
  } else {
    discountAmount = coupon.discount_value
  }

  // Ensure discount doesn't exceed total
  if (discountAmount > cartTotal) {
    discountAmount = cartTotal
  }

  return {
    success: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_value: coupon.discount_value,
      discount_type: coupon.discount_type,
      applied_discount: discountAmount
    }
  }
}
