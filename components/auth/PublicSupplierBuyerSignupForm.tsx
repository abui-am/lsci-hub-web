'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OrgType } from '@/lib/rbac/types'

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  farmer: 'Petani',
  umkm: 'UMKM',
  industry: 'Industri',
  hotel: 'Hotel',
  government: 'Pemerintahan',
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function PublicSupplierBuyerSignupForm() {
  const router = useRouter()

  const [isSupplier, setIsSupplier] = useState(true)
  const [isBuyer, setIsBuyer] = useState(false)

  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<OrgType>('farmer')
  const [orgDescription, setOrgDescription] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supplierOrgTypes: OrgType[] = ['farmer', 'umkm']
  const buyerOrgTypes: OrgType[] = ['industry', 'hotel']

  const allowedOrgTypes: OrgType[] = (() => {
    if (isSupplier && isBuyer) return ['government']
    if (isSupplier) return supplierOrgTypes
    if (isBuyer) return buyerOrgTypes
    return []
  })()

  useEffect(() => {
    if (!allowedOrgTypes.length) return
    if (!allowedOrgTypes.includes(orgType)) {
      setOrgType(allowedOrgTypes[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupplier, isBuyer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (fullName.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Masukkan email yang valid.')
      return
    }
    if (password.trim().length < 8) {
      setError('Kata sandi minimal 8 karakter.')
      return
    }

    if (!isSupplier && !isBuyer) {
      setError('Pilih minimal satu: Pemasok atau Pembeli.')
      return
    }

    if (orgName.trim().length < 3) {
      setError('Nama organisasi minimal 3 karakter.')
      return
    }
    if (!allowedOrgTypes.includes(orgType)) {
      setError('Jenis organisasi tidak valid untuk pilihan akun Anda.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      const accountClass: 'supplier' | 'buyer' | 'internal' =
        isSupplier && isBuyer ? 'internal' : isSupplier ? 'supplier' : 'buyer'

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            account_class: accountClass,
            is_supplier: isSupplier,
            is_buyer: isBuyer,
            org_name: orgName.trim(),
            org_type: orgType,
            org_description: orgDescription.trim() ? orgDescription.trim() : null,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // If the project auto-confirms emails, session might exist.
      if (data.session) {
        router.push('/dashboard')
        return
      }

      setSuccess('Pendaftaran berhasil. Konfirmasi email Anda jika diperlukan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-5"
    >
      <div className="flex gap-2">
        <Button
          type="button"
          variant={isSupplier ? 'default' : 'outline'}
          onClick={() => setIsSupplier((v) => !v)}
        >
          Pemasok
        </Button>
        <Button
          type="button"
          variant={isBuyer ? 'default' : 'outline'}
          onClick={() => setIsBuyer((v) => !v)}
        >
          Pembeli
        </Button>
      </div>

      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium">
          Nama lengkap
        </label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="orgName" className="text-sm font-medium">
          Nama organisasi
        </label>
        <Input
          id="orgName"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          autoComplete="organization"
          disabled={loading}
          placeholder="e.g. PT Maju Bersama"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Jenis organisasi</label>
        <Select
          value={orgType}
          disabled={loading}
          onValueChange={(v) => setOrgType(v as OrgType)}
        >
          <SelectTrigger className="w-full min-w-0" size="default">
            <SelectValue placeholder="Pilih jenis organisasi" />
          </SelectTrigger>
          <SelectContent>
            {allowedOrgTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {ORG_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label htmlFor="orgDescription" className="text-sm font-medium">
          Deskripsi organisasi (opsional)
        </label>
        <Input
          id="orgDescription"
          value={orgDescription}
          onChange={(e) => setOrgDescription(e.target.value)}
          disabled={loading}
          placeholder="Deskripsi singkat"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Kata sandi
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={loading}
          required
        />
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Membuat akun…' : 'Daftar'}
      </Button>
    </form>
  )
}

