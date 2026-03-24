# Supabase SQL

## Migrations

Filenames use the same version timestamps as `supabase_migrations` on the linked project (including applies from the Supabase MCP / dashboard). If you see “Remote migration versions not found in local migrations directory”, pull latest migrations from this repo or run `supabase db pull` after aligning history.

- `migrations/20260324174948_trd_core_schema.sql` — TRD tables (`organizations`, `profiles`, `products`, …), enums, helper functions, baseline RLS.

Apply with the Supabase CLI (from repo root):

```bash
supabase link   # once, to your project
supabase db push
```

Or paste the migration SQL into the Supabase Dashboard → SQL Editor.

## Example data

- `seed.sql` — runs automatically after migrations on **`supabase db reset`**. Inserts demo orgs (same UUIDs as test accounts), one `locations` row, two `products`, `product_sources`, `supply_listings`, `demand_listings`, and one `matches` row. Does **not** create Auth users; use `pnpm run seed:test-accounts` for logins (script upserts the same demo data again — idempotent).
- `seed_examples.sql` — commented reference inserts and notes; manual SQL editor use.

## Auth ↔ `profiles`

- `public.profiles.id` = `auth.users.id` (1:1).
- Platform operators: `profiles.is_platform_superadmin = true` and `organization_id IS NULL`.
- Org users: `organization_id` set, `role` ∈ `admin` | `manager` | `member`.

After `pnpm run seed:admin`, insert a matching `profiles` row for that user (service role SQL) with `is_platform_superadmin = true`.

## Test accounts (RBAC)

From the repo root (requires `SUPABASE_SERVICE_ROLE_KEY` and applied migration):

```bash
pnpm run seed:test-accounts
```

Creates organizations + Auth users + `profiles` for local testing. Password for every seeded test user: **`TestPassword123!`**

| Email | Role |
|-------|------|
| `superadmin@test.local` | Platform superadmin |
| `farmer-admin@test.local` | Farmer org, `admin` |
| `farmer-member@test.local` | Same farmer org, `member` |
| `umkm-manager@test.local` | UMKM org, `manager` |
| `hotel-admin@test.local` | Hotel org, `admin` |
| `gov-member@test.local` | Government org, `member` |

Re-running updates passwords and upserts `profiles` (idempotent). Also upserts marketplace demo rows (listings + match).
