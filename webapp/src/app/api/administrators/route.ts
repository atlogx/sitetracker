import { NextRequest } from 'next/server'
import {
  getServiceSupabase,
  jsonOk,
  jsonError
} from '@/lib/serverSupabase'

/**
 * Administrators API
 *
 * GET  /api/administrators
 *   - Query params:
 *       id (optional): if provided, returns a single administrator (404 if not found)
 *       organizationId (optional): filter by organization_id
 *     Without params: returns the list of all administrators
 *
 * POST /api/administrators
 *   - Body JSON: { name: string, email: string, phone?: string, position?: string, role: 'org-level' | 'project-level', organization_id: string }
 *   - Returns created administrator
 *
 * PUT  /api/administrators
 *   - Body JSON: { id: string, ...fields }
 *   - Immutable: id, created_at, updated_at
 *   - Updatable fields: name, email, phone, position, role
 *   - Returns updated administrator
 *
 * DELETE /api/administrators
 *   - Query params: id (required)
 *   - Returns success message
 */

/* -------------------------------------------------------------------------- */
/*  GET Handler                                                               */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const organizationId = searchParams.get('organizationId')

    if (id) {
      const { data, error } = await supabase
        .from('administrators')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonError('Administrateur introuvable', 404)
        }
        return jsonError(error.message, 400)
      }
      return jsonOk(data)
    }

    let query = supabase
      .from('administrators')
      .select(`
        *,
        organization:organizations(*)
      `)
      .order('name', { ascending: true })

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query

    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  POST Handler                                                              */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await safeJson(req)
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }

    const { name, email, phone, position, role, organization_id } = body as Record<string, unknown>

    // Validation des champs requis
    if (!name || typeof name !== 'string') {
      return jsonError("Champ 'name' requis (string)", 400)
    }
    if (!email || typeof email !== 'string') {
      return jsonError("Champ 'email' requis (string)", 400)
    }
    if (!role || !['org-level', 'project-level'].includes(role as string)) {
      return jsonError("Champ 'role' requis ('org-level' ou 'project-level')", 400)
    }
    if (!organization_id || typeof organization_id !== 'string') {
      return jsonError("Champ 'organization_id' requis (string)", 400)
    }

    const adminData = {
      name: name as string,
      email: email as string,
      phone: phone as string || null,
      position: position as string || null,
      role: role as 'org-level' | 'project-level',
      organization_id: organization_id as string
    }

    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from('administrators')
      .insert(adminData)
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    if (error) {
      return jsonError(error.message, 400)
    }

    return jsonOk(data, 201)
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

    // Champs immuables (ignorés si présents)
    const IMMUTABLE_FIELDS = new Set(['id', 'created_at', 'updated_at', 'organization_id'])

    // Champs autorisés pour la mise à jour
    const ALLOWED_UPDATE_FIELDS = new Set([
      'name',
      'email', 
      'phone',
      'position',
      'role'
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
      .from('administrators')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        organization:organizations(*)
      `)
      .single()

    if (error) {
      return jsonError(error.message, 400)
    }
    if (!data) {
      return jsonError('Administrateur introuvable', 404)
    }

    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE Handler                                                            */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return jsonError("Paramètre 'id' requis", 400)
    }

    const supabase = getServiceSupabase()
    
    // Vérifier si l'administrateur existe
    const { data: existing, error: fetchError } = await supabase
      .from('administrators')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return jsonError('Administrateur introuvable', 404)
    }

    // Supprimer d'abord les liaisons avec les projets
    await supabase
      .from('project_administrators')
      .delete()
      .eq('administrator_id', id)

    // Puis supprimer l'administrateur
    const { error } = await supabase
      .from('administrators')
      .delete()
      .eq('id', id)

    if (error) {
      return jsonError(error.message, 400)
    }

    return jsonOk({ message: 'Administrateur supprimé avec succès' })
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