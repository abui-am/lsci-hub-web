alter table public.supply_listings
add column if not exists image_url text;

alter table public.demand_listings
add column if not exists image_url text;
