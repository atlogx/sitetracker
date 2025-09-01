import { NextRequest } from 'next/server'
import {
  getServiceSupabase,
  jsonOk,
  jsonError
} from '@/lib/serverSupabase'

/**
 * Project Administrators API
 *
 * GET  /api/project-administrators
 *   - Query params:
 *       projectId (required): returns administrators linked to this project
 *
 * POST /api/project-administrators
 *   - Body JSON: { project_id: string, administrator_id: string }
 *   - Creates a link between project and administrator
 *   - Returns the created link
 *
 * DELETE /api/project-administrators
 *   - Query params: projectId (required), administratorId (required)
 *   - Removes the link between project and administrator
 *   - Returns success message
 */

/* -------------------------------------------------------------------------- */
/*  GET Handler                                                               */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return jsonError("Paramètre 'projectId' requis", 400)
    }

    const { data, error } = await supabase
      .from('project_administrators')
      .select(`
        *,
        administrator:administrators(*),
        project:projects(*)
      `)
      .eq('project_id', projectId)

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

    const { project_id, administrator_id } = body as Record<string, unknown>

    // Validation des champs requis
    if (!project_id || typeof project_id !== 'string') {
      return jsonError("Champ 'project_id' requis (string)", 400)
    }
    if (!administrator_id || typeof administrator_id !== 'string') {
      return jsonError("Champ 'administrator_id' requis (string)", 400)
    }

    const supabase = getServiceSupabase()

    // Vérifier que le projet existe
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return jsonError('Projet introuvable', 404)
    }

    // Vérifier que l'administrateur existe
    const { data: admin, error: adminError } = await supabase
      .from('administrators')
      .select('id')
      .eq('id', administrator_id)
      .single()

    if (adminError || !admin) {
      return jsonError('Administrateur introuvable', 404)
    }

    // Vérifier que la liaison n'existe pas déjà
    const { data: existing } = await supabase
      .from('project_administrators')
      .select('id')
      .eq('project_id', project_id)
      .eq('administrator_id', administrator_id)
      .single()

    if (existing) {
      return jsonError('Cette liaison existe déjà', 409)
    }

    // Créer la liaison
    const { data, error } = await supabase
      .from('project_administrators')
      .insert({
        project_id: project_id as string,
        administrator_id: administrator_id as string
      })
      .select(`
        *,
        administrator:administrators(*),
        project:projects(*)
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
/*  DELETE Handler                                                            */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const administratorId = searchParams.get('administratorId')

    if (!projectId) {
      return jsonError("Paramètre 'projectId' requis", 400)
    }
    if (!administratorId) {
      return jsonError("Paramètre 'administratorId' requis", 400)
    }

    const supabase = getServiceSupabase()
    
    // Vérifier si la liaison existe
    const { data: existing, error: fetchError } = await supabase
      .from('project_administrators')
      .select('id')
      .eq('project_id', projectId)
      .eq('administrator_id', administratorId)
      .single()

    if (fetchError || !existing) {
      return jsonError('Liaison introuvable', 404)
    }

    // Supprimer la liaison
    const { error } = await supabase
      .from('project_administrators')
      .delete()
      .eq('project_id', projectId)
      .eq('administrator_id', administratorId)

    if (error) {
      return jsonError(error.message, 400)
    }

    return jsonOk({ message: 'Liaison supprimée avec succès' })
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