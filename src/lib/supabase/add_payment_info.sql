-- Add payment_info column to orders table to store full MP response
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_info JSONB;
