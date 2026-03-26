/** Mirrors Postgres enums in `supabase/migrations/20260324174948_trd_core_schema.sql` */

export type MembershipRole = 'admin' | 'manager' | 'member'

export type OrgType = 'farmer' | 'umkm' | 'industry' | 'hotel' | 'government'

export type OrgSector = 'agriculture' | 'tourism' | 'processing' | 'mining'

export interface OrganizationRow {
  id: string
  name: string
  type: OrgType
  sector: OrgSector | null
  location_id: string | null
  description: string | null
  brand_story: string | null
  logo_image: string | null
  operation_country: string | null
  buyer_credit_score: number | null
  supplier_credit_score: number | null
  created_at: string
  deleted_at: string | null
}

export interface ProfileRow {
  id: string
  name: string
  organization_id: string | null
  role: MembershipRole
  is_platform_superadmin: boolean
  is_supplier: boolean
  is_buyer: boolean
  phone: string | null
  created_at: string
  deleted_at: string | null
}

/** Resolved session for server components and route handlers */
export interface SessionContext {
  userId: string
  email: string | undefined
  profile: ProfileRow
  organization: OrganizationRow | null
}
