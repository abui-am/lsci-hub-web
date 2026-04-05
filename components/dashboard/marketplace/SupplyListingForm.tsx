'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

type ProductRow = {
  id: string
  name: string
  unit: string
}

type ProductUnit = 'kg' | 'ton' | 'liter' | 'pcs'

type SupplyListingFormMode = 'create' | 'edit'

type SupplyListingEdit = {
  id: string
  product_id: string
  quantity: number | null
  price_estimate: number | null
  min_order_quantity: number | null
  lead_time_days: number | null
  export_capability: boolean
  price_type: 'fixed' | 'negotiable' | null
  certifications: string[]
  available_from: string | null
  available_until: string | null
  image_url: string | null
  supplier_location: string | null
  expiration_date: string | null
  status: 'active' | 'matched' | 'closed' | null
}

type Props = {
  mode: SupplyListingFormMode
  products: ProductRow[]
  canCreateProducts?: boolean
  initial?: SupplyListingEdit
  backHref?: string
  successRedirectPath?: string
}

function toCertText(certs: string[] | null | undefined): string {
  return (certs ?? []).join(', ')
}

const ADD_NEW_PRODUCT_VALUE = '__add_new_product__'
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_TO_UNDEFINED = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const supplyListingFormSchema = z
  .object({
    productId: z.string().min(1, 'Produk wajib dipilih'),
    quantity: z
      .string()
      .min(1, 'Jumlah wajib diisi')
      .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, {
        message: 'Jumlah harus > 0',
      }),
    priceEstimate: z
      .string()
      .transform(EMPTY_TO_UNDEFINED)
      .optional()
      .refine((v) => v === undefined || (Number.isFinite(Number(v)) && Number(v) >= 0), {
        message: 'Perkiraan harga harus angka >= 0',
      }),
    minOrderQty: z
      .string()
      .transform(EMPTY_TO_UNDEFINED)
      .optional()
      .refine((v) => v === undefined || (Number.isFinite(Number(v)) && Number(v) >= 0), {
        message: 'MOQ harus angka >= 0',
      }),
    leadTimeDays: z
      .string()
      .transform(EMPTY_TO_UNDEFINED)
      .optional()
      .refine((v) => v === undefined || (Number.isFinite(Number(v)) && Number(v) >= 0), {
        message: 'Lead time harus angka >= 0',
      }),
    availableFrom: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v.length === 0 || DATE_FORMAT_REGEX.test(v), {
        message: 'Tanggal harus berformat YYYY-MM-DD',
      }),
    availableUntil: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v.length === 0 || DATE_FORMAT_REGEX.test(v), {
        message: 'Tanggal harus berformat YYYY-MM-DD',
      }),
    expirationDate: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v.length === 0 || DATE_FORMAT_REGEX.test(v), {
        message: 'Tanggal harus berformat YYYY-MM-DD',
      }),
    status: z.enum(['active', 'matched', 'closed']),
    priceType: z.enum(['fixed', 'negotiable']),
    exportCapability: z.boolean(),
    imageUrl: z
      .string()
      .min(1, 'Gambar wajib diunggah')
      .refine((v) => /^https?:\/\//.test(v), {
        message: 'URL gambar tidak valid',
      }),
    supplierLocation: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.productId === ADD_NEW_PRODUCT_VALUE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'Produk wajib dipilih',
      })
    }
    if (values.availableFrom && values.availableUntil && values.availableUntil < values.availableFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['availableUntil'],
        message: 'Tersedia hingga harus sama atau setelah tersedia dari',
      })
    }
  })

export function SupplyListingForm({
  mode,
  products,
  initial,
  canCreateProducts,
  backHref = '/dashboard/marketplace/supply',
  successRedirectPath = '/dashboard/marketplace/supply',
}: Props) {
  const router = useRouter()

  const [productOptions, setProductOptions] = useState<ProductRow[]>(products)
  const [productId, setProductId] = useState(initial?.product_id ?? (products[0]?.id ?? ''))
  const [previousProductId, setPreviousProductId] = useState(
    initial?.product_id ?? (products[0]?.id ?? '')
  )
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)

  const [newProductName, setNewProductName] = useState('')
  const [newProductUnit, setNewProductUnit] = useState<ProductUnit>('kg')
  const [newProductIsRawMaterial, setNewProductIsRawMaterial] = useState(false)
  const [quantity, setQuantity] = useState<string>(
    initial?.quantity != null ? String(initial.quantity) : ''
  )
  const [priceEstimate, setPriceEstimate] = useState<string>(
    initial?.price_estimate != null ? String(initial.price_estimate) : ''
  )
  const [minOrderQty, setMinOrderQty] = useState<string>(
    initial?.min_order_quantity != null ? String(initial.min_order_quantity) : ''
  )
  const [leadTimeDays, setLeadTimeDays] = useState<string>(
    initial?.lead_time_days != null ? String(initial.lead_time_days) : ''
  )
  const [exportCapability, setExportCapability] = useState<boolean>(
    initial?.export_capability ?? false
  )
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable'>(
    initial?.price_type === 'fixed' ? 'fixed' : 'negotiable'
  )
  const [certificationsText, setCertificationsText] = useState<string>(
    toCertText(initial?.certifications)
  )
  const [availableFrom, setAvailableFrom] = useState<string>(
    initial?.available_from ?? ''
  )
  const [availableUntil, setAvailableUntil] = useState<string>(
    initial?.available_until ?? ''
  )
  const [imageUrl, setImageUrl] = useState<string>(initial?.image_url ?? '')
  const [supplierLocation, setSupplierLocation] = useState<string>(
    initial?.supplier_location ?? ''
  )
  const [expirationDate, setExpirationDate] = useState<string>(
    initial?.expiration_date ?? ''
  )
  const [status, setStatus] = useState<'active' | 'matched' | 'closed'>(
    initial?.status ?? 'active'
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)

  const canDelete = mode === 'edit' && initial?.id
  const getFieldError = (field: string) => fieldErrors[field]

  const handleUploadImage = async (file: File) => {
    setImageUploadError(null)
    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'marketplace/supply')

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
    return mode === 'create' ? 'Buat listing pasokan' : 'Perbarui listing pasokan'
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
    setSubmitError(null)
    setFieldErrors({})

    const parsed = supplyListingFormSchema.safeParse({
      productId,
      quantity,
      priceEstimate,
      minOrderQty,
      leadTimeDays,
      availableFrom,
      availableUntil,
      expirationDate,
      status,
      priceType,
      exportCapability,
      imageUrl,
      supplierLocation,
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

    const payload: Record<string, unknown> = {
      product_id: parsed.data.productId,
      quantity: Number(parsed.data.quantity),
      price_estimate: parsed.data.priceEstimate != null ? Number(parsed.data.priceEstimate) : null,
      min_order_quantity: parsed.data.minOrderQty != null ? Number(parsed.data.minOrderQty) : null,
      lead_time_days: parsed.data.leadTimeDays != null ? Number(parsed.data.leadTimeDays) : null,
      export_capability: parsed.data.exportCapability,
      price_type: parsed.data.priceType,
      certifications: certificationsText,
      available_from: parsed.data.availableFrom ? parsed.data.availableFrom : null,
      available_until: parsed.data.availableUntil ? parsed.data.availableUntil : null,
      image_url: parsed.data.imageUrl?.trim() ? parsed.data.imageUrl.trim() : null,
      supplier_location: parsed.data.supplierLocation?.trim() ? parsed.data.supplierLocation.trim() : null,
      expiration_date: parsed.data.expirationDate ? parsed.data.expirationDate : null,
      status: parsed.data.status,
    }

    const res = await fetch(
      mode === 'create' ? '/api/marketplace/supply' : `/api/marketplace/supply/${initial?.id}`,
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

    router.push(successRedirectPath)
    router.refresh()
  }

  const handleDelete = async () => {
    if (!initial?.id) return
    if (!confirm('Hapus listing pasokan ini?')) return

    const res = await fetch(`/api/marketplace/supply/${initial.id}`, {
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
          Kembali ke daftar pasokan
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
              onChange={(e) => setStatus(e.target.value as 'active' | 'matched' | 'closed')}
            >
              {(['active', 'matched', 'closed'] as const).map((s) => (
                <option key={s} value={s}>
                  {s === 'active' ? 'Aktif' : s === 'matched' ? 'Sepadan' : 'Ditutup'}
                </option>
              ))}
            </select>
            {getFieldError('status') ? (
              <p className="text-xs text-destructive">{getFieldError('status')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah</label>
            <Input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="mis. 500"
            />
            {getFieldError('quantity') ? (
              <p className="text-xs text-destructive">{getFieldError('quantity')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jenis harga</label>
            <select
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as 'fixed' | 'negotiable')}
            >
              {(['negotiable', 'fixed'] as const).map((s) => (
                <option key={s} value={s}>
                  {s === 'fixed' ? 'Tetap' : 'Dapat dinegosiasikan'}
                </option>
              ))}
            </select>
            {getFieldError('priceType') ? (
              <p className="text-xs text-destructive">{getFieldError('priceType')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Perkiraan harga</label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={priceEstimate}
              onChange={(e) => setPriceEstimate(e.target.value)}
              placeholder="opsional"
            />
            {getFieldError('priceEstimate') ? (
              <p className="text-xs text-destructive">{getFieldError('priceEstimate')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah pesanan minimum (MOQ)</label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={minOrderQty}
              onChange={(e) => setMinOrderQty(e.target.value)}
              placeholder="opsional"
            />
            {getFieldError('minOrderQty') ? (
              <p className="text-xs text-destructive">{getFieldError('minOrderQty')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lead time (hari)</label>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              placeholder="opsional"
            />
            {getFieldError('leadTimeDays') ? (
              <p className="text-xs text-destructive">{getFieldError('leadTimeDays')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Kemampuan ekspor</label>
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                checked={exportCapability}
                onChange={(e) => setExportCapability(e.target.checked)}
                aria-label="Kemampuan ekspor"
              />
              <span className="text-sm text-muted-foreground">{exportCapability ? 'Ya' : 'Tidak'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Sertifikasi (pisahkan koma)</label>
            <Input value={certificationsText} onChange={(e) => setCertificationsText(e.target.value)} placeholder="ISO, Halal" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tersedia dari</label>
            <DatePicker value={availableFrom} onChange={setAvailableFrom} placeholder="YYYY-MM-DD" />
            {getFieldError('availableFrom') ? (
              <p className="text-xs text-destructive">{getFieldError('availableFrom')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tersedia hingga</label>
            <DatePicker value={availableUntil} onChange={setAvailableUntil} placeholder="YYYY-MM-DD" />
            {getFieldError('availableUntil') ? (
              <p className="text-xs text-destructive">{getFieldError('availableUntil')}</p>
            ) : null}
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
                <p className="text-xs text-muted-foreground">Gambar terunggah.</p>
              ) : null}
            </div>
            {getFieldError('imageUrl') ? (
              <p className="text-xs text-destructive">{getFieldError('imageUrl')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lokasi pemasok</label>
            <Input
              value={supplierLocation}
              onChange={(e) => setSupplierLocation(e.target.value)}
              placeholder="mis. Surabaya, Indonesia"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tanggal kedaluwarsa</label>
            <DatePicker value={expirationDate} onChange={setExpirationDate} placeholder="YYYY-MM-DD" />
            {getFieldError('expirationDate') ? (
              <p className="text-xs text-destructive">{getFieldError('expirationDate')}</p>
            ) : null}
          </div>
        </div>

        {submitError ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{submitLabel}</Button>
          {canDelete ? (
            <Button type="button" variant="outline" className="border-destructive text-destructive" onClick={handleDelete}>
              Hapus
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

