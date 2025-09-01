import { NextRequest } from 'next/server'
import {
  getServiceSupabase,
  jsonOk,
  jsonError
} from '@/lib/serverSupabase'

/**
 * Organization API
 *
 * GET  /api/organization
 *   - Query params:
 *       id (optional): if provided, returns a single organization (404 if not found)
 *     Without id: returns the list (could be just one in most deployments)
 *
 * PUT  /api/organization
 *   - Body JSON: { id: string, ...fields }
 *   - Immutable: name (will be ignored if provided)
 *   - Updatable fields (based on current schema):
 *       general_director_name
 *       general_director_email
 *       general_director_phone
 *       financial_service_name
 *       financial_service_email
 *       financial_service_phone
 *
 *   Returns updated row.
 *
 * NOTES:
 *  - The current DB schema (organizations) includes an address column.
 *  - Uses service role key: ensure this route is protected (add auth / RLS where needed).
 */

/* -------------------------------------------------------------------------- */
/*  GET Handler                                                               */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonError('Organisation introuvable', 404)
        }
        return jsonError(error.message, 400)
      }
      return jsonOk(data)
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT Handler                                                               */
/* -------------------------------------------------------------------------- */
export async function PUT(req: NextRequest) {
  try {
    const body = await safeJson(req)
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }

    const { id, ...rest } = body as Record<string, unknown>
    if (!id || typeof id !== 'string') {
      return jsonError("Champ 'id' requis (string)", 400)
    }

    // Immutable fields (ignored if present)
    const IMMUTABLE_FIELDS = new Set(['name', 'id', 'created_at', 'updated_at'])

    // Whitelist of update-able columns (current schema)
    const ALLOWED_UPDATE_FIELDS = new Set([
      'general_director_name',
      'general_director_email',
      'general_director_phone',
      'financial_service_name',
      'financial_service_email',
      'financial_service_phone',
      'code',
      'address'
    ])

    const updates: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(rest)) {
      if (IMMUTABLE_FIELDS.has(key)) continue
      if (ALLOWED_UPDATE_FIELDS.has(key)) {
        updates[key] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return jsonError('Aucun champ modifiable fourni', 400)
    }

    updates.updated_at = new Date().toISOString()

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return jsonError(error.message, 400)
    }
    if (!data) {
      return jsonError('Organisation introuvable', 404)
    }

    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Safe JSON parse with graceful failure
 */
async function safeJson(req: NextRequest): Promise<unknown | null> {
  try {
    const text = await req.text()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}