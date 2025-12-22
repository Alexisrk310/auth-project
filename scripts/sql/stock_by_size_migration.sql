-- Add stock_by_size column to products table to store inventory per size
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_by_size JSONB;

-- Comment on column
COMMENT ON COLUMN products.stock_by_size IS 'Stores inventory distribution by size (e.g., {"S": 10, "M": 5})';
