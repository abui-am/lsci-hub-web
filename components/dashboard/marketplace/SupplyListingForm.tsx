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
  status: 'active' | 'matched' | 'closed' | null
}

type Props = {
  mode: SupplyListingFormMode
  products: ProductRow[]
  canCreateProducts?: boolean
  initial?: SupplyListingEdit
}

function toCertText(certs: string[] | null | undefined): string {
  return (certs ?? []).join(', ')
}

const ADD_NEW_PRODUCT_VALUE = '__add_new_product__'

export function SupplyListingForm({ mode, products, initial, canCreateProducts }: Props) {
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
  const [status, setStatus] = useState<'active' | 'matched' | 'closed'>(
    initial?.status ?? 'active'
  )

  const canDelete = mode === 'edit' && initial?.id

  const submitLabel = useMemo(() => {
    return mode === 'create' ? 'Create supply listing' : 'Update supply listing'
  }, [mode])

  useEffect(() => {
    setProductOptions(products)
  }, [products])

  const handleCreateProduct = async () => {
    if (!canCreateProducts) {
      alert('You do not have permission to create products.')
      return
    }

    const name = newProductName.trim()
    if (!name) return alert('Product name is required')

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
            : 'Request failed'
        alert(msg)
        return
      }

      const created = (data as { product?: { id: string; name: string; unit: string } }).product
        ? (data as { product: { id: string; name: string; unit: string } }).product
        : (data as { id: string; name: string; unit: string })
      if (!created?.id) return alert('Product created, but no id returned.')

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
    if (!productId || productId === ADD_NEW_PRODUCT_VALUE) return alert('Product is required')
    if (!Number.isFinite(quantityN) || quantityN <= 0) return alert('Quantity must be > 0')

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
          : 'Request failed'
      alert(msg)
      return
    }

    router.push('/dashboard/marketplace/supply')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!initial?.id) return
    if (!confirm('Delete this supply listing?')) return

    const res = await fetch(`/api/marketplace/supply/${initial.id}`, {
      method: 'DELETE',
    })
    const data: unknown = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error?: unknown }).error)
          : 'Request failed'
      alert(msg)
      return
    }

    router.push('/dashboard/marketplace/supply')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/marketplace/supply"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to supply listings
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product</label>
            <Select
              key={productId}
              defaultValue={productId}
              onValueChange={(v) => {
                if (v === ADD_NEW_PRODUCT_VALUE) {
                  if (!canCreateProducts) return alert('You do not have permission to create products.')
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
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ADD_NEW_PRODUCT_VALUE} disabled={!canCreateProducts}>
                  {canCreateProducts ? '+ Add new product...' : 'Products managed by platform'}
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
                  <label className="text-sm font-medium">New product name</label>
                  <Input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g. Organic coffee"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Unit</label>
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
                    aria-label="Raw material"
                  />
                  <span className="text-sm text-muted-foreground">
                    {newProductIsRawMaterial ? 'Raw material' : 'Finished product'}
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
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleCreateProduct} disabled={isCreatingProduct}>
                    {isCreatingProduct ? 'Creating...' : 'Create product'}
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
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 500" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price type</label>
            <select
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={priceType}
              onChange={(e) => setPriceType(e.target.value as 'fixed' | 'negotiable')}
            >
              {(['negotiable', 'fixed'] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price estimate</label>
            <Input value={priceEstimate} onChange={(e) => setPriceEstimate(e.target.value)} placeholder="optional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Min order quantity</label>
            <Input value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)} placeholder="optional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lead time (days)</label>
            <Input value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} placeholder="optional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Export capability</label>
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                checked={exportCapability}
                onChange={(e) => setExportCapability(e.target.checked)}
                aria-label="Export capability"
              />
              <span className="text-sm text-muted-foreground">{exportCapability ? 'Yes' : 'No'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Certifications (comma separated)</label>
            <Input value={certificationsText} onChange={(e) => setCertificationsText(e.target.value)} placeholder="ISO, Halal" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Available from</label>
            <Input value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Available until</label>
            <Input value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{submitLabel}</Button>
          {canDelete ? (
            <Button type="button" variant="outline" className="border-destructive text-destructive" onClick={handleDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

