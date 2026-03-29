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
        title="Akun organisasi"
        description="Kelola profil merek marketplace dan detail operasi Anda."
        stats={[
          { label: 'Peran', value: session.profile.role },
          { label: 'Pemasok', value: session.profile.is_supplier ? 'Aktif' : 'Nonaktif' },
          { label: 'Pembeli', value: session.profile.is_buyer ? 'Aktif' : 'Nonaktif' },
          {
            label: 'Skor pembeli',
            value: formatCreditScore(organization?.buyer_credit_score),
          },
          {
            label: 'Skor pemasok',
            value: formatCreditScore(organization?.supplier_credit_score),
          },
        ]}
      />

      {!organization ? (
        <div className="rounded-lg border bg-card p-6 text-sm">
          <h2 className="text-base font-semibold">Belum ada organisasi</h2>
          <p className="mt-2 text-muted-foreground">
            Akun Anda belum ditautkan ke organisasi.
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
