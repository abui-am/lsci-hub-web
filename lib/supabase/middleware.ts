import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

type CookieToSet = { name: string; value: string; options?: CookieOptions }

/**
 * Supabase client bound to the incoming request + response cookies (Edge middleware).
 */
export async function createMiddlewareSupabase(request: NextRequest): Promise<{
  supabase: SupabaseClient | null
  response: NextResponse
}> {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return { supabase: null, response }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  await supabase.auth.getClaims()

  return { supabase, response }
}

/**
 * Refreshes the Supabase auth session and writes refreshed tokens to the response.
 * Call getClaims() immediately after creating the client to avoid random logouts.
 */
export async function updateSession(request: NextRequest) {
  const { response } = await createMiddlewareSupabase(request)
  return response
}
