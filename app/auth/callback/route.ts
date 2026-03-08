import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Handles OAuth and PKCE code exchange.
 * Supabase redirects here with ?code= after social sign-in or PKCE flows.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  return NextResponse.redirect(new URL('/auth/error?message=Auth+failed', request.url))
}
