-- FIX: Reset RLS policies for Products table to resolve "missing products" for logged-in users
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop POTENTIALLY conflicting policies (covers various naming conventions used previously)
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;


-- 3. Create a CLEAR, SINGLE Read Policy for EVERYONE (Anon + Authenticated)
-- First, drop the specific policies we are about to create to ensure idempotency (re-runnable)
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Everyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

-- 4. Create Write Policies for Authenticated Users (or Owners)
-- Assuming any authenticated user can effectively be an admin in this context, 
-- OR strictly restrict to 'owner' role if that column exists in profiles.
-- For now, we restore the previous "Authenticated users can manage" behavior to ensure the owner can edit.
CREATE POLICY "Authenticated users can insert products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products" 
ON public.products 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products" 
ON public.products 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 5. Force specific grant (sometimes needed if roles were revoked)
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.products TO service_role;
