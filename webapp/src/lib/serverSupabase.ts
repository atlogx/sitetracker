/**
 * Server-side (ONLY) Supabase helpers.
 *
 * Responsibilities:
 *  - Provide a singleton "service role" Supabase client (never import in client bundles).
 *  - Offer thin abstractions for common CRUD with consistent error handling.
 *  - Prevent accidental exposure of the service key (no re-export to client code).
 *
 * Usage (Route Handlers / Server Components):
 *   import { getServiceSupabase } from '@/lib/serverSupabase'
 *
 *   export async function POST(req: Request) {
 *     const supabase = getServiceSupabase()
 *     const { data, error } = await supabase.from('projects').insert({...}).select().single()
 *     if (error) return jsonError(error.message, 400)
 *     return jsonOk(data, 201)
 *   }
 *
 * Environment Variables:
 *   - NEXT_PUBLIC_SUPABASE_URL (public)
 *   - NEXT_SUPABASE_SERVICE_ROLE_KEY (secret, NEVER expose to client)
 *
 * Notes:
 *  - The service role key bypasses RLS. Use strictly inside trusted server code.
 *  - For user-scoped operations under RLS, build a separate "createUserScopedClient"
 *    passing auth cookies (NOT included here yet to keep focus on server-only flows).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/* -------------------------------------------------------------------------- */
/*  Environment Validation                                                    */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY

/**
 * On ne jette plus d'erreur au chargement du module pour éviter que Next.js
 * renvoie une page HTML (<!DOCTYPE ...>) et provoque un SyntaxError côté client.
 * On fait une validation paresseuse quand on crée réellement le client.
 */
let __supabaseEnvChecked = false
function ensureSupabaseEnv() {
  if (__supabaseEnvChecked) return
  if (!SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase configuration.')
  }
  if (!SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_SUPABASE_SERVICE_ROLE_KEY (service role) for server Supabase client.')
  }
  __supabaseEnvChecked = true
}

/* -------------------------------------------------------------------------- */
/*  Global Singleton (avoid re-instantiation in dev hot reload)              */
/* -------------------------------------------------------------------------- */

declare global {
  var __SITE_TRACKER_SERVICE_SUPABASE__: SupabaseClient<Database> | undefined
}

function createServiceClient(): SupabaseClient<Database> {
  // Validation paresseuse (ne lève qu'ici, donc capturable par les route handlers)
  ensureSupabaseEnv()
  return createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

/**
 * Acquire (or lazily initialize) the service Supabase client.
 * This must never run in the browser – ensure caller is server-only.
 */
export function getServiceSupabase(): SupabaseClient<Database> {
  if (typeof window !== 'undefined') {
    throw new Error('getServiceSupabase() must only be called on the server.')
  }
  if (!global.__SITE_TRACKER_SERVICE_SUPABASE__) {
    global.__SITE_TRACKER_SERVICE_SUPABASE__ = createServiceClient()
  }
  return global.__SITE_TRACKER_SERVICE_SUPABASE__
}

/* -------------------------------------------------------------------------- */
/*  JSON Response Helpers (Route Handlers)                                   */
/* -------------------------------------------------------------------------- */

export function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function jsonError(message: string, status = 400, details?: unknown): Response {
  return new Response(JSON.stringify({
    error: { message, details }
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Wrap an async route handler body with standardized error capture.
 */
export async function handleApi<T>(
  fn: () => Promise<T>,
  options?: { successStatus?: number }
): Promise<Response> {
  try {
    const result = await fn()
    return jsonOk(result, options?.successStatus ?? 200)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error'
    return jsonError(msg, 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  Domain-Oriented Small Helpers                                            */
/* -------------------------------------------------------------------------- */

export type DomainStatus = 'CRITICAL' | 'PROBLEMATIC' | 'GOOD'

/**
 * Convert incremental monthly progress (0-100) to domain status.
 */
export function evaluateDomainStatus(progress: number | null | undefined): DomainStatus {
  if (progress == null || isNaN(progress)) return 'CRITICAL'
  if (progress < 30) return 'CRITICAL'
  if (progress < 50) return 'PROBLEMATIC'
  return 'GOOD'
}

/**
 * Convert domain status to DB enum equivalent (lowercase).
 */
export function domainStatusToDb(status: DomainStatus): 'critical' | 'problematic' | 'good' {
  switch (status) {
    case 'CRITICAL': return 'critical'
    case 'PROBLEMATIC': return 'problematic'
    case 'GOOD': return 'good'
  }
}

/**
 * Assemble (year, month) integers from a YYYY-MM string.
 */
export function parseYearMonth(ym: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!match) throw new Error(`Invalid YearMonth format: ${ym}`)
  return { year: Number(match[1]), month: Number(match[2]) }
}

/**
 * Compute the next YYYY-MM given an optional latest existing YYYY-MM (or now if none).
 */
export function nextYearMonth(latest?: string): string {
  let base: Date
  if (!latest) {
    base = new Date()
  } else {
    const { year, month } = parseYearMonth(latest)
    base = new Date(year, month - 1, 1)
  }
  base.setMonth(base.getMonth() + 1)
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`
}

/* -------------------------------------------------------------------------- */
/*  Typed Insert Helpers (Optional Pattern)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Insert a monthly tracking row (server side).
 * Automatically computes cumulative total based on last existing row.
 */
export async function insertMonthlyTracking(params: {
  siteId: string
  yearMonth: string
  monthlyProgress: number
  targetRate: number
  observations?: string
}) {
  const supabase = getServiceSupabase()

  // Fetch last total (ordered by month string - works for YYYY-MM format)
  const { data: existing, error: fetchErr } = await supabase
    .from('monthly_progress')
    .select('total_progress')
    .eq('site_id', params.siteId)
    .order('month', { ascending: false })
    .limit(1)
  if (fetchErr) throw fetchErr

  const previousTotal = existing?.[0]?.total_progress ?? 0
  const total = previousTotal + params.monthlyProgress
  const domainStatus = evaluateDomainStatus(params.monthlyProgress)
  const dbStatus = domainStatusToDb(domainStatus)

  const { data, error } = await supabase
    .from('monthly_progress')
    .insert({
      site_id: params.siteId,
      month: params.yearMonth,
      total_progress: total,
      monthly_progress: params.monthlyProgress,
      target_rate: params.targetRate,
      observations: params.observations ?? null,
      status: dbStatus
    })
    .select()
    .single()
  if (error) throw error
  return data
}
