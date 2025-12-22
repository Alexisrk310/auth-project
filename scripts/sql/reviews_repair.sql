DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'reply') THEN 
        ALTER TABLE reviews ADD COLUMN reply text; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'replied_at') THEN 
        ALTER TABLE reviews ADD COLUMN replied_at timestamp with time zone; 
    END IF;
END $$;
