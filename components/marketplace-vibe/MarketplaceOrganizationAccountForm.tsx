'use client'

import { FormEvent, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/providers/ToastProvider'

type Props = {
  initial: {
    name: string
    description: string
    brand_story: string
    logo_image: string
    operation_country: string
    buyer_credit_score: number | null
    supplier_credit_score: number | null
  }
  canEdit: boolean
  canEditScores?: boolean
}

export function MarketplaceOrganizationAccountForm({
  initial,
  canEdit,
  canEditScores = false,
}: Props) {
  const { toast } = useToast()
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [brandStory, setBrandStory] = useState(initial.brand_story)
  const [logoImage, setLogoImage] = useState(initial.logo_image)
  const [operationCountry, setOperationCountry] = useState(initial.operation_country)
  const [buyerCreditScore, setBuyerCreditScore] = useState(
    initial.buyer_credit_score != null ? String(initial.buyer_credit_score) : ''
  )
  const [supplierCreditScore, setSupplierCreditScore] = useState(
    initial.supplier_credit_score != null ? String(initial.supplier_credit_score) : ''
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    try {
      const res = await fetch('/api/marketplace/account/organization', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          brand_story: brandStory,
          logo_image: logoImage,
          operation_country: operationCountry,
          buyer_credit_score: buyerCreditScore.trim() ? Number(buyerCreditScore) : null,
          supplier_credit_score: supplierCreditScore.trim() ? Number(supplierCreditScore) : null,
        }),
      })
      const json: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const error =
          json && typeof json === 'object' && 'error' in json
            ? String((json as { error?: unknown }).error)
            : 'Request failed'
        toast({ title: 'Failed to update account', description: error, variant: 'error' })
        return
      }
      toast({ title: 'Organization account updated', variant: 'success' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Logo image URL</label>
        <Input
          value={logoImage}
          onChange={(e) => setLogoImage(e.target.value)}
          placeholder="https://..."
          disabled={!canEdit}
        />
        <div className="relative h-20 w-20 overflow-hidden rounded-md border">
          <Image
            src={logoImage.trim() || '/dummy-cabe.png'}
            alt="Organization logo"
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Operation location (country)</label>
        <Input
          value={operationCountry}
          onChange={(e) => setOperationCountry(e.target.value)}
          placeholder="e.g. Indonesia"
          disabled={!canEdit}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Buyer credit score (0-100)</label>
          <Input
            value={buyerCreditScore}
            onChange={(e) => setBuyerCreditScore(e.target.value)}
            placeholder="e.g. 78.5"
            inputMode="decimal"
            disabled={!canEditScores}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Supplier credit score (0-100)</label>
          <Input
            value={supplierCreditScore}
            onChange={(e) => setSupplierCreditScore(e.target.value)}
            placeholder="e.g. 84"
            inputMode="decimal"
            disabled={!canEditScores}
          />
        </div>
      </div>
      {!canEditScores ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Credit score is managed by platform superadmin.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              toast({
                title: 'Credit score review requested',
                description:
                  'Your request has been noted. Please follow up with the platform superadmin.',
              })
            }
          >
            Request score review
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Organization description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short profile"
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Brand story</label>
        <Textarea
          value={brandStory}
          onChange={(e) => setBrandStory(e.target.value)}
          placeholder="Tell your brand story"
          disabled={!canEdit}
        />
      </div>

      {canEdit ? (
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only organization admin/manager (or platform superadmin) can edit this section.
        </p>
      )}
    </form>
  )
}
