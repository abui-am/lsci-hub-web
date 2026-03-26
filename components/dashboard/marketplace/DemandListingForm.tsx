'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  is_open_for_bidding: boolean
  status: DemandListingStatus | null
}

type Props = {
  mode: 'create' | 'edit'
  products: ProductRow[]
  canCreateProducts?: boolean
  initial?: DemandListingEdit
}

const ADD_NEW_PRODUCT_VALUE = '__add_new_product__'

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

export function DemandListingForm({ mode, products, initial, canCreateProducts }: Props) {
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
  const [openForBidding, setOpenForBidding] = useState<boolean>(
    initial?.is_open_for_bidding ?? true
  )
  const [status, setStatus] = useState<DemandListingStatus>(
    initial?.status ?? (mode === 'create' ? 'active' : 'draft')
  )

  const specsPlaceholder = 'grade: A\npackaging: 10kg crates\norigin: Indonesia'

  const submitLabel = useMemo(() => {
    return mode === 'create' ? 'Create demand listing' : 'Update demand listing'
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

    const requiredQtyN = Number(requiredQuantity)
    if (!productId || productId === ADD_NEW_PRODUCT_VALUE) return alert('Product is required')
    if (!Number.isFinite(requiredQtyN) || requiredQtyN <= 0)
      return alert('Required quantity must be > 0')

    const specsObj = parseSpecificationsKeyValue(specificationsText)

    const certs = certificationsRequiredText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)

    const payload: Record<string, unknown> = {
      product_id: productId,
      required_quantity: requiredQtyN,
      required_by: requiredBy.trim() ? requiredBy : null,
      price_range_from: priceFrom.trim() ? Number(priceFrom) : null,
      price_range_to: priceTo.trim() ? Number(priceTo) : null,
      specifications: specsObj,
      certifications_required: certs,
      target_location: targetLocation.trim() ? targetLocation.trim() : null,
      incoterms: incoterms.trim() ? incoterms.trim() : null,
      is_open_for_bidding: openForBidding,
      status,
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
          : 'Request failed'
      alert(msg)
      return
    }

    router.push('/dashboard/marketplace/demand')
    router.refresh()
  }

  const handleDelete = async () => {
    if (!initial?.id) return
    if (!confirm('Delete this demand listing?')) return

    const res = await fetch(`/api/marketplace/demand/${initial.id}`, {
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

    router.push('/dashboard/marketplace/demand')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/marketplace/demand"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to demand listings
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
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Required quantity</label>
            <Input
              value={requiredQuantity}
              onChange={(e) => setRequiredQuantity(e.target.value)}
              placeholder="e.g. 200"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Required by</label>
            <Input value={requiredBy} onChange={(e) => setRequiredBy(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price range from</label>
            <Input value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder="optional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price range to</label>
            <Input value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder="optional" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Certifications required (comma separated)</label>
            <Input
              value={certificationsRequiredText}
              onChange={(e) => setCertificationsRequiredText(e.target.value)}
              placeholder="e.g. ISO, Halal"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target location</label>
            <Input value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. Mandalika" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Incoterms</label>
            <Input value={incoterms} onChange={(e) => setIncoterms(e.target.value)} placeholder="FOB, CIF, ..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Open for bidding</label>
            <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <input
                type="checkbox"
                checked={openForBidding}
                onChange={(e) => setOpenForBidding(e.target.checked)}
                aria-label="Open for bidding"
              />
              <span className="text-sm text-muted-foreground">
                {openForBidding ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Specifications JSON</label>
            <textarea
              className="min-h-[96px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={specificationsText}
              onChange={(e) => setSpecificationsText(e.target.value)}
              placeholder={specsPlaceholder}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit">{submitLabel}</Button>
          {mode === 'edit' && initial?.id ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive text-destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

