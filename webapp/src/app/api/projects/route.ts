import { NextRequest } from 'next/server';
import {
  getServiceSupabase,
  jsonOk,
  jsonError,
} from '@/lib/serverSupabase';
import { generateSlug } from '@/lib/utils';

/**
 * Projects API
 *
 * Routes (same file because Next.js route segment):
 *  - GET    /api/projects
 *      Query params:
 *        id?: string                -> single project (404 if not found)
 *        organizationId?: string    -> filter list by organization_id
 *       (ignored if id present)
 *  - POST   /api/projects
 *      Body: {
 *        name: string,
 *        organization_id: string,
 *        code?: string,
 *        client_name: string,
 *        client_email: string,
 *        client_phone: string,
 *        project_director_name: string,
 *        project_director_email: string,
 *        project_director_phone: string,
 *        mission_manager_name: string,
 *        mission_manager_email: string,
 *        mission_manager_phone: string
 *      }
 *  - PUT    /api/projects
 *      Body: { id: string, ...updatableFields }
 *  - DELETE /api/projects?id=UUID
 *
 * Notes:
 *  - Uses service role client (bypasses RLS). Add auth/authorization as needed.
 *  - global_status + is_active:
 *       * On creation: defaults to active / 'active' unless explicitly overridden
 *       * On update: if is_active becomes false and no explicit global_status, sets 'demobilized'
 *  - Timestamps: updated_at set on PUT, created_at handled by DB default (if defined).
 */

/* -------------------------------------------------------------------------- */
/*  GET                                                                        */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const organizationId = searchParams.get('organizationId');

    if (id) {
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
          *,
          sites(*)
        `
        )
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonError('Projet introuvable', 404);
        }
        return jsonError(error.message, 400);
      }
      return jsonOk(data);
    }

    const includeParam = searchParams.get('include') || '';
    const includeTokens = new Set(includeParam.split(',').map(t => t.trim()).filter(Boolean));

    const sitesSelection = includeTokens.has('tracking')
      ? 'sites(*, monthly_progress(*))'
      : 'sites(*)';

    let query = supabase
        .from('projects')
        .select(
          `
          *,
          ${sitesSelection}
        `
        )
        .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    if (error) return jsonError(error.message, 400);

    return jsonOk(data);
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500);
  }
}

/* -------------------------------------------------------------------------- */
/*  POST                                                                       */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError('Corps JSON invalide ou malformé', 400);
    }
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400);
    }

    const {
      name,
      organization_id,
      code,
      client_name,
      client_email,
      client_phone,
      project_director_name,
      project_director_email,
      project_director_phone,
      mission_manager_name,
      mission_manager_email,
      mission_manager_phone,
      is_active,
      global_status,
    } = body as Record<string, unknown>;

    const required: Record<string, unknown> = {
      name,
      organization_id,
      client_name,
      client_email,
      client_phone,
      project_director_name,
      project_director_email,
      project_director_phone,
      mission_manager_name,
      mission_manager_email,
      mission_manager_phone,
    };

    const missing = Object.entries(required)
      .filter(([, v]) => !v || (typeof v === 'string' && v.trim() === ''))
      .map(([k]) => k);

    if (missing.length) {
      return jsonError(
        `Champs requis manquants: ${missing.join(', ')}`,
        400
      );
    }

    const record = {
      name: String(name),
      organization_id: String(organization_id),
      code: code ? String(code) : null,
      client_name: String(client_name),
      client_email: String(client_email),
      client_phone: String(client_phone),
      project_director_name: String(project_director_name),
      project_director_email: String(project_director_email),
      project_director_phone: String(project_director_phone),
      mission_manager_name: String(mission_manager_name),
      mission_manager_email: String(mission_manager_email),
      mission_manager_phone: String(mission_manager_phone),
      is_active: typeof is_active === 'boolean' ? is_active : true,
      global_status:
        typeof global_status === 'string'
          ? (global_status as 'active' | 'demobilized')
          : 'active',
      slug: generateSlug(String(name)),
    };

    // If is_active false but no custom global_status given, align:
    if (record.is_active === false && record.global_status === 'active') {
      record.global_status = 'demobilized';
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('projects')
      .insert(record)
      .select('*')
      .single();

    if (error) {
      return jsonError(error.message, 400);
    }

    return jsonOk(data, 201);
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500);
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT                                                                        */
/* -------------------------------------------------------------------------- */
export async function PUT(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonError('Corps JSON invalide ou malformé', 400);
    }
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400);
    }

    const { id, ...rest } = body as Record<string, unknown>;
    if (!id || typeof id !== 'string') {
      return jsonError("Champ 'id' requis (string)", 400);
    }

    const IMMUTABLE = new Set(['id', 'created_at', 'updated_at']);
    const ALLOWED = new Set([
      'name',
      'code',
      'organization_id',
      'client_name',
      'client_email',
      'client_phone',
      'project_director_name',
      'project_director_email',
      'project_director_phone',
      'mission_manager_name',
      'mission_manager_email',
      'mission_manager_phone',
      'is_active',
      'global_status',
      'slug',
    ]);

    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (IMMUTABLE.has(k)) continue;
      if (ALLOWED.has(k)) {
        updates[k] = v;
      }
    }

    if (Object.keys(updates).length === 0) {
      return jsonError('Aucun champ modifiable fourni', 400);
    }

    // Si le nom est modifié, regénérer le slug
    if (updates.name) {
      updates.slug = generateSlug(String(updates.name));
    }

    // Align global_status if is_active is toggled
    if (
      Object.prototype.hasOwnProperty.call(updates, 'is_active') &&
      typeof updates.is_active === 'boolean'
    ) {
      if (updates.is_active === false && !updates.global_status) {
        updates.global_status = 'demobilized';
      }
      if (updates.is_active === true && !updates.global_status) {
        updates.global_status = 'active';
      }
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return jsonError(error.message, 400);
    }
    if (!data) {
      return jsonError('Projet introuvable', 404);
    }

    return jsonOk(data);
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500);
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE                                                                     */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return jsonError("Paramètre 'id' requis", 400);
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      return jsonError(error.message, 400);
    }

    return jsonOk({ id, deleted: true });
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500);
  }
}

