import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSessionContextForUser } from '@/lib/rbac/session'
import type { MembershipRole, OrgType, SessionContext } from '@/lib/rbac/types'

const LOGIN = '/login'

function hasMembershipRole(
  session: SessionContext,
  allowed: readonly MembershipRole[]
): boolean {
  return allowed.includes(session.profile.role)
}

function hasOrgType(
  session: SessionContext,
  allowed: readonly OrgType[]
): boolean {
  if (!session.organization) {
    return false
  }
  return allowed.includes(session.organization.type)
}

/**
 * Authenticated user with a non-deleted `profiles` row (and org when applicable).
 */
export async function requireSession(): Promise<SessionContext> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect(LOGIN)
  }

  const session = await getSessionContextForUser(user)
  if (!session) {
    redirect(`${LOGIN}?error=no_profile`)
  }

  return session
}

/**
 * Platform superadmin only (`profiles.is_platform_superadmin`).
 */
export async function requirePlatformSuperAdmin(): Promise<SessionContext> {
  const session = await requireSession()
  if (!session.profile.is_platform_superadmin) {
    redirect('/dashboard?error=forbidden')
  }
  return session
}

/**
 * Org users only (excludes platform superadmin without an org).
 */
export async function requireOrgUser(): Promise<SessionContext> {
  const session = await requireSession()
  if (session.profile.is_platform_superadmin) {
    redirect('/dashboard?error=forbidden')
  }
  if (!session.profile.organization_id || !session.organization) {
    redirect(`${LOGIN}?error=no_organization`)
  }
  return session
}

export async function requireMembershipRole(
  allowed: readonly MembershipRole[]
): Promise<SessionContext> {
  const session = await requireOrgUser()
  if (!hasMembershipRole(session, allowed)) {
    redirect('/dashboard?error=forbidden')
  }
  return session
}

export async function requireOrgType(
  allowed: readonly OrgType[]
): Promise<SessionContext> {
  const session = await requireOrgUser()
  if (!hasOrgType(session, allowed)) {
    redirect('/dashboard?error=forbidden')
  }
  return session
}

/**
 * Superadmin OR org user with one of the membership roles.
 */
export async function requirePlatformOrMembershipRole(
  allowed: readonly MembershipRole[]
): Promise<SessionContext> {
  const session = await requireSession()
  if (session.profile.is_platform_superadmin) {
    return session
  }
  if (
    session.profile.organization_id &&
    session.organization &&
    hasMembershipRole(session, allowed)
  ) {
    return session
  }
  redirect('/dashboard?error=forbidden')
}
