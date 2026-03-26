'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ProfileResult = {
  id: string
  name: string
  organization_id: string | null
  role: string
  is_platform_superadmin: boolean
  is_supplier: boolean
  is_buyer: boolean
  account_class: string
}

export function ProfileFlagsEditor() {
  const [email, setEmail] = useState('')
  const [isSupplier, setIsSupplier] = useState(false)
  const [isBuyer, setIsBuyer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProfileResult | null>(null)

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && (isSupplier || isBuyer || (!isSupplier && !isBuyer))
  }, [email, isBuyer, isSupplier])

  const handleSave = async () => {
    setError(null)
    setResult(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/profile-flags', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          is_supplier: isSupplier,
          is_buyer: isBuyer,
        }),
      })

      const data: unknown = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof data === 'object' && data && 'error' in data
            ? String((data as { error?: unknown }).error)
            : 'Request failed'
        setError(msg)
        return
      }

      const profile =
        typeof data === 'object' && data && 'profile' in data
          ? (data as { profile: ProfileResult }).profile
          : null
      setResult(profile)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 className="text-lg font-medium">User role flags</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update <span className="font-mono">profiles.is_supplier</span> and{' '}
          <span className="font-mono">profiles.is_buyer</span> by email (superadmin only).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">User email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Flags</label>
          <div className="flex flex-wrap gap-4 rounded-lg border px-3 py-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isSupplier}
                onChange={(e) => setIsSupplier(e.target.checked)}
              />
              Supplier
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isBuyer}
                onChange={(e) => setIsBuyer(e.target.checked)}
              />
              Buyer
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: you can enable both for “supplier + buyer” accounts.
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
          <div className="font-medium">Updated profile</div>
          <div className="mt-1 text-muted-foreground">
            id: <span className="font-mono">{result.id}</span>
          </div>
          <div className="text-muted-foreground">name: {result.name}</div>
          <div className="text-muted-foreground">org: {result.organization_id ?? 'none'}</div>
          <div className="text-muted-foreground">
            flags: supplier={String(result.is_supplier)} buyer={String(result.is_buyer)} class={result.account_class}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" onClick={handleSave} disabled={!canSubmit || submitting}>
          {submitting ? 'Saving…' : 'Save flags'}
        </Button>
      </div>
    </div>
  )
}

