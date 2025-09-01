import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: { headers: req.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options: any) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  // Vérifier la session utilisateur
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Pages qui nécessitent une authentification
  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/sites',
    '/companies',
    '/administrators',
    '/monthly-progress',
    '/settings',
    '/site-tracker'
  ]

  // Pages d'authentification
  const authPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/confirm-email',
    '/auth/callback'
  ]

  const { pathname } = req.nextUrl

  // Si l'utilisateur est sur une page protégée
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    // Pas de session - rediriger vers login
    if (!session) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Session existe mais email non confirmé - rediriger vers confirmation
    if (session && !session.user.email_confirmed_at) {
      const confirmUrl = new URL('/auth/confirm-email', req.url)
      confirmUrl.searchParams.set('email', session.user.email || '')
      return NextResponse.redirect(confirmUrl)
    }
  }

  // Si l'utilisateur est connecté et confirmé sur une page d'auth (sauf callback et confirm-email)
  if (session && session.user.email_confirmed_at && 
      authPaths.some(path => pathname.startsWith(path)) &&
      !pathname.startsWith('/auth/callback') &&
      !pathname.startsWith('/auth/confirm-email')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Si l'utilisateur est connecté mais non confirmé et essaie d'accéder à login/register
  if (session && !session.user.email_confirmed_at && 
      (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register'))) {
    const confirmUrl = new URL('/auth/confirm-email', req.url)
    confirmUrl.searchParams.set('email', session.user.email || '')
    return NextResponse.redirect(confirmUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}