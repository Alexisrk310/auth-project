-- Enable RLS explicitly to be sure
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potential conflicting policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.profiles;

-- 1. VIEW: Allow users to view their own profile (Critical for useAuth to fetch role)
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- 2. INSERT: Allow users to insert their own profile is usually handled by triggers on auth.users, 
-- but if done from client, this is needed. 
-- Note: Trigger-based inserts bypass RLS, so this is for client-side direct inserts if any.
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- 3. UPDATE: Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- 4. OWNER: Allow 'owner' role to view all profiles (Useful for Dashboard)
-- Uses a recursive check or specific claim, simplying here just in case owner needs access.
-- Avoiding complex recursion for now to prevent infinite loops. 
-- If you are the owner, you can view everyone by bypassing RLS in the Service Role client, 
-- but for Client Side Dashboard usage, we might need a policy.
-- For now, let's Stick to "Users can view own profile" to solve the immediate bug.
