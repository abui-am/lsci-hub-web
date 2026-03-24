# Authentication and RBAC (LSCI Hub)

This document describes how sign-in, profiles, roles, and access control work in this repository. It complements the product specs ([PRD](../.cursor/rules/docs/PRD%20LSCI.pdf), [TRD v2](../.cursor/rules/docs/TRD%20v2.pdf)) and the permission matrix.

## Source of truth

| Artifact | Purpose |
|---------|---------|
| [`.cursor/project/domain/rbac-matrix.md`](../.cursor/project/domain/rbac-matrix.md) | TRD-aligned matrix: `organizations.type`, `profiles.role`, platform superadmin |
| [`supabase/migrations/20260324174948_trd_core_schema.sql`](../supabase/migrations/20260324174948_trd_core_schema.sql) | Schema, enums, RLS policies |
| [`lib/rbac/`](../lib/rbac/) | Types, session loading, server guards |

## Identity model

- **Supabase Auth** [`auth.users`](https://supabase.com/docs/guides/auth) holds credentials and session.
- **`public.profiles`** is the app user row: `profiles.id` = `auth.users.id` (1:1).
- **`public.organizations`** is the B2B tenant. `profiles.organization_id` links most users to one org.
- **Platform operators** use `profiles.is_platform_superadmin = true` and **`organization_id` must be `NULL`** (enforced by a check constraint).
- **Org membership** uses TRD field `profiles.role`: `admin` | `manager` | `member`.
- **Org “kind”** uses `organizations.type`: `farmer` | `umkm` | `industry` | `hotel` | `government`.

Business rules (who may do what in the product) are documented in the matrix and enforced in the database by **RLS** and in the app by **server guards** (never rely on the client alone).

## Environment variables

Copy [`.env.example`](../.env.example) to `.env` and set:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (`https://<project-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon/publishable key (browser + server user client)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (**server-only**; seed scripts, bypass RLS)

All three must come from the **same** Supabase project. The URL host must match the project ref implied by your JWT keys (see [Troubleshooting](#troubleshooting)).

## Database setup

1. Apply the migration in the Supabase SQL editor or via CLI:

   ```bash
   supabase link
   supabase db push
   ```

   See [`supabase/README.md`](../supabase/README.md).

2. Ensure every person who signs in has a **`profiles` row**. Without it, the dashboard guard redirects to login with `?error=no_profile`.

## Application layers

### Edge: session refresh and anonymous blocks

[`middleware.ts`](../middleware.ts) runs for most routes. It:

1. Builds a Supabase client tied to the request cookies ([`lib/supabase/middleware.ts`](../lib/supabase/middleware.ts)).
2. Refreshes the session (via `getClaims()` inside `createMiddlewareSupabase`).
3. For paths under **`/dashboard`**, redirects unauthenticated users to **`/login?redirect=…`**.

Middleware only checks **Auth presence**, not `profiles` or roles (that stays in server code / RLS).

### Server: session + RBAC context

[`lib/rbac/session.ts`](../lib/rbac/session.ts):

- **`getSessionContext()`** — Current user + `profiles` + `organizations` (if linked).
- **`getSessionContextForUser(user)`** — Same for a given `User`.

[`lib/rbac/guards.ts`](../lib/rbac/guards.ts):

- **`requireSession()`** — Must be logged in and have a `profiles` row.
- **`requirePlatformSuperAdmin()`** — Superadmin only.
- **`requireOrgUser()`** — Must belong to an org (not platform-only superadmin pattern).
- **`requireMembershipRole([...])`** / **`requireOrgType([...])`** — Narrow routes by TRD roles / org type.

[`lib/auth.ts`](../lib/auth.ts) re-exports **`requireAuth` / `getCurrentUser`** plus all RBAC helpers for convenient imports.

### Protected dashboard

[`app/(protected)/dashboard/layout.tsx`](../app/(protected)/dashboard/layout.tsx) calls **`requireSession()`** so the dashboard always has a resolved profile after Auth.

Use stricter guards on specific pages or Server Actions as features grow (e.g. admin-only pages).

## Seeding and test accounts

| Command | Purpose |
|---------|---------|
| `pnpm run seed:admin` | Creates a single Auth user `admin@localhost` ([`scripts/seed-admin.ts`](../scripts/seed-admin.ts)) |
| `pnpm run seed:test-accounts` | Creates orgs + RBAC test users + profiles ([`scripts/seed-test-accounts.ts`](../scripts/seed-test-accounts.ts)) |

Test accounts use password **`TestPassword123!`** (development only). See [`supabase/README.md`](../supabase/README.md) for the email list.

After `seed:admin`, insert a **`profiles`** row for that user with `is_platform_superadmin = true` if you use the same RBAC model (or extend `seed-admin.ts` to do it).

## Testing roles (quick checklist)

1. Apply migration; run `seed:test-accounts` with valid `.env`.
2. Sign in as each test user; open `/dashboard`.
3. Confirm middleware blocks `/dashboard` when logged out.
4. Confirm `requireSession` sends users without a profile to `/login?error=no_profile`.
5. For data access, verify RLS with real queries (anon key vs service role) so row visibility matches the matrix.

## Troubleshooting

### `TypeError: fetch failed` / `ENOTFOUND` / `getaddrinfo` during seed

Node cannot resolve the Supabase host in `NEXT_PUBLIC_SUPABASE_URL`.

- Check connectivity and DNS/VPN/firewall.
- From a terminal: `nslookup <your-subdomain>.supabase.co 1.1.1.1`

### `NXDOMAIN` for `https://<ref>.supabase.co` (public resolvers)

The hostname does not exist. Common causes:

- Wrong or stale **project ref** in `.env`.
- Project was **paused**, **deleted**, or you copied keys from another project.

Fix: In [Supabase Dashboard](https://supabase.com/dashboard) → **Project Settings → API**, copy a fresh **Project URL** and keys from the **active** project. All env vars must match that project.

The seed script **[`scripts/seed-test-accounts.ts`](../scripts/seed-test-accounts.ts)** runs a **connectivity preflight** to surface DNS errors with `cause` details before hitting the REST API.

### RLS errors in the app

- Use the **anon** key in the browser/server user client; RLS applies.
- Use the **service role** only in trusted server scripts and admin paths; it bypasses RLS.

### `profiles_insert` / superadmin constraint violations

- `is_platform_superadmin = true` requires `organization_id IS NULL`.
- Non-superadmin inserts cannot set `is_platform_superadmin = true` (policies + CHECK).

## Security reminders

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client or commit `.env`.
- UI hiding is not authorization: always pair guards with RLS for data paths.
- Prefer **aggregated views** for institutional readers instead of wide raw-table SELECT policies (see matrix notes).

## Related files

- [`middleware.ts`](../middleware.ts)
- [`lib/supabase/middleware.ts`](../lib/supabase/middleware.ts)
- [`lib/supabase/server.ts`](../lib/supabase/server.ts)
- [`components/auth/LoginForm.tsx`](../components/auth/LoginForm.tsx) (`redirect` query + `no_profile` messaging)
- [`supabase/migrations/20260324174948_trd_core_schema.sql`](../supabase/migrations/20260324174948_trd_core_schema.sql)
