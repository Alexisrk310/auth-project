-- Enable RLS on reviews if not already enabled
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to read reviews (public)
CREATE POLICY "Public reviews are viewable by everyone" 
ON reviews FOR SELECT 
USING (true);

-- Policy to allow authenticated users to insert reviews
CREATE POLICY "Authenticated users can insert reviews" 
ON reviews FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy to allow users to delete their own reviews (optional, good practice)
CREATE POLICY "Users can delete own reviews" 
ON reviews FOR DELETE 
USING (auth.uid() = user_id);

-- CRITICAL: Policy to allow OWNERS/ADMINS to UPDATE reviews (to add replies)
-- This assumes a 'profiles' table with a 'role' column. 
-- Adjust logic if you identify admins differently (e.g. by specific email)
CREATE POLICY "Owners can update reviews (add replies)" 
ON reviews FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'owner'
  )
);

-- Alternative simple policy for specific admin email if profiles table is tricky
-- CREATE POLICY "Admin email can update reviews" 
-- ON reviews FOR UPDATE 
-- USING (auth.jwt() ->> 'email' = 'alexisrk310@gmail.com');
