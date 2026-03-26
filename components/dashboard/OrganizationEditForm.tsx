'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { OrgSector, OrgType } from '@/lib/rbac/types'

type OrgVerificationStatus = 'pending' | 'verified'

type Props = {
  orgId: string
  canEdit: boolean
  canEditType: boolean
  initial: {
    name: string
    type: OrgType
    sector: OrgSector | null
    description: string | null
    verification_status: OrgVerificationStatus
  }
}

const sectorOptions: OrgSector[] = ['agriculture', 'tourism', 'processing', 'mining']
const orgTypeOptions: OrgType[] = ['farmer', 'umkm', 'industry', 'hotel', 'government']

export function OrganizationEditForm({ orgId, canEdit, canEditType, initial }: Props) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [type, setType] = useState<OrgType>(initial.type)
  const [sector, setSector] = useState<OrgSector | ''>(initial.sector ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [verificationStatus, setVerificationStatus] = useState<OrgVerificationStatus>(initial.verification_status)
  const [submitting, setSubmitting] = useState(false)

  const isGovernment = type === 'government'

  const canSubmit = useMemo(() => {
    if (!canEdit) return false
    if (name.trim().length < 3) return false
    if (!isGovernment && !sector) return false
    return true
  }, [canEdit, isGovernment, name, sector])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name,
        sector: isGovernment ? null : sector || null,
        description: description.trim() ? description : null,
      }

      if (canEditType) {
        payload.type = type
        payload.verification_status = verificationStatus
      }

      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
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

      router.refresh()
      router.push('/dashboard/organizations')
    } finally {
      setSubmitting(false)
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        You do not have permission to edit this organization.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Organization name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Organization type</label>
          <Select
            key={type}
            defaultValue={type}
            onValueChange={(v) => setType(v as OrgType)}
            disabled={!canEditType || submitting}
          >
            <SelectTrigger className="w-full min-w-0" size="default">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {orgTypeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canEditType ? (
            <p className="text-xs text-muted-foreground">Only platform superadmin can change type.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Sector</label>
          <Select
            key={sector || 'none'}
            defaultValue={sector || ''}
            onValueChange={(v) => setSector(v as OrgSector)}
            disabled={isGovernment || submitting}
          >
            <SelectTrigger className="w-full min-w-0" size="default">
              <SelectValue placeholder={isGovernment ? 'N/A for government' : 'Select sector'} />
            </SelectTrigger>
            <SelectContent>
              {sectorOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canEditType ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Verification status</label>
          <Select
            value={verificationStatus}
            onValueChange={(v) => setVerificationStatus(v as OrgVerificationStatus)}
            disabled={submitting}
          >
            <SelectTrigger className="w-full min-w-0" size="default">
              <SelectValue placeholder="Select verification status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">pending</SelectItem>
              <SelectItem value="verified">verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          placeholder="Optional"
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={!canSubmit || submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/dashboard/organizations')} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

