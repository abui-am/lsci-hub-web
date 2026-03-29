'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

  const canDelete = mode === 'edit' && initial?.id

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

    const quantityN = Number(quantity)
    if (!productId || productId === ADD_NEW_PRODUCT_VALUE) return alert('Produk wajib dipilih')
    if (!Number.isFinite(quantityN) || quantityN <= 0) return alert('Jumlah harus > 0')

    const payload: Record<string, unknown> = {
      product_id: productId,
      quantity: quantityN,
      price_estimate: priceEstimate.trim() ? Number(priceEstimate) : null,
      min_order_quantity: minOrderQty.trim() ? Number(minOrderQty) : null,
      lead_time_days: leadTimeDays.trim() ? Number(leadTimeDays) : null,
      export_capability: exportCapability,
      price_type: priceType,
      certifications: certificationsText,
      available_from: availableFrom.trim() ? availableFrom : null,
      available_until: availableUntil.trim() ? availableUntil : null,
      image_url: imageUrl.trim() ? imageUrl.trim() : null,
      supplier_location: supplierLocation.trim() ? supplierLocation.trim() : null,
      expiration_date: expirationDate.trim() ? expirationDate.trim() : null,
      status,
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
      alert(msg)
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah</label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="mis. 500" />
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Perkiraan harga</label>
            <Input value={priceEstimate} onChange={(e) => setPriceEstimate(e.target.value)} placeholder="opsional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah pesanan minimum (MOQ)</label>
            <Input value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)} placeholder="opsional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lead time (hari)</label>
            <Input value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} placeholder="opsional" />
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
            <Input value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tersedia hingga</label>
            <Input value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">URL foto</label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/product.jpg"
            />
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
            <Input
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>

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

