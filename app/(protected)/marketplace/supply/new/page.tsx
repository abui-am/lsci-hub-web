import { createClient } from '@/lib/supabase/server'
import { requireSession } from '@/lib/rbac/guards'
import { SupplyListingForm } from '@/components/dashboard/marketplace/SupplyListingForm'

export default async function MarketplaceSupplyNewPage() {
  const session = await requireSession()
  const canCreateProducts = true

  if (!session.organization) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">No organization linked</h2>
        <p className="mt-2 text-muted-foreground">
          To create a supply listing, your account must be linked to a supplier organization.
        </p>
      </div>
    )
  }

  if (!session.profile.is_platform_superadmin && !session.profile.is_supplier) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm">
        <h2 className="text-base font-semibold">Not allowed</h2>
        <p className="mt-2 text-muted-foreground">
          Your account is not marked as supplier.
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
    <SupplyListingForm
      mode="create"
      products={(products ?? []) as Array<{ id: string; name: string; unit: string }>}
      canCreateProducts={canCreateProducts}
      backHref="/marketplace/supply"
      successRedirectPath="/marketplace/supply"
    />
  )
}
