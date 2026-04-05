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
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)

  const handleUploadImage = async (file: File) => {
    setImageUploadError(null)
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'marketplace/account')

      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      })

      const data = (await res.json().catch(() => ({}))) as {
        secure_url?: string
      }

      if (!res.ok || !data.secure_url) {
        setImageUploadError('Gagal mengunggah gambar. Coba lagi.')
        return
      }

      setLogoImage(data.secure_url)
    } finally {
      setIsUploadingImage(false)
    }
  }

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
            : 'Permintaan gagal'
        toast({ title: 'Gagal memperbarui akun', description: error, variant: 'error' })
        return
      }
      toast({ title: 'Akun organisasi diperbarui', variant: 'success' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nama organisasi</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Logo organisasi</label>
        <div className="space-y-2 rounded-md border border-dashed border-border px-3 py-3">
          <label className="text-xs text-muted-foreground">Pilih gambar logo untuk diunggah</label>
          <Input
            type="file"
            accept="image/*"
            disabled={!canEdit || isUploadingImage}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              void handleUploadImage(file)
            }}
          />
          {isUploadingImage ? (
            <p className="text-xs text-muted-foreground">Mengunggah gambar...</p>
          ) : null}
          {imageUploadError ? (
            <p className="text-xs text-destructive">{imageUploadError}</p>
          ) : null}
          {logoImage.trim() ? (
            <p className="text-xs text-muted-foreground">Logo terunggah.</p>
          ) : null}
        </div>
        <div className="relative h-20 w-20 overflow-hidden rounded-md border">
          <Image
            src={logoImage.trim() || '/dummy-cabe.png'}
            alt="Logo organisasi"
            fill
            className="object-cover"
            sizes="80px"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Lokasi operasi (negara)</label>
        <Input
          value={operationCountry}
          onChange={(e) => setOperationCountry(e.target.value)}
          placeholder="mis. Indonesia"
          disabled={!canEdit}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Skor kredit pembeli (0-100)</label>
          <Input
            value={buyerCreditScore}
            onChange={(e) => setBuyerCreditScore(e.target.value)}
            placeholder="mis. 78,5"
            inputMode="decimal"
            disabled={!canEditScores}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Skor kredit pemasok (0-100)</label>
          <Input
            value={supplierCreditScore}
            onChange={(e) => setSupplierCreditScore(e.target.value)}
            placeholder="mis. 84"
            inputMode="decimal"
            disabled={!canEditScores}
          />
        </div>
      </div>
      {!canEditScores ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Skor kredit dikelola oleh superadmin platform.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              toast({
                title: 'Permintaan tinjauan skor terkirim',
                description:
                  'Permintaan Anda telah dicatat. Silakan hubungi superadmin platform.',
              })
            }
          >
            Minta tinjauan skor
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Deskripsi organisasi</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Profil singkat"
          disabled={!canEdit}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Cerita merek</label>
        <Textarea
          value={brandStory}
          onChange={(e) => setBrandStory(e.target.value)}
          placeholder="Ceritakan merek Anda"
          disabled={!canEdit}
        />
      </div>

      {canEdit ? (
        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan perubahan'}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Hanya admin/manajer organisasi (atau superadmin platform) yang dapat mengedit bagian ini.
        </p>
      )}
    </form>
  )
}
