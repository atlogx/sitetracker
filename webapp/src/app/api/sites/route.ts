import { NextRequest } from 'next/server'
import {
  getServiceSupabase,
  jsonOk,
  jsonError
} from '@/lib/serverSupabase'
import { generateSlug } from '@/lib/utils'

/**
 * Force l'exécution de cette route sur le runtime Node.js
 * (évite certains comportements Edge qui peuvent masquer les erreurs d'env
 *  et améliore la clarté des messages d'erreur côté serveur).
 */
export const runtime = 'nodejs'

/**
 * Helper pour capturer proprement les erreurs d'environnement Supabase.
 * Évite que Next.js retourne une page HTML et garantit un JSON propre.
 */
function getSupabaseOrThrow() {
  try {
    return getServiceSupabase()
  } catch (e: any) {
    throw new Error('Configuration Supabase invalide: ' + (e?.message || 'variables manquantes'))
  }
}

/**
 * Sites API
 *
 * Endpoints:
 *  GET    /api/sites
 *    Query Params:
 *      id?: string              -> return single site (404 if not found)
 *      projectId?: string       -> filter by project_id (ignored if id present)
 *      include?: string (csv)   -> supported tokens:
 *          "companies"   -> include company_sites(company:companies(*))
 *          "tracking"    -> include monthly_progress(*)
 *
 *  POST   /api/sites
 *    Body JSON:
 *      {
 *        name: string,
 *        project_id: string,
 *        address: string,
 *        project_duration_months: number,   // durée totale du chantier (mois)
 *        start_month: string,               // mois de début (\"01\" - \"12\")
 *        code?: string,
 *        company: {                         // entreprise exécutante
 *          name: string,
 *          address: string,
 *          email: string,
 *          phone: string
 *        }
 *      }
 *
 *  PUT    /api/sites
 *    Body JSON:
 *      {
 *        id: string,
 *        name?: string,
 *        address?: string,
 *        code?: string,
 *        company?: {                        // entreprise exécutante
 *          name: string,
 *          address: string,
 *          email: string,
 *          phone: string
 *        }
 *        // NOTE: project_duration_months & start_month sont immuables après création
 *      }
 *
 *  DELETE /api/sites?id=UUID
 *
 * Notes:
 *  - Uses service-role client (bypasses RLS). Add authentication/authorization as needed.
 *  - This API keeps responses consistent ({ data } or { error:{ message } }).
 *  - Extend include tokens as your domain evolves (e.g., administrators).
 */

/* -------------------------------------------------------------------------- */
/*  GET                                                                       */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseOrThrow()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const projectId = searchParams.get('projectId')
    const includeRaw = searchParams.get('include') || ''
    const includeTokens = new Set(includeRaw.split(',').map(t => t.trim()).filter(Boolean))

    const selectFragments: string[] = ['*']
    if (includeTokens.has('companies')) {
      selectFragments.push('company_sites(company:companies(*))')
    }
    if (includeTokens.has('tracking')) {
      selectFragments.push('monthly_progress(*)')
    }
    const selectClause = selectFragments.join(', ')

    if (id) {
      const { data, error } = await supabase
        .from('sites')
        .select(selectClause)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonError('Site introuvable', 404)
        }
        return jsonError(error.message, 400)
      }
      return jsonOk(data)
    }

    let query = supabase
      .from('sites')
      .select(selectClause)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  POST                                                                      */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json()
    } catch {
      return jsonError('Corps JSON invalide ou malformé', 400)
    }
    
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }

    // Debug log POST body (ne pas laisser en production)
    console.log('[API /api/sites][POST] Raw body:', body);

    const {
      name,
      project_id,
      address,
      project_duration_months,
      start_month,
      code,
      company
    } = body as Record<string, unknown>

    const required: Record<string, unknown> = { name, project_id, address, project_duration_months, start_month, company }
    const missing = Object.entries(required)
      .filter(([, v]) => !v || (typeof v === 'string' && v.trim() === ''))
      .map(([k]) => k)

    if (missing.length) {
      return jsonError(`Champs requis manquants: ${missing.join(', ')}`, 400)
    }

    // Validation des données d'entreprise
    if (!company || typeof company !== 'object') {
      return jsonError("Le champ 'company' est requis et doit être un objet", 400)
    }

    const companyData = company as Record<string, unknown>
    const requiredCompanyFields = ['name', 'address', 'email', 'phone']
    const missingCompanyFields = requiredCompanyFields.filter(field => 
      !companyData[field] || (typeof companyData[field] === 'string' && String(companyData[field]).trim() === '')
    )

    if (missingCompanyFields.length) {
      return jsonError(`Champs entreprise requis manquants: ${missingCompanyFields.join(', ')}`, 400)
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(companyData.email))) {
      return jsonError("L'email de l'entreprise doit être valide", 400)
    }

    // Validation spécifique
    const durationNum = Number(project_duration_months)
    if (!Number.isInteger(durationNum) || durationNum <= 0) {
      return jsonError("Champ 'project_duration_months' doit être un entier positif", 400)
    }
    if (typeof start_month !== 'string' || !/^(0[1-9]|1[0-2])$/.test(start_month)) {
      return jsonError("Champ 'start_month' doit être une chaîne '01' à '12'", 400)
    }

    const record = {
      name: String(name),
      project_id: String(project_id),
      address: String(address),
      project_duration_months: durationNum,
      start_month: start_month,
      code: code ? String(code) : null,
      slug: generateSlug(String(name))
    }

    const supabase = getSupabaseOrThrow()
    
    // Transaction pour créer le site et l'entreprise
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .insert(record)
      .select('*')
      .single()

    if (siteError) {
      return jsonError(siteError.message, 400)
    }

    // Créer l'entreprise
    const companyRecord = {
      name: String(companyData.name),
      address: String(companyData.address),
      email: String(companyData.email),
      phone: String(companyData.phone)
    }

    const { data: companyDataResult, error: companyError } = await supabase
      .from('companies')
      .insert(companyRecord)
      .select('*')
      .single()

    if (companyError) {
      // Supprimer le site créé en cas d'erreur lors de la création de l'entreprise
      await supabase.from('sites').delete().eq('id', siteData.id)
      return jsonError(`Erreur lors de la création de l'entreprise: ${companyError.message}`, 400)
    }

    // Lier l'entreprise au site
    const { error: linkError } = await supabase
      .from('company_sites')
      .insert({
        site_id: siteData.id,
        company_id: companyDataResult.id
      })

    if (linkError) {
      // Supprimer le site et l'entreprise en cas d'erreur lors de la liaison
      await supabase.from('companies').delete().eq('id', companyDataResult.id)
      await supabase.from('sites').delete().eq('id', siteData.id)
      return jsonError(`Erreur lors de la liaison site-entreprise: ${linkError.message}`, 400)
    }

    return jsonOk({ 
      ...siteData, 
      company: companyDataResult 
    }, 201)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  PUT                                                                       */
/* -------------------------------------------------------------------------- */
export async function PUT(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json()
    } catch {
      return jsonError('Corps JSON invalide ou malformé', 400)
    }
    
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }

    // Debug log PUT body (ne pas laisser en production)
    console.log('[API /api/sites][PUT] Raw body:', body);

    const { id, ...rest } = body as Record<string, unknown>
    if (!id || typeof id !== 'string') {
      return jsonError("Champ 'id' requis (string)", 400)
    }

    const IMMUTABLE = new Set([
      'id',
      'project_id',
      'project_duration_months',
      'start_month',
      'created_at',
      'updated_at'
    ])
    const ALLOWED = new Set(['name', 'address', 'code', 'company'])

    const updates: Record<string, unknown> = {}
    
    for (const [k, v] of Object.entries(rest)) {
      if (IMMUTABLE.has(k)) continue
      if (ALLOWED.has(k)) updates[k] = v
    }

    if (Object.keys(updates).length === 0) {
      return jsonError('Aucun champ modifiable fourni', 400)
    }
    
    // Si le nom est modifié, regénérer le slug
    if (updates.name) {
      updates.slug = generateSlug(String(updates.name))
    }
    
    updates.updated_at = new Date().toISOString()

    const supabase = getSupabaseOrThrow()
    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return jsonError(error.message, 400)
    }
    if (!data) {
      return jsonError('Site introuvable', 404)
    }
    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/*  DELETE                                                                    */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return jsonError("Paramètre 'id' requis", 400)
    }
    const supabase = getSupabaseOrThrow()
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)

    if (error) {
      return jsonError(error.message, 400)
    }
    return jsonOk({ id, deleted: true })
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}


