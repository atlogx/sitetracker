import { NextRequest } from 'next/server'
import {
  getServiceSupabase,
  jsonOk,
  jsonError,
} from '@/lib/serverSupabase'

export const dynamic = 'force-dynamic'

/* -------------------------------------------------------------------------- */
/* PUT - Update project                                                       */
/* -------------------------------------------------------------------------- */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await safeJson(req)
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }

    const { id } = params
    if (!id) {
      return jsonError("ID de projet requis", 400)
    }

    const {
      name,
      owner_name,
      owner_email,
      owner_phone,
      status,
      is_active
    } = body as Record<string, unknown>

    const supabase = getServiceSupabase()

    // Vérifier que le projet existe
    const { error: fetchError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return jsonError('Projet introuvable', 404)
      }
      return jsonError(fetchError.message, 400)
    }

    // Construire l'objet de mise à jour
    const updateData: Record<string, unknown> = {}

    if (name && typeof name === 'string') {
      updateData.name = name
    }
    if (owner_name && typeof owner_name === 'string') {
      updateData.owner_name = owner_name
    }
    if (owner_email && typeof owner_email === 'string') {
      updateData.owner_email = owner_email
    }
    if (owner_phone !== undefined) {
      updateData.owner_phone = owner_phone ? String(owner_phone) : null
    }
    if (status && typeof status === 'string') {
      updateData.status = status
    }
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active
    }

    // Mettre à jour le projet
    const { data, error } = await supabase
      .from('projects')
      .update(updateData as any)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return jsonError(error.message, 400)
    }

    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/* GET - Get single project                                                   */
/* -------------------------------------------------------------------------- */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    if (!id) {
      return jsonError("ID de projet requis", 400)
    }

    const supabase = getServiceSupabase()

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*),
        sites(
          *,
          company_sites(
            company:companies(*)
          )
        ),
        project_administrators(
          administrator:administrators(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return jsonError('Projet introuvable', 404)
      }
      return jsonError(error.message, 400)
    }

    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
async function safeJson(req: NextRequest): Promise<unknown | null> {
  try {
    const text = await req.text()
    if (!text) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}