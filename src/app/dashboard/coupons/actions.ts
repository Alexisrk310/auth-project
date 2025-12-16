'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Helper to get admin client
const getAdminSupabase = () => {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// Helper to verify owner
const checkOwner = async () => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // We assume layout protects the route, but double check here
    // Note: If RLS prevents reading own profile role, this might fail too. 
    // But usually reading own profile is allowed. 
    // SAFEST: Use admin client to check role too.
    const adminClient = getAdminSupabase()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    
    return profile?.role === 'owner'
}

export async function createCoupon(formData: FormData) {
  const isOwner = await checkOwner()
  if (!isOwner) return { error: 'Unauthorized' }

  const supabaseAdmin = getAdminSupabase()

  const code = formData.get('code')?.toString().toUpperCase()
  const discountType = formData.get('discountType')?.toString()
  const discountValue = parseFloat(formData.get('discountValue')?.toString() || '0')
  const expirationDate = formData.get('expirationDate')?.toString()
  const usageLimit = parseInt(formData.get('usageLimit')?.toString() || '0')
  const minPurchase = parseFloat(formData.get('minPurchase')?.toString() || '0')

  if (!code || !discountType || !discountValue) {
    return { error: 'Missing required fields' }
  }

  const { error } = await supabaseAdmin
    .from('coupons')
    .insert({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      expiration_date: expirationDate || null,
      usage_limit: usageLimit > 0 ? usageLimit : null,
      min_purchase_amount: minPurchase,
      is_active: true
    })

  if (error) {
    console.error('Error creating coupon:', error)
    return { error: error.message || 'Failed to create coupon' }
  }

  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function deleteCoupon(id: string) {
  const isOwner = await checkOwner()
  if (!isOwner) return { error: 'Unauthorized' }

  const supabaseAdmin = getAdminSupabase()

  const { error } = await supabaseAdmin
    .from('coupons')
    .delete()
    .eq('id', id)

  if (error) {
     return { error: error.message || 'Failed to delete coupon' }
  }

  revalidatePath('/dashboard/coupons')
  return { success: true }
}

export async function toggleCouponStatus(id: string, currentStatus: boolean) {
    const isOwner = await checkOwner()
    if (!isOwner) return { error: 'Unauthorized' }
  
    const supabaseAdmin = getAdminSupabase()
  
    const { error } = await supabaseAdmin
      .from('coupons')
      .update({ is_active: !currentStatus })
      .eq('id', id)
  
    if (error) {
       return { error: error.message || 'Failed to update coupon' }
    }
  
    revalidatePath('/dashboard/coupons')
    return { success: true }
  }

