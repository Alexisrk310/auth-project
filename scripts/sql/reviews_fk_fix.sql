-- Run this in your Supabase SQL Editor to fix the missing relationship error

-- Add the user_id foreign key if it was missing (though usually user_id references auth.users is already there)
-- This specific error was about 'reviews' and 'products'.

-- Add Foreign Key for products
ALTER TABLE reviews
DROP CONSTRAINT IF EXISTS reviews_product_id_fkey; -- drop if exists just in case

ALTER TABLE reviews
ADD CONSTRAINT reviews_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE CASCADE;

-- Also ensure user_id is properly referenced if not already (it was in the create table, but good to be safe)
-- ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- Refresh schema cache (sometimes needed but usually automatic)
NOTIFY pgrst, 'reload config';
