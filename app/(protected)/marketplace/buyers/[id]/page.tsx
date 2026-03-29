import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireSession } from '@/lib/rbac/guards'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { MarketplaceHeader } from '@/components/marketplace-vibe/MarketplaceHeader'
import { formatCreditScore } from '@/lib/utils'

type BuyerProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function BuyerProfilePage({ params }: BuyerProfilePageProps) {
  await requireSession()
  const { id } = await params
  const supabase = await createClient()

  const { data: org } = await supabase
    .from('organizations')
    .select(
      'id, name, description, brand_story, logo_image, operation_country, buyer_credit_score, supplier_credit_score'
    )
    .eq('id', id)
    .maybeSingle()

  if (!org) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/supplier/marketplace">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke marketplace pemasok
          </Link>
        </Button>
      </div>

      <MarketplaceHeader
        title={org.name ?? 'Organisasi pembeli'}
        description={org.description ?? 'Profil organisasi'}
        stats={[
          { label: 'Negara', value: org.operation_country ?? 'Tidak ditentukan' },
          {
            label: 'Skor kredit pembeli',
            value: formatCreditScore(org.buyer_credit_score),
          },
          { label: 'Jenis', value: 'Profil pembeli' },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Logo</p>
          <div className="relative mt-3 aspect-square w-full overflow-hidden rounded-md border bg-muted/30">
            <Image
              src={org.logo_image || '/dummy-cabe.png'}
              alt={org.name ?? 'Logo pembeli'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <p className="text-sm font-medium">Cerita merek</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {org.brand_story?.trim() || 'Belum ada cerita merek.'}
          </p>
        </div>
      </div>
    </div>
  )
}
