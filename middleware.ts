import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabase } from '@/lib/supabase/middleware'

const PROTECTED_PREFIX = '/dashboard'

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareSupabase(request)

  if (!supabase) {
    return response
  }

  const pathname = request.nextUrl.pathname
  const isProtected = pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`)

  if (!isProtected) {
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const login = new URL('/login', request.url)
    login.searchParams.set('redirect', pathname)
    return NextResponse.redirect(login)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
