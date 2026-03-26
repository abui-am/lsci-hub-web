alter table public.organizations
add column if not exists brand_story text,
add column if not exists logo_image text,
add column if not exists operation_country text;
