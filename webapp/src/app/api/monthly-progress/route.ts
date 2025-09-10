import { NextRequest } from 'next/server'
import {
  getServiceSupabase,
  jsonOk,
  jsonError,
  evaluateDomainStatus,
  domainStatusToDb,
  parseYearMonth,
} from '@/lib/serverSupabase'

/**
 * Monthly Progress API (monthly_progress table)
 *
 * Base URL: /api/monthly-progress
 *
 * Features:
 *  GET
 *    - /api/monthly-progress
 *      Query params:
 *        id?: string                  -> Single row
 *        siteId?: string              -> Filter by site
 *        month?: YYYY-MM              -> Filter by specific month
 *        startYm?: YYYY-MM            -> Filter >= this YYYY-MM
 *        endYm?: YYYY-MM              -> Filter <= this YYYY-MM
 *        limit?: number               -> Limit result count
 *        order?: 'asc' | 'desc'       -> Sort chronological order (default desc)
 *        include=site                 -> Include site(*, project:projects(*))
 *
 *  POST
 *    Body JSON:
 *      {
 *        site_id: string,
 *        month: 'YYYY-MM',            (required)
 *        total_progress: number,      // avancement physique (saisi)
 *        target_rate: number,
 *        normal_rate?: number,
 *        delay_rate?: number,
 *        observations?: string
 *      }
 *    Behavior:
 *      - Calcule monthly_progress = total_progress - total_progress(précédent)
 *      - Déduit status à partir de monthly_progress
 *      - Rejects duplicate (site_id + month)
 *
 *  PUT
 *    Body JSON: { id: string, ...mutableFields }
 *      Mutable: total_progress, target_rate, normal_rate,
 *               delay_rate, observations
 *    Behavior:
 *      - Recalcule monthly_progress (diff) et statut si total_progress changé
 *      - Recalcule monthly_progress des lignes suivantes
 *
 *  DELETE
 *    /api/monthly-progress?id=UUID
 *    Behavior:
 *      - Deletes row
 *      - Recalculates cumulative totals for all subsequent rows of that site
 *
 * Response Shape:
 *   Success: { data: ... }
 *   Error:   { error: { message: string, details?: any } }
 *
 * NOTE:
 *  - Uses service role Supabase client (bypasses RLS). Add auth guard if needed.
 *  - All date/time stamps rely on DB defaults except updated_at recalculation streams (if you add triggers).
 */

export const dynamic = 'force-dynamic'

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabase()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const siteId = searchParams.get('siteId')
    const monthParam = searchParams.get('month')
    const startYm = searchParams.get('startYm')
    const endYm = searchParams.get('endYm')
    const limitParam = searchParams.get('limit')
    const orderParam = (searchParams.get('order') || '').toLowerCase()
    const include = searchParams.get('include') || ''
    const includeSite = include.split(',').includes('site')

    if (id) {
      const selectCols = includeSite
        ? '*, site:sites(*, project:projects(*))'
        : '*'
      const { data, error } = await supabase
        .from('monthly_progress')
        .select(selectCols)
        .eq('id', id)
        .single()
      if (error) {
        if (error.code === 'PGRST116') return jsonError('Enregistrement introuvable', 404)
        return jsonError(error.message, 400)
      }
      return jsonOk(data)
    }

    let query = supabase
      .from('monthly_progress')
      .select(includeSite ? '*, site:sites(*, project:projects(*))' : '*')

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    if (monthParam) {
      // Validate YYYY-MM format
      try {
        parseYearMonth(monthParam)
        query = query.eq('month', monthParam)
      } catch {
        return jsonError('Paramètre month invalide (format YYYY-MM)', 400)
      }
    }

    // Range filters
    if (startYm) {
      try {
        parseYearMonth(startYm)
        query = query.gte('month', startYm)
      } catch {
        return jsonError('startYm invalide (YYYY-MM)', 400)
      }
    }
    if (endYm) {
      try {
        parseYearMonth(endYm)
        query = query.lte('month', endYm)
      } catch {
        return jsonError('endYm invalide (YYYY-MM)', 400)
      }
    }

    const orderDesc = orderParam === 'asc' ? false : true
    query = query.order('month', { ascending: !orderDesc })

    if (limitParam) {
      const limit = Number(limitParam)
      if (!Number.isFinite(limit) || limit <= 0) return jsonError('Paramètre limit invalide', 400)
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) return jsonError(error.message, 400)
    return jsonOk(data)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await safeJson(req)
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }

    const {
      site_id,
      month,
      total_progress,
      target_rate,
      normal_rate,
      delay_rate,
      observations
    } = body as Record<string, unknown>

    if (!site_id || typeof site_id !== 'string') {
      return jsonError("Champ 'site_id' requis (string)", 400)
    }

    if (!month || typeof month !== 'string') {
      return jsonError("Champ 'month' requis (format YYYY-MM)", 400)
    }

    // Validate month format
    try {
      parseYearMonth(month)
    } catch {
      return jsonError("Format month invalide (YYYY-MM)", 400)
    }

    if (typeof total_progress !== 'number' || total_progress < 0) {
      return jsonError("'total_progress' requis (number >= 0)", 400)
    }
    if (typeof target_rate !== 'number' || target_rate < 0) {
      return jsonError("'target_rate' requis (number >= 0)", 400)
    }

    const supabase = getServiceSupabase()

    // Check duplicate month
    {
      const { data: dup, error: dupErr } = await supabase
        .from('monthly_progress')
        .select('id')
        .eq('site_id', site_id)
        .eq('month', month)
        .maybeSingle()
      if (dupErr) {
        return jsonError(dupErr.message, 400)
      }
      if (dup) {
        return jsonError('Une ligne existe déjà pour ce site et ce mois', 409)
      }
    }

    // Fetch last cumulative (ordered by month string - works for YYYY-MM format)
    const { data: lastRow, error: lastErr } = await supabase
      .from('monthly_progress')
      .select('total_progress')
      .eq('site_id', site_id)
      .order('month', { ascending: false })
      .limit(1)
    if (lastErr) return jsonError(lastErr.message, 400)

    const previousTotal = lastRow?.[0]?.total_progress ?? 0
    const monthly_progress = (total_progress as number) - previousTotal

    const domainStatus = evaluateDomainStatus(monthly_progress as number)
    const dbStatus = domainStatusToDb(domainStatus)

    const insertPayload = {
      site_id,
      month,
      total_progress,
      monthly_progress,
      target_rate,
      normal_rate: typeof normal_rate === 'number' ? normal_rate : 0,
      delay_rate: typeof delay_rate === 'number' ? delay_rate : 0,
      observations: observations ? String(observations) : null,
      status: dbStatus
    }

    const { data, error } = await supabase
      .from('monthly_progress')
      .insert(insertPayload as any)
      .select('*')
      .single()

    if (error) return jsonError(error.message, 400)
    return jsonOk(data, 201)
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/* PUT (Update + Recompute cumulative chain)                                  */
/* -------------------------------------------------------------------------- */
export async function PUT(req: NextRequest) {
  try {
    const body = await safeJson(req)
    if (!body || typeof body !== 'object') {
      return jsonError('Corps JSON invalide', 400)
    }
    const {
      id,
      total_progress,
      target_rate,
      normal_rate,
      delay_rate,
      observations
    } = body as Record<string, unknown>

    if (!id || typeof id !== 'string') {
      return jsonError("Champ 'id' requis (string)", 400)
    }

    const supabase = getServiceSupabase()

    // Load full sequence for the site so we can rebuild cumulative totals
    const { data: row, error: rowErr } = await supabase
      .from('monthly_progress')
      .select('id, site_id, month, total_progress')
      .eq('id', id)
      .single()

    if (rowErr) {
      if (rowErr.code === 'PGRST116') return jsonError('Ligne introuvable', 404)
      return jsonError(rowErr.message, 400)
    }

    const siteId = row.site_id

    const { data: allRows, error: allErr } = await supabase
      .from('monthly_progress')
      .select('id, month, total_progress')
      .eq('site_id', siteId)
      .order('month', { ascending: true })

    if (allErr) return jsonError(allErr.message, 400)

    // Mise à jour en mémoire du total_progress de la ligne cible si fourni
    const updatedTotal = (typeof total_progress === 'number' && total_progress >= 0)
      ? total_progress
      : row.total_progress

    // Recalcul des monthly_progress (différences) et statuts
    let previous = 0
    const patches: Array<{ id: string; monthly_progress: number | null; status?: string }> = []
    for (const r of allRows!) {
      let tp = r.total_progress ?? 0
      if (r.id === id) {
        tp = updatedTotal as number
      }
      const mp = (patches.length === 0) ? null : (tp - previous)
      previous = tp
      const mpValue = mp === null ? 0 : mp
      const st = domainStatusToDb(evaluateDomainStatus(mpValue))
      patches.push({
        id: r.id,
        monthly_progress: mp,
        status: st
      })
    }

    // Apply updates sequentially
    for (const patch of patches) {
      const extraTargetFields: Record<string, unknown> = {}
      if (patch.id === id) {
        if (typeof target_rate === 'number') extraTargetFields.target_rate = target_rate
        if (typeof normal_rate === 'number') extraTargetFields.normal_rate = normal_rate
        if (typeof delay_rate === 'number') extraTargetFields.delay_rate = delay_rate
        if (observations !== undefined) extraTargetFields.observations = observations ? String(observations) : null
        if (typeof total_progress === 'number') extraTargetFields.total_progress = total_progress
      }
      const { error: updErr } = await supabase
        .from('monthly_progress')
        .update({
          monthly_progress: patch.monthly_progress,
          ...(patch.status ? { status: patch.status as any } : {}),
          ...extraTargetFields
        } as any)
        .eq('id', patch.id)
      if (updErr) return jsonError(updErr.message, 400)
    }

    // Return full refreshed sequence for the site
    const { data: refreshed, error: refErr } = await supabase
      .from('monthly_progress')
      .select('*')
      .eq('site_id', siteId)
      .order('month', { ascending: true })

    if (refErr) return jsonError(refErr.message, 400)
    return jsonOk({ updatedSiteId: siteId, rows: refreshed })
  } catch (e: any) {
    return jsonError(e?.message || 'Erreur interne', 500)
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE (Remove row + Recompute subsequent cumulative)                      */
/* -------------------------------------------------------------------------- */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return jsonError("Paramètre 'id' requis", 400)
    }

    const supabase = getServiceSupabase()

    // Fetch row to get site
    const { data: row, error: rowErr } = await supabase
      .from('monthly_progress')
      .select('id, site_id')
      .eq('id', id)
      .single()
    if (rowErr) {
      if (rowErr.code === 'PGRST116') return jsonError('Ligne introuvable', 404)
      return jsonError(rowErr.message, 400)
    }
    const siteId = row.site_id

    const { error: delErr } = await supabase
      .from('monthly_progress')
      .delete()
      .eq('id', id)
    if (delErr) return jsonError(delErr.message, 400)

    // Recalc totals for remaining rows
    const { data: remaining, error: remErr } = await supabase
      .from('monthly_progress')
      .select('id, monthly_progress')
      .eq('site_id', siteId)
      .order('month', { ascending: true })
    if (remErr) return jsonError(remErr.message, 400)

    let cumulative = 0
    for (const r of remaining) {
      const mp = r.monthly_progress ?? 0
      cumulative += mp
      const { error: updErr } = await supabase
        .from('monthly_progress')
        .update({ total_progress: cumulative })
        .eq('id', r.id)
      if (updErr) return jsonError(updErr.message, 400)
    }

    return jsonOk({ deletedId: id, siteId })
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