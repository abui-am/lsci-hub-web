alter table public.supply_listings
add column if not exists supplier_location text,
add column if not exists expiration_date date;
