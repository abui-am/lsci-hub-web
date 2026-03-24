import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { OrganizationRow, ProfileRow, SessionContext } from '@/lib/rbac/types'

async function fetchOrganization(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string
): Promise<OrganizationRow | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select(
      'id, name, type, sector, location_id, description, created_at, deleted_at'
    )
    .eq('id', organizationId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !data) {
    return null
  }
  return data as OrganizationRow
}

/**
 * Loads profile + organization for the given auth user.
 * Returns null if there is no profile row (RLS may also hide rows).
 */
export async function getSessionContextForUser(
  user: User
): Promise<SessionContext | null> {
  const supabase = await createClient()

  const selectProfile = () =>
    supabase
      .from('profiles')
      .select(
        'id, name, organization_id, role, is_platform_superadmin, phone, created_at, deleted_at'
      )
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

  let { data: profile, error } = await selectProfile()

  if (!error && !profile) {
    await supabase.rpc('ensure_my_profile')
    ;({ data: profile, error } = await selectProfile())
  }

  if (error || !profile) {
    return null
  }

  const p = profile as ProfileRow
  let organization: OrganizationRow | null = null

  if (p.organization_id) {
    organization = await fetchOrganization(supabase, p.organization_id)
  }

  return {
    userId: user.id,
    email: user.email,
    profile: p,
    organization,
  }
}

/**
 * Current session with RBAC context, or null if unauthenticated / no profile.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return null
  }
  return getSessionContextForUser(user)
}
