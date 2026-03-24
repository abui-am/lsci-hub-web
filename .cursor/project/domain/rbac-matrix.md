# LSCI-Hub RBAC matrix (TRD aligned)

**Status:** Draft v2 - aligned to TRD access model.  
**Source docs:** [TRD LSCI Hub](../../rules/docs/TRD%20(Technical%20Requirement%20Design)%20LSCI%20Hub.pdf), [PRD LSCI](../../rules/docs/PRD%20LSCI.pdf).

This matrix follows the TRD structure:
- `organizations.type` identifies ecosystem actor (`farmer`, `umkm`, `industry`, `hotel`, `government`)
- `users.role` controls authority inside the organization (`admin`, `manager`, `member`)
- platform-level `super_admin` remains separate for system governance

## Identity model used by this matrix

| Layer | Field | Values | Purpose |
|------|------|--------|---------|
| Platform | `platform_role` | `super_admin` or null | System governance across all organizations |
| Organization actor | `organizations.type` | `farmer`, `umkm`, `industry`, `hotel`, `government` | Business persona and data domain |
| Org membership | `users.role` | `admin`, `manager`, `member` | Permission level within the same organization |

## Legend

| Symbol | Meaning |
|--------|---------|
| **C** | Create |
| **R** | Read |
| **U** | Update |
| **D** | Delete |
| **R\*** | Read aggregate or masked data only |
| **Own** | Rows owned by caller org |
| **Matched** | Rows connected by an approved match/relationship |
| **--** | No access in v1 |

## Organization-type permission scope

This is actor-level scope before membership-level checks.

| Organization type | Supply listings | Demand listings | Matches | Traceability | Dashboard |
|-------------------|-----------------|-----------------|---------|--------------|-----------|
| `farmer` | CRUD Own | R Matched | R Own | CRUD Own proofs | R Own KPI |
| `umkm` | CRUD Own | R Matched (or create if also buyer) | R Own | CRUD Own proofs | R Own KPI |
| `industry` | R Discoverable | CRUD Own | CRUD relationship status | R Matched | R Own KPI |
| `hotel` | R Discoverable | CRUD Own | CRUD relationship status | R Matched | R Own KPI |
| `government` | R\* | R\* | R\* | R\* | R\* regional/sector |

## Membership-role permission scope

These rules apply inside each organization type above.

| `users.role` | Organization settings | Users in same org | Data operations |
|--------------|-----------------------|-------------------|-----------------|
| `admin` | RU | Invite/manage members | CRUD allowed objects in org scope |
| `manager` | R | No role assignment | CRU allowed objects in org scope |
| `member` | R | No user management | CRU limited to records they created or are assigned to |

## Combined matrix (TRD practical RBAC)

### Supply-side objects (`products`, `product_sources`, `supply_listings`)

| Org type | `admin` | `manager` | `member` |
|----------|---------|-----------|----------|
| `farmer` / `umkm` | CRUD Own | CRU Own | CRU Own-created |
| `industry` / `hotel` | R discoverable only | R discoverable only | R discoverable only |
| `government` | R\* only | R\* only | R\* only |

### Demand-side objects (`demand_listings`)

| Org type | `admin` | `manager` | `member` |
|----------|---------|-----------|----------|
| `industry` / `hotel` | CRUD Own | CRU Own | CRU Own-created |
| `farmer` / `umkm` | R matched only | R matched only | R matched only |
| `government` | R\* only | R\* only | R\* only |

### Matching object (`matches`)

| Org type | `admin` | `manager` | `member` |
|----------|---------|-----------|----------|
| `farmer` / `umkm` | R own + U status if participant | R own + U status if participant | R own assigned |
| `industry` / `hotel` | R own + U status if participant | R own + U status if participant | R own assigned |
| `government` | R\* only | R\* only | R\* only |

### Dashboard / institutional insight

| Org type | `admin` | `manager` | `member` |
|----------|---------|-----------|----------|
| `farmer` / `umkm` / `industry` / `hotel` | R own/org KPI | R own/org KPI | R own KPI only |
| `government` | R\* + export aggregate | R\* | R\* |

## Platform controls (outside TRD org roles)

| Action | `super_admin` | Others |
|--------|---------------|--------|
| Create/activate organizations | Yes | No |
| Invite first org admin | Yes | No |
| Change org type | Yes (audited) | No |
| Elevate/demote org `users.role` | Yes (audited) | Org `admin` can manage non-admin membership only |
| Break-glass support access | Yes (audited, temporary) | No |

## RLS implementation notes

1. Always evaluate access as `platform_role` first, then `organizations.type`, then `users.role`.
2. Use `organization_id` scoping for all mutable tables (`product_sources`, `supply_listings`, `demand_listings`).
3. `government` access should query aggregate views whenever possible, not raw transactional rows.
4. `member` operations should include creator/assignee checks to avoid broad org-wide edit rights.
5. Keep `super_admin` bypass narrow and audited.

## Open items from TRD to fix

1. TRD page 4 labels the matches table as `demand_listings`; implementation should use a dedicated `matches` table.
2. If BI and GenBI need distinct permissions, add explicit org types or a `government_subtype`.
3. Decide whether `umkm` can post demand in v1 (currently optional in this matrix).

## Change log

| Date | Change |
|------|--------|
| 2026-03-21 | Reworked matrix to TRD model: org type + membership role + platform super_admin |
