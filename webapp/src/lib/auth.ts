import { supabase } from './supabase'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'

export interface AuthResult {
  user: User | null
  error: string | null
}

export interface SessionResult {
  session: Session | null
  error: string | null
}

const redirectBase =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')

const resetRedirectTo = `${redirectBase}/auth/update-password`

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Vérifier si c'est un problème de confirmation d'email
    if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
      return { user: null, error: 'EMAIL_NOT_CONFIRMED' }
    }
    return { user: null, error: error.message }
  }
  return { user: data.user, error: null }
}

export async function signUp(email: string, password: string, next?: string): Promise<AuthResult> {
  // Build a redirect URL that always uses the client-side origin (redirectBase)
  // and optionally contains a `next` path to navigate after successful confirmation.
  const redirectPath = '/auth/callback'
  const redirectTo =
    `${redirectBase}${redirectPath}${next && next.startsWith('/') ? `?next=${encodeURIComponent(next)}` : ''}`

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo
    }
  })
  if (error) return { user: null, error: error.message }
  return { user: data.user, error: null }
}

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut()
  return { error: error ? error.message : null }
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: resetRedirectTo
  })
  return { error: error ? error.message : null }
}

export async function updatePassword(newPassword: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { user: null, error: error.message }
  return { user: data.user, error: null }
}

export async function getSession(): Promise<SessionResult> {
  const { data, error } = await supabase.auth.getSession()
  if (error) return { session: null, error: error.message }
  return { session: data.session, error: null }
}

export async function getCurrentUser(): Promise<AuthResult> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return { user: null, error: error.message }
  return { user: data.user, error: null }
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  return !!data.session
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
) {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(callback)
  return () => {
    subscription.unsubscribe()
  }
}

export function getAccessTokenSync(): string | null {
  const internal = supabase as unknown as { auth: { _storage?: Storage }; storageKey?: string }
  const storage = internal.auth._storage
  if (!storage) return null
  try {
    const raw = storage.getItem('sb-' + (internal.storageKey || ''))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.currentSession?.access_token || null
  } catch {
    return null
  }
}

export async function resendConfirmationEmail(email: string, next?: string): Promise<{ error: string | null }> {
  // Use the same redirect construction as signUp so resend links point to the correct client callback
  const redirectPath = '/auth/callback'
  const redirectTo =
    `${redirectBase}${redirectPath}${next && next.startsWith('/') ? `?next=${encodeURIComponent(next)}` : ''}`

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
    options: { emailRedirectTo: redirectTo }
  })
  return { error: error ? error.message : null }
}

export function assertEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}