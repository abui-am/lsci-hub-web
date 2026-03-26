-- Adds an explicit account tag to profiles so we can mark created users as
-- supplier / buyer / internal (requested by TRD v2 onboarding UX).

CREATE TYPE public.account_class AS ENUM (
  'supplier',
  'buyer',
  'internal'
);
ALTER TABLE public.profiles
ADD COLUMN account_class public.account_class NOT NULL DEFAULT 'internal';
-- Backfill based on linked organization type.
UPDATE public.profiles p
SET account_class = 'supplier'
FROM public.organizations o
WHERE p.organization_id = o.id
  AND o.type IN ('farmer', 'umkm')
  AND p.deleted_at IS NULL;
UPDATE public.profiles p
SET account_class = 'buyer'
FROM public.organizations o
WHERE p.organization_id = o.id
  AND o.type IN ('industry', 'hotel')
  AND p.deleted_at IS NULL;
-- Platform superadmin and government orgs are treated as internal.
UPDATE public.profiles p
SET account_class = 'internal'
WHERE p.is_platform_superadmin = true
  AND p.deleted_at IS NULL;
UPDATE public.profiles p
SET account_class = 'internal'
FROM public.organizations o
WHERE p.organization_id = o.id
  AND o.type = 'government'
  AND p.deleted_at IS NULL;
COMMENT ON COLUMN public.profiles.account_class IS 'Tag: supplier/buyer/internal (derived from org type; overridden on registration).';
