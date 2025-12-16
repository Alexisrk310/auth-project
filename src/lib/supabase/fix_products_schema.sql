-- Add compare_at_price column if it doesn't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS compare_at_price numeric;

-- Also ensure sale_price exists just in case, though likely it does
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_price numeric;
