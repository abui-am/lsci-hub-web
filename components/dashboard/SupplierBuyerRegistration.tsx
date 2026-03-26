'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MembershipRole, OrgSector, OrgType } from '@/lib/rbac/types'

type SupplierBuyerKind = 'supplier' | 'buyer' | 'internal'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type OrganizationContext = {
  id: string
  name: string
  type: OrgType
  sector: OrgSector | null
}

type Props = {
  isPlatformSuperadmin: boolean
  actorRole: MembershipRole
  organization?: OrganizationContext
}

function kindFromOrgType(orgType: OrgType): SupplierBuyerKind | null {
  if (orgType === 'farmer' || orgType === 'umkm') return 'supplier'
  if (orgType === 'industry' || orgType === 'hotel') return 'buyer'
  if (orgType === 'government') return 'internal'
  return null
}

export function SupplierBuyerRegistration({
  isPlatformSuperadmin,
  actorRole,
  organization,
}: Props) {
  const [kind, setKind] = useState<SupplierBuyerKind>('supplier')
  const [orgType, setOrgType] = useState<OrgType>('farmer')
  const [orgName, setOrgName] = useState('')
  const [sector, setSector] = useState<OrgSector | null>('agriculture')
  const [orgDescription, setOrgDescription] = useState('')

  const [userFullName, setUserFullName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [password, setPassword] = useState('')
  const [membershipRole, setMembershipRole] = useState<MembershipRole>('member')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleCreateOrganizationOnly = async () => {
    if (!isPlatformSuperadmin) return
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      if (orgName.trim().length < 3) {
        setError('Organization name must be at least 3 characters.')
        return
      }

      if (orgType !== 'government') {
        if (!sector) {
          setError('Sector is required for this organization type.')
          return
        }
      }

      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orgName,
          orgType,
          sector: orgType === 'government' ? null : sector,
          orgDescription,
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

      const organizationId =
        typeof data === 'object' && data && 'organizationId' in data
          ? (data as { organizationId?: unknown }).organizationId
          : undefined

      setSuccess(
        `Organization created successfully. Organization ID: ${String(organizationId ?? '—')}`
      )
    } finally {
      setSubmitting(false)
    }
  }

  const orgTypeOptions = useMemo(() => {
    if (kind === 'supplier') return ['farmer', 'umkm'] as const
    if (kind === 'buyer') return ['industry', 'hotel'] as const
    return ['government'] as const
  }, [kind])

  const membershipRoleOptions = useMemo((): MembershipRole[] => {
    if (isPlatformSuperadmin) return ['admin', 'manager', 'member']
    if (actorRole === 'admin') return ['manager', 'member']
    if (actorRole === 'manager') return ['member']
    return []
  }, [actorRole, isPlatformSuperadmin])

  const derivedKind = useMemo(() => {
    if (isPlatformSuperadmin) return null
    if (!organization) return null
    return kindFromOrgType(organization.type)
  }, [isPlatformSuperadmin, organization])

  const effectiveKind: SupplierBuyerKind | null = useMemo(() => {
    if (derivedKind) return derivedKind
    return isPlatformSuperadmin ? kind : null
  }, [derivedKind, isPlatformSuperadmin, kind])

  const canSubmit = isPlatformSuperadmin ? true : effectiveKind !== null

  const showOrgFields = isPlatformSuperadmin

  const orgTypeFromDerived = useMemo(() => {
    if (!organization) return null
    return organization.type
  }, [organization])

  return (
    <div className="space-y-4">
      <div>
        {isPlatformSuperadmin ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={kind === 'supplier' ? 'default' : 'outline'}
              onClick={() => {
                setKind('supplier')
                setOrgType('farmer')
                setSector('agriculture')
              }}
            >
              Register Supplier
            </Button>
            <Button
              type="button"
              variant={kind === 'buyer' ? 'default' : 'outline'}
              onClick={() => {
                setKind('buyer')
                setOrgType('industry')
                setSector('processing')
              }}
            >
              Register Buyer
            </Button>
            <Button
              type="button"
              variant={kind === 'internal' ? 'default' : 'outline'}
              onClick={() => {
                setKind('internal')
                setOrgType('government')
                setSector(null)
              }}
            >
              Register Internal
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="font-medium">Registration scope</div>
            <div className="mt-1 text-muted-foreground">
              {effectiveKind ? (
                <>
                  You can register{' '}
                  <span className="font-medium">{effectiveKind}</span> accounts
                  inside your organization.
                </>
              ) : (
                <>Your organization type cannot register supplier/buyer/internal accounts.</>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        className="space-y-4 rounded-lg border bg-card p-5"
        onSubmit={async (e) => {
          e.preventDefault()
          setError(null)
          setSuccess(null)
          setSubmitting(true)

          try {
            if (userFullName.trim().length < 2) {
              setError('Full name must be at least 2 characters.')
              return
            }
            if (!isValidEmail(userEmail)) {
              setError('Please enter a valid email.')
              return
            }
            if (password.trim().length < 8) {
              setError('Password must be at least 8 characters.')
              return
            }
            if (!membershipRoleOptions.includes(membershipRole)) {
              setError('Your membership role selection is not allowed.')
              return
            }

            if (showOrgFields) {
              if (orgName.trim().length < 3) {
                setError('Organization name must be at least 3 characters.')
                return
              }
            }

            if (!isPlatformSuperadmin && effectiveKind == null) {
              setError('Your organization type cannot register supplier/buyer/internal accounts.')
              return
            }

            const res = await fetch('/api/admin/register', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                kind: effectiveKind,
                // Only sent for superadmin mode; ignored for org admin/manager.
                orgType: showOrgFields ? orgType : undefined,
                orgName: showOrgFields ? orgName : undefined,
                sector: showOrgFields ? sector : undefined,
                orgDescription: showOrgFields
                  ? orgDescription.trim()
                  : undefined,
                userFullName,
                userEmail,
                password,
                membershipRole,
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

            if (typeof data === 'object' && data && 'organizationId' in data) {
              const org = (data as { organizationId?: unknown }).organizationId
              setSuccess(
                `Created account successfully. Organization ID: ${String(org ?? '—')}`
              )
            } else {
              setSuccess('Created account successfully.')
            }

            // Keep orgType/kind for faster repeated registrations.
            setOrgName('')
            setOrgDescription('')
            setUserFullName('')
            setUserEmail('')
            setPassword('')
            setMembershipRole(membershipRoleOptions[0] ?? 'member')
          } finally {
            setSubmitting(false)
          }
        }}
      >
        {isPlatformSuperadmin ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={handleCreateOrganizationOnly}>
              Create organization only
            </Button>
          </div>
        ) : null}
        {showOrgFields ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization name</label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Organization type</label>
              <select
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as OrgType)}
              >
                {orgTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sector</label>
              {kind !== 'internal' ? (
                <select
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={sector ?? 'agriculture'}
                  onChange={(e) => setSector(e.target.value as OrgSector)}
                >
                  {(['agriculture', 'tourism', 'processing', 'mining'] as const).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Internal orgs have no sector
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Organization description (optional)
              </label>
              <Input
                value={orgDescription}
                onChange={(e) => setOrgDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-sm font-medium">Organization</div>
              <div className="text-sm text-muted-foreground">{organization?.name ?? '—'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Organization type</div>
              <div className="text-sm text-muted-foreground">
                {orgTypeFromDerived ?? '—'}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">User full name</label>
            <Input value={userFullName} onChange={(e) => setUserFullName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Membership role</label>
            <select
              className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={membershipRole}
              onChange={(e) => setMembershipRole(e.target.value as MembershipRole)}
              disabled={membershipRoleOptions.length === 0}
            >
              {membershipRoleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">User email</label>
            <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Temporary password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
            {success}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={submitting || !canSubmit}
          className="w-full"
        >
          {submitting ? 'Creating account…' : 'Create supplier/buyer/internal account'}
        </Button>
      </form>
    </div>
  )
}

