import { requireSession } from '@/lib/rbac/guards'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { MarketplaceOrganizationAccountForm } from '@/components/marketplace-vibe/MarketplaceOrganizationAccountForm'
import { formatCreditScore } from '@/lib/utils'

export default async function MarketplaceAccountPage() {
  const session = await requireSession()
  const organization = session.organization

  return (
    <div className="space-y-6">
      <MarketplaceHeader
        title="Organization account"
        description="Manage your marketplace brand profile and operation details."
        stats={[
          { label: 'Role', value: session.profile.role },
          { label: 'Supplier', value: session.profile.is_supplier ? 'Enabled' : 'Disabled' },
          { label: 'Buyer', value: session.profile.is_buyer ? 'Enabled' : 'Disabled' },
          {
            label: 'Buyer score',
            value: formatCreditScore(organization?.buyer_credit_score),
          },
          {
            label: 'Supplier score',
            value: formatCreditScore(organization?.supplier_credit_score),
          },
        ]}
      />

      {!organization ? (
        <div className="rounded-lg border bg-card p-6 text-sm">
          <h2 className="text-base font-semibold">No organization linked</h2>
          <p className="mt-2 text-muted-foreground">
            Your account is not linked to an organization yet.
          </p>
        </div>
      ) : (
        <MarketplaceOrganizationAccountForm
          canEdit={
            session.profile.is_platform_superadmin ||
            ['admin', 'manager'].includes(session.profile.role)
          }
          canEditScores={session.profile.is_platform_superadmin}
          initial={{
            name: organization.name ?? '',
            description: organization.description ?? '',
            brand_story: organization.brand_story ?? '',
            logo_image: organization.logo_image ?? '',
            operation_country: organization.operation_country ?? '',
            buyer_credit_score: organization.buyer_credit_score ?? null,
            supplier_credit_score: organization.supplier_credit_score ?? null,
          }}
        />
      )}
    </div>
  )
}
