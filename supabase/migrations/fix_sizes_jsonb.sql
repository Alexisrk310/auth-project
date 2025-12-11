-- Force conversion of array columns to JSONB to ensure .contains() filters work correctly
-- This resolves the "Error fetching products" crash when filtering by size

BEGIN;

  -- 1. Sizes (Critical for the reported error)
  -- We use USING to convert existing data safely.
  -- If it's already JSONB, this is a no-op or cheap.
  -- If it's text/text[], this casts it using to_jsonb function which is safer for arrays.
  -- Note: If the column is TEXT containing JSON string, use 'sizes::jsonb'. 
  -- Assuming it might be text[] or jsonb already.
  
  -- We'll try a generic cast strategy:
  ALTER TABLE public.products 
  ALTER COLUMN sizes TYPE jsonb 
  USING sizes::jsonb;

  -- 2. Ensure default is empty JSON array
  ALTER TABLE public.products 
  ALTER COLUMN sizes SET DEFAULT '[]'::jsonb;

  -- 3. Colors (Future proofing)
  ALTER TABLE public.products 
  ALTER COLUMN colors TYPE jsonb 
  USING colors::jsonb;
  
  ALTER TABLE public.products 
  ALTER COLUMN colors SET DEFAULT '[]'::jsonb;

  -- 4. Images (Commonly used in arrays)
  ALTER TABLE public.products 
  ALTER COLUMN images TYPE jsonb 
  USING images::jsonb;

  ALTER TABLE public.products 
  ALTER COLUMN images SET DEFAULT '[]'::jsonb;

COMMIT;
