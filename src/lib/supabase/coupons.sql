-- Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  expiration_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  min_purchase_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can do everything
CREATE POLICY "Admins can manage coupons" ON coupons
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'owner'
    )
  );

-- Public can read active coupons (needed for validation)
-- Or maybe we restrict this to server-side action only?
-- Let's allow read for now but maybe secure it better later.
-- Actually, strict security would be: only server action can read.
-- But for client-side validation feedback, we might read it.
-- Let's restrict to authenticated users or just use service role in action.
-- If we use service role in action, we don't need public read policy.
-- But let's add a policy for admin read just in case.

-- We will rely on server action "validateCoupon" which uses service role or admin check.
-- So no public read policy needed.
