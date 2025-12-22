-- Add missing columns to orders table for checkout process
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC;

-- Add comments for clarity
COMMENT ON COLUMN orders.customer_email IS 'Email of the customer for this specific order';
COMMENT ON COLUMN orders.shipping_cost IS 'Shipping cost calculated at checkout';
