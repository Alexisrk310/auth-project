-- ROBUST FIX for "invalid input syntax for type json"
-- The previous error happened because "s::jsonb" fails on Postgres Arrays (e.g. {A,B}).
-- to_jsonb() is safe and correctly converts Postgres Arrays to JSON Arrays.

BEGIN;

  -- 1. Sizes
  ALTER TABLE public.products 
  ALTER COLUMN sizes TYPE jsonb 
  USING to_jsonb(sizes);

  -- 2. Defaults
  ALTER TABLE public.products 
  ALTER COLUMN sizes SET DEFAULT '[]'::jsonb;

  -- 3. Colors
  ALTER TABLE public.products 
  ALTER COLUMN colors TYPE jsonb 
  USING to_jsonb(colors);
  
  ALTER TABLE public.products 
  ALTER COLUMN colors SET DEFAULT '[]'::jsonb;

  -- 4. Images
  ALTER TABLE public.products 
  ALTER COLUMN images TYPE jsonb 
  USING to_jsonb(images);

  ALTER TABLE public.products 
  ALTER COLUMN images SET DEFAULT '[]'::jsonb;

COMMIT;
