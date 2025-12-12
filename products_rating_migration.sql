-- Add rating column to products table
alter table products 
add column if not exists rating numeric check (rating >= 0 and rating <= 5);
