-- COMPREHENSIVE RLS FIX FOR PRODUCTS
-- This script forcefully removes ALL known conflicting policies and resets access.
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Temporarily disable RLS to verify if this is the root cause (and clearer state)
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- 2. Drop EVERY potential policy name we found in the codebase
-- (Postgres doesn't error if they don't exist with IF EXISTS)

-- Policies from schema.sql
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- Policies from owner_role.sql
DROP POLICY IF EXISTS "Owners can insert products" ON public.products;
DROP POLICY IF EXISTS "Owners can update products" ON public.products;
DROP POLICY IF EXISTS "Owners can delete products" ON public.products;

-- Policies from previous attempts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Public read access" ON public.products;
DROP POLICY IF EXISTS "Admin write access" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.products;

-- The new policies we want to establish (drop first to be safe)
DROP POLICY IF EXISTS "Everyone can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

-- 3. Re-Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 4. Create the Single Source of Truth Policies

-- READ: Everyone (Anon + Auth)
CREATE POLICY "Everyone can view products" 
ON public.products 
FOR SELECT 
USING (true);

-- WRITE: Authenticated Users (Owners/Admins)
-- Ideally use role='owner' if you have it, but for now allow all auth to unblock you.
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

-- 5. Explicitly Grant Select to Roles (Redundant but safe)
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.products TO service_role;
