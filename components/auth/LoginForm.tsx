'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const QUERY_ERRORS: Record<string, string> = {
  no_profile:
    'Akun Anda tidak memiliki profil di basis data aplikasi ini, atau aplikasi memakai proyek Supabase lain dari yang Anda undang. Pastikan NEXT_PUBLIC_SUPABASE_URL dan kunci cocok dengan proyek Anda. Jika tetap terjadi, minta administrator platform menambahkan profil Anda.',
  no_organization:
    'Profil Anda belum terhubung ke organisasi. Minta administrator platform untuk menautkan akun Anda.',
}

type LoginFormProps = {
  redirectTo?: string
  queryError?: string
}

export function LoginForm({ redirectTo, queryError }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    queryError ? QUERY_ERRORS[queryError] ?? null : null
  )
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) {
        setError(signInError.message)
        return
      }
      router.refresh()
      const safeRedirect =
        redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
          ? redirectTo
          : null

      let safe = safeRedirect ?? '/marketplace'
      if (!safeRedirect) {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_supplier, is_buyer, is_platform_superadmin')
            .eq('id', user.id)
            .is('deleted_at', null)
            .maybeSingle()

          if (profile && !profile.is_platform_superadmin) {
            if (profile.is_supplier && !profile.is_buyer) {
              safe = '/supplier/marketplace'
            } else if (profile.is_buyer && !profile.is_supplier) {
              safe = '/buyer/marketplace'
            }
          }
        }
      }
      router.push(safe)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="anda@contoh.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">
            Kata sandi
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Masuk…' : 'Masuk'}
      </Button>
    </form>
  )
}
