import { createClient } from '@/lib/supabase/server'
import { DemandListingForm } from '@/components/dashboard/marketplace/DemandListingForm'
import { requireSession } from '@/lib/rbac/guards'

export default async function DemandListingNewPage() {
  const session = await requireSession()
  const canCreateProducts = true

  if (!session.organization) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">No organization linked</h2>
        <p className="mt-2 text-muted-foreground">
          To create a demand listing, you must be linked to a buyer organization.
        </p>
        <p className="mt-3">
          Go to <a className="underline" href="/dashboard/settings">Settings</a> and wait for admin approval.
        </p>
      </div>
    )
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_buyer) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">
          Your account is not marked as <span className="font-medium">buyer</span>.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, unit')
    .is('deleted_at', null)
    .order('name')

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        Failed to load products: {error.message}
      </div>
    )
  }

  return (
    <div>
      <DemandListingForm
        mode="create"
        products={(products ?? []) as Array<{ id: string; name: string; unit: string }>}
        canCreateProducts={canCreateProducts}
      />
    </div>
  )
}

