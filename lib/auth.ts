import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Returns the current user from the server using getClaims().
 * Use in Server Components and Server Actions. Redirects to /login if unauthenticated.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/login')
  }
  return user
}

/**
 * Returns the current user or null. Does not redirect.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export {
  getSessionContext,
  getSessionContextForUser,
  requireMembershipRole,
  requireOrgType,
  requireOrgUser,
  requirePlatformOrMembershipRole,
  requirePlatformSuperAdmin,
  requireSession,
} from '@/lib/rbac'
export type {
  MembershipRole,
  OrgSector,
  OrgType,
  OrganizationRow,
  ProfileRow,
  SessionContext,
} from '@/lib/rbac/types'
