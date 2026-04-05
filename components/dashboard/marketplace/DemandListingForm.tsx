'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import type { FormEvent } from 'react'

type ProductRow = {
  id: string
  name: string
  unit: string
}

type ProductUnit = 'kg' | 'ton' | 'liter' | 'pcs'

type DemandListingStatus =
  | 'draft'
  | 'active'
  | 'receiving_quotes'
  | 'negotiating'
  | 'finalized'
  | 'closed'

type DemandListingEdit = {
  id: string
  product_id: string
  required_quantity: number | null
  required_by: string | null
  price_range_from: number | null
  price_range_to: number | null
  specifications: Record<string, unknown>
  certifications_required: string[]
  target_location: string | null
  incoterms: string | null
  image_url: string | null
  is_open_for_bidding: boolean
  status: DemandListingStatus | null
}

type Props = {
  mode: 'create' | 'edit'
  products: ProductRow[]
  canCreateProducts?: boolean
  initial?: DemandListingEdit
  backHref?: string
  successRedirectPath?: string
}

const ADD_NEW_PRODUCT_VALUE = '__add_new_product__'
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_TO_UNDEFINED = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const demandListingFormSchema = z
  .object({
    productId: z.string().min(1, 'Produk wajib dipilih'),
    requiredQuantity: z
      .string()
      .min(1, 'Jumlah yang dibutuhkan wajib diisi')
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
        message: 'Jumlah yang dibutuhkan harus > 0',
      }),
    requiredBy: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v.length === 0 || DATE_FORMAT_REGEX.test(v), {
        message: 'Tanggal harus berformat YYYY-MM-DD',
      }),
    priceFrom: z
      .string()
      .transform(EMPTY_TO_UNDEFINED)
      .optional()
      .refine((v) => v === undefined || (Number.isFinite(Number(v)) && Number(v) >= 0), {
        message: 'Rentang harga dari harus angka >= 0',
      }),
    priceTo: z
      .string()
      .transform(EMPTY_TO_UNDEFINED)
      .optional()
      .refine((v) => v === undefined || (Number.isFinite(Number(v)) && Number(v) >= 0), {
        message: 'Rentang harga sampai harus angka >= 0',
      }),
    status: z.enum([
      'draft',
      'active',
      'receiving_quotes',
      'negotiating',
      'finalized',
      'closed',
    ]),
    targetLocation: z.string().optional(),
    incoterms: z.string().optional(),
    imageUrl: z
      .string()
      .min(1, 'Gambar wajib diunggah')
      .refine((v) => /^https?:\/\//.test(v), {
        message: 'URL gambar tidak valid',
      }),
    openForBidding: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.productId === ADD_NEW_PRODUCT_VALUE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'Produk wajib dipilih',
      })
    }

    if (values.priceFrom && values.priceTo && Number(values.priceTo) < Number(values.priceFrom)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['priceTo'],
        message: 'Rentang harga sampai harus >= rentang harga dari',
      })
    }
  })

function certsToText(certs: string[] | null | undefined): string {
  return (certs ?? []).join(', ')
}

function jsonToKeyValueText(v: Record<string, unknown> | null | undefined): string {
  const obj = v ?? {}
  return Object.entries(obj)
    .map(([k, val]) => {
      if (val == null) return `${k}:`
      if (typeof val === 'object') return `${k}: ${JSON.stringify(val)}`
      return `${k}: ${String(val)}`
    })
    .join('\n')
}

function parseSpecificationsKeyValue(text: string): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const lines = text.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    // Skip obvious separators / comment lines
    if (line.startsWith('#') || line.startsWith('//')) continue

    let key = ''
    let valuePart = ''
    if (line.includes(':')) {
      const idx = line.indexOf(':')
      key = line.slice(0, idx).trim()
      valuePart = line.slice(idx + 1).trim()
    } else if (line.includes('=')) {
      const idx = line.indexOf('=')
      key = line.slice(0, idx).trim()
      valuePart = line.slice(idx + 1).trim()
    } else {
      // Line without a delimiter is ignored to keep this forgiving.
      continue
    }

    if (!key) continue

    // Try to normalize primitives so the JSONB stays useful.
    if (valuePart === '') {
      out[key] = ''
    } else if (valuePart === 'true') {
      out[key] = true
    } else if (valuePart === 'false') {
      out[key] = false
    } else {
      const n = Number(valuePart)
      if (Number.isFinite(n) && String(n) === valuePart) out[key] = n
      else out[key] = valuePart
    }
  }

  return out
}

export function DemandListingForm({
  mode,
  products,
  initial,
  canCreateProducts,
  backHref = '/dashboard/marketplace/demand',
  successRedirectPath = '/dashboard/marketplace/demand',
}: Props) {
  const router = useRouter()

  const [productOptions, setProductOptions] = useState<ProductRow[]>(products)
  const [productId, setProductId] = useState(initial?.product_id ?? (products[0]?.id ?? ''))
  const [previousProductId, setPreviousProductId] = useState<string>(
    initial?.product_id ?? (products[0]?.id ?? '')
  )
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [newProductUnit, setNewProductUnit] = useState<ProductUnit>('kg')
  const [newProductIsRawMaterial, setNewProductIsRawMaterial] = useState(false)
  const [requiredQuantity, setRequiredQuantity] = useState<string>(
    initial?.required_quantity != null ? String(initial.required_quantity) : ''
  )
  const [requiredBy, setRequiredBy] = useState<string>(initial?.required_by ?? '')
  const [priceFrom, setPriceFrom] = useState<string>(
    initial?.price_range_from != null ? String(initial.price_range_from) : ''
  )
  const [priceTo, setPriceTo] = useState<string>(
    initial?.price_range_to != null ? String(initial.price_range_to) : ''
  )
  const [specificationsText, setSpecificationsText] = useState<string>(
    jsonToKeyValueText(initial?.specifications)
  )
  const [certificationsRequiredText, setCertificationsRequiredText] = useState<string>(
    certsToText(initial?.certifications_required)
  )
  const [targetLocation, setTargetLocation] = useState<string>(initial?.target_location ?? '')
  const [incoterms, setIncoterms] = useState<string>(initial?.incoterms ?? '')
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url ?? '')
  const [openForBidding, setOpenForBidding] = useState<boolean>(
    initial?.is_open_for_bidding ?? true
  )
  const [status, setStatus] = useState<DemandListingStatus>(
    initial?.status ?? (mode === 'create' ? 'active' : 'draft')
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)

  const specsPlaceholder = 'grade: A\nkemasan: peti 10kg\nasal: Indonesia'
  const getFieldError = (field: string) => fieldErrors[field]

  const handleUploadImage = async (file: File) => {
    setImageUploadError(null)
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'marketplace/demand')

      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      })

      const data = (await res.json().catch(() => ({}))) as {
        secure_url?: string
        error?: string
      }

      if (!res.ok || !data.secure_url) {
        setImageUploadError('Gagal mengunggah gambar. Coba lagi.')
        return
      }

      setImageUrl(data.secure_url)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const submitLabel = useMemo(() => {
    return mode === 'create' ? 'Buat listing permintaan' : 'Perbarui listing permintaan'
  }, [mode])

  useEffect(() => {
    setProductOptions(products)
  }, [products])

  const handleCreateProduct = async () => {
    if (!canCreateProducts) {
      alert('Anda tidak memiliki izin untuk membuat produk.')
      return
    }

    const name = newProductName.trim()
    if (!name) return alert('Nama produk wajib diisi')

    setIsCreatingProduct(true)
    try {
      const res = await fetch('/api/marketplace/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          unit: newProductUnit,
          category: 'other',
          is_raw_material: newProductIsRawMaterial,
        }),
      })

      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String((data as { error?: unknown }).error)
            : 'Permintaan gagal'
        alert(msg)
        return
      }

      const created = (data as { product?: { id: string; name: string; unit: string } }).product
        ? (data as { product: { id: string; name: string; unit: string } }).product
        : (data as { id: string; name: string; unit: string })
      if (!created?.id) return alert('Produk dibuat, tetapi ID tidak dikembalikan.')

      setProductOptions((prev) => {
        if (prev.some((p) => p.id === created.id)) return prev
        return [...prev, created]
      })
      setProductId(created.id)
      setPreviousProductId(created.id)
      setShowAddProduct(false)
      setNewProductName('')
      setNewProductIsRawMaterial(false)
      setNewProductUnit('kg')
    } finally {
      setIsCreatingProduct(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setSubmitError(null)
    setFieldErrors({})

    const parsed = demandListingFormSchema.safeParse({
      productId,
      requiredQuantity,
      requiredBy,
      priceFrom,
      priceTo,
      status,
      targetLocation,
      incoterms,
      imageUrl,
      openForBidding,
    })

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors
      const nextErrors: Record<string, string> = {}
      for (const [key, values] of Object.entries(flattened)) {
        if (values && values.length > 0 && typeof values[0] === 'string') {
          nextErrors[key] = values[0]
        }
      }
      setFieldErrors(nextErrors)
      setSubmitError('Periksa kembali form sebelum menyimpan.')
      return
    }
    setIsSubmitting(true)

    try {
      const specsObj = parseSpecificationsKeyValue(specificationsText)

      const certs = certificationsRequiredText
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)

      const payload: Record<string, unknown> = {
        product_id: parsed.data.productId,
        required_quantity: Number(parsed.data.requiredQuantity),
        required_by: parsed.data.requiredBy ? parsed.data.requiredBy : null,
        price_range_from: parsed.data.priceFrom != null ? Number(parsed.data.priceFrom) : null,
        price_range_to: parsed.data.priceTo != null ? Number(parsed.data.priceTo) : null,
        specifications: specsObj,
        certifications_required: certs,
        target_location: parsed.data.targetLocation?.trim() ? parsed.data.targetLocation.trim() : null,
        incoterms: parsed.data.incoterms?.trim() ? parsed.data.incoterms.trim() : null,
        image_url: parsed.data.imageUrl?.trim() ? parsed.data.imageUrl.trim() : null,
        is_open_for_bidding: parsed.data.openForBidding,
        status: parsed.data.status,
      }

      const res = await fetch(
        mode === 'create' ? '/api/marketplace/demand' : `/api/marketplace/demand/${initial?.id}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String((data as { error?: unknown }).error)
            : 'Permintaan gagal'
        setSubmitError(msg)
        return
      }

      router.replace(successRedirectPath)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!initial?.id) return
    if (!confirm('Hapus listing permintaan ini?')) return

    const res = await fetch(`/api/marketplace/demand/${initial.id}`, {
      method: 'DELETE',
    })
    const data: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error?: unknown }).error)
          : 'Permintaan gagal'
      alert(msg)
      return
    }

    router.push(successRedirectPath)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Kembali ke daftar permintaan
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Produk</label>
            <Select
              key={productId}
              defaultValue={productId}
              onValueChange={(v) => {
                if (v === ADD_NEW_PRODUCT_VALUE) {
                  if (!canCreateProducts) return alert('Anda tidak memiliki izin untuk membuat produk.')
                  if (productId !== ADD_NEW_PRODUCT_VALUE) {
                    setPreviousProductId(productId)
                  }
                  setShowAddProduct(true)
                  setProductId(ADD_NEW_PRODUCT_VALUE)
                  return
                }
                setPreviousProductId(v)
                setShowAddProduct(false)
                setProductId(v)
              }}
            >
              <SelectTrigger className="w-full min-w-0" size="default">
                <SelectValue placeholder="Pilih produk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ADD_NEW_PRODUCT_VALUE} disabled={!canCreateProducts}>
                  {canCreateProducts ? '+ Tambah produk baru...' : 'Produk dikelola platform'}
                </SelectItem>
                {productOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getFieldError('productId') ? (
              <p className="text-xs text-destructive">{getFieldError('productId')}</p>
            ) : null}

            {showAddProduct && (
              <div className="mt-3 space-y-3 rounded-md border bg-background p-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nama produk baru</label>
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="mis. Kopi organik"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Satuan</label>
                  <select
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value as ProductUnit)}
                  >
                    {(['kg', 'ton', 'liter', 'pcs'] as const).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={newProductIsRawMaterial}
                    onChange={(e) => setNewProductIsRawMaterial(e.target.checked)}
                    aria-label="Bahan baku"
                  />
                  <span className="text-sm text-muted-foreground">
                    {newProductIsRawMaterial ? 'Bahan baku' : 'Produk jadi'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowAddProduct(false)
                      setProductId(previousProductId)
                    }}
                  >
                    Batal
                  </Button>
                  <Button type="button" onClick={handleCreateProduct} disabled={isCreatingProduct}>
                    {isCreatingProduct ? 'Membuat...' : 'Buat produk'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={status}
              onChange={(e) => setStatus(e.target.value as DemandListingStatus)}
            >
              {(
                [
                  'draft',
                  'active',
                  'receiving_quotes',
                  'negotiating',
                  'finalized',
                  'closed',
                ] as const
              ).map((s) => (
                <option key={s} value={s}>
                  {s === 'draft'
                    ? 'Draf'
                    : s === 'active'
                      ? 'Aktif'
                      : s === 'receiving_quotes'
                        ? 'Menerima penawaran'
                        : s === 'negotiating'
                          ? 'Negosiasi'
                          : s === 'finalized'
                            ? 'Final'
                            : 'Ditutup'}
                </option>
              ))}
            </select>
            {getFieldError('status') ? (
              <p className="text-xs text-destructive">{getFieldError('status')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah yang dibutuhkan</label>
            <Input
              type="number"
              min={1}
              step="any"
              inputMode="decimal"
              value={requiredQuantity}
              onChange={(e) => setRequiredQuantity(e.target.value)}
              placeholder="mis. 200"
            />
            {getFieldError('requiredQuantity') ? (
              <p className="text-xs text-destructive">{getFieldError('requiredQuantity')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dibutuhkan pada</label>
            <DatePicker value={requiredBy} onChange={setRequiredBy} placeholder="YYYY-MM-DD" />
            {getFieldError('requiredBy') ? (
              <p className="text-xs text-destructive">{getFieldError('requiredBy')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rentang harga dari</label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              placeholder="opsional"
            />
            {getFieldError('priceFrom') ? (
              <p className="text-xs text-destructive">{getFieldError('priceFrom')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Rentang harga sampai</label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              placeholder="opsional"
            />
            {getFieldError('priceTo') ? (
              <p className="text-xs text-destructive">{getFieldError('priceTo')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sertifikasi wajib (pisahkan koma)</label>
            <Input
              value={certificationsRequiredText}
              onChange={(e) => setCertificationsRequiredText(e.target.value)}
              placeholder="mis. ISO, Halal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lokasi tujuan</label>
            <Input value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="mis. Mandalika" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Incoterms</label>
            <Input value={incoterms} onChange={(e) => setIncoterms(e.target.value)} placeholder="FOB, CIF, ..." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Upload gambar (wajib)</label>
            <div className="space-y-2 rounded-md border border-dashed border-border px-3 py-3">
              <label className="text-xs text-muted-foreground">
                Pilih gambar untuk diunggah
              </label>
              <Input
                type="file"
                accept="image/*"
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
              {imageUrl ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Gambar terunggah.</p>
                  <div className="relative aspect-16/10 w-full max-w-md overflow-hidden rounded-md border bg-muted/30">
                    <Image
                      src={imageUrl}
                      alt="Preview gambar listing permintaan"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 420px"
                    />
                  </div>
                </div>
              ) : null}
            </div>
            {getFieldError('imageUrl') ? (
              <p className="text-xs text-destructive">{getFieldError('imageUrl')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Terbuka untuk penawaran</label>
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                checked={openForBidding}
                onChange={(e) => setOpenForBidding(e.target.checked)}
                aria-label="Terbuka untuk penawaran"
              />
              <span className="text-sm text-muted-foreground">
                {openForBidding ? 'Terbuka' : 'Ditutup'}
              </span>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Spesifikasi (kunci:nilai per baris)</label>
            <textarea
              className="min-h-[96px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={specificationsText}
              onChange={(e) => setSpecificationsText(e.target.value)}
              placeholder={specsPlaceholder}
            />
          </div>
        </div>

        {submitError ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting || isUploadingImage}>
            {isSubmitting ? 'Menyimpan...' : submitLabel}
          </Button>
          {mode === 'edit' && initial?.id ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive"
              onClick={handleDelete}
            >
              Hapus
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

