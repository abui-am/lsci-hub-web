import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/rbac/guards'
import type { OrgSector, OrgType } from '@/lib/rbac/types'
import { OrganizationEditForm } from '@/components/dashboard/OrganizationEditForm'

type OrgRow = {
  id: string
  name: string
  type: OrgType
  sector: OrgSector | null
  description: string | null
  verification_status: 'pending' | 'verified'
}

export default async function OrganizationEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireSession()
  const { id } = await params
  const canAttemptEdit =
    session.profile.is_platform_superadmin ||
    (session.organization?.id === id && session.profile.role === 'admin')

  if (!canAttemptEdit) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Forbidden</h2>
        <p className="mt-2 text-muted-foreground">
          You don&apos;t have permission to edit this organization.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, type, sector, description, verification_status')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Could not load organization</h2>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    )
  }

  if (!data) {
    notFound()
  }

  const org = data as OrgRow

  const canEdit = canAttemptEdit
  const canEditType = session.profile.is_platform_superadmin

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit organization</h1>
        <p className="text-muted-foreground">Update organization details.</p>
      </div>

      <OrganizationEditForm
        orgId={org.id}
        canEdit={canEdit}
        canEditType={canEditType}
        initial={{
          name: org.name,
          type: org.type,
          sector: org.sector,
          description: org.description,
          verification_status: org.verification_status,
        }}
      />
    </div>
  )
}

