'use server'

import { createClient } from '@/lib/supabase/server'
import { validateCouponLogic } from '@/lib/coupons'

export async function validateCoupon(code: string, cartTotal: number) {
  const supabase = await createClient()
  return await validateCouponLogic(supabase, code, cartTotal)
}
