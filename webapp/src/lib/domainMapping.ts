/**
 * Domain Mapping Utilities
 *
 * Purpose:
 *  Transform raw database rows (Supabase) into the internal domain model
 *  interfaces defined in `src/types/models.ts`.
 *
 * Principles:
 *  - Mapping functions are pure: no network / side-effects.
 *  - All DB-specific field naming is normalized to domain conventions.
 *  - Optional evaluation of site demobilization & status snapshots.
 *
 * Usage:
 *  Import the specific mapping helpers that match the already-joined shape
 *  you retrieved via Supabase queries (e.g. projects with nested sites,
 *  sites with company_sites -> company, etc.).
 */

import type {
  Organization,
  Project,
  Site,
  Company,
  MonthlyProgress,
  ProgressStatus,
  YearMonth,
  SiteStatusSnapshot,
  DemobilizationEvaluation,
  ProjectDashboard
} from '@/types/models';
import {
  buildSiteStatusSnapshot,
  evaluateSiteStatus,
  toYearMonth,
  computeStatus
} from '@/hooks/useStatusEvaluator'; // NOTE: pure functions (no React state)

/* -------------------------------------------------------------------------- */
/*  Raw Row Type Hints (subset)                                               */
/* -------------------------------------------------------------------------- */
/**
 * Define minimal structural types expected from Supabase select() calls.
 * This keeps the mapping layer decoupled from the generated types file,
 * while still providing editor assist.
 */

export interface DbOrganizationRow {
  id: string;
  name: string;
  code: string | null;
  general_director_name: string;
  general_director_email: string;
  general_director_phone: string;
  financial_service_name: string;
  financial_service_email: string;
  financial_service_phone: string;
  created_at: string;
  updated_at: string;
}

export interface DbProjectRow {
  id: string;
  name: string;
  code: string | null;
  organization_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  is_active: boolean;
  status: 'active' | 'demobilized' | 'remobilized';
  created_at: string;
  updated_at: string;
  // Optional embedded
  sites?: DbSiteRow[];
  organization?: DbOrganizationRow;
  project_administrators?: {
    administrator: DbAdministratorRow;
  }[];
}

export interface DbSiteRow {
  id: string;
  name: string;
  code: string | null;
  address: string;
  project_id: string;
  project_duration_months?: number;
  start_month?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company_sites?: {
    company: DbCompanyRow;
  }[];
}

export interface DbCompanyRow {
  id: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  created_at: string;
  updated_at: string;
}

export interface DbAdministratorRow {
  id: string;
  organization_id?: string;
  name: string;
  phone?: string;
  email: string;
  role: 'org-level' | 'project-level';
  position?: string;
  created_at: string;
  updated_at: string;
}

export interface DbMonthlyProgressRow {
  id: string;
  site_id: string;
  month: string; // YYYY-MM format
  total_progress: number | null;
  monthly_progress: number | null;
  normal_rate: number | null;
  target_rate: number | null;
  delay_rate: number | null;
  observations: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Status + Format Helpers                                                   */
/* -------------------------------------------------------------------------- */

export function normalizeProgressStatus(db: 'good' | 'problematic' | 'critical'): ProgressStatus {
  switch (db) {
    case 'critical':
      return 'critical';
    case 'problematic':
      return 'problematic';
    case 'good':
      return 'good';
  }
}

export function toYearMonthString(year: number, month: number): YearMonth {
  return toYearMonth(year, month);
}

export function computeRowStatus(monthlyProgress: number | null | undefined): ProgressStatus {
  return computeStatus(monthlyProgress ?? 0);
}

/* -------------------------------------------------------------------------- */
/*  Company Mapping                                                           */
/* -------------------------------------------------------------------------- */

export function mapCompany(row: DbCompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    address: row.address || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/* -------------------------------------------------------------------------- */
/*  Monthly Tracking Mapping                                                  */
/* -------------------------------------------------------------------------- */

export function mapMonthlyTracking(row: DbMonthlyProgressRow): MonthlyProgress {
  return {
    id: row.id,
    siteId: row.site_id,
    month: row.month,
    monthlyProgress: row.monthly_progress ?? 0,
    totalProgress: row.total_progress ?? 0,
    targetRate: row.target_rate ?? 0,
    normalRate: row.normal_rate ?? 0,
    delayRate: row.delay_rate ?? 0,
    observations: row.observations ?? undefined,
    status: normalizeProgressStatus((row.status as 'good' | 'problematic' | 'critical') || 'good'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function groupMonthlyTrackingBySite(
  rows: DbMonthlyProgressRow[]
): Record<string, MonthlyProgress[]> {
  return rows.reduce<Record<string, MonthlyProgress[]>>((acc, r) => {
    const mp = mapMonthlyTracking(r);
    (acc[mp.siteId] = acc[mp.siteId] || []).push(mp);
    return acc;
  }, {});
}

/* -------------------------------------------------------------------------- */
/*  Site Mapping                                                              */
/* -------------------------------------------------------------------------- */

export interface MapSiteOptions {
  /**
   * Provide already-grouped progress to attach snapshot evaluation.
   */
  progressRows?: MonthlyProgress[];
  /**
   * If true, attaches a computed latestEvaluation snapshot.
   */
  evaluateStatus?: boolean;
}

export function mapSite(row: DbSiteRow, options: MapSiteOptions = {}): Site {
  const companies =
    row.company_sites?.map(cs => mapCompany(cs.company)).filter(Boolean) ?? [];

  let latestEvaluation: { status: ProgressStatus; month: string; progress: number; timestamp: string; } | undefined;

  if (options.evaluateStatus && options.progressRows) {
    const snapshot = buildSiteStatusSnapshot(options.progressRows);
    if (snapshot) {
      latestEvaluation = {
        status: snapshot.currentStatus,
        month: snapshot.lastUpdated.substring(0, 7), // Extract YYYY-MM
        progress: snapshot.latestProgress,
        timestamp: snapshot.lastUpdated
      };
    }
  }

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    code: row.code || undefined,
    address: row.address || undefined,
    projectDurationMonths: row.project_duration_months,
    startMonth: row.start_month,
    companies,
    administrators: [], // Not modeled at DB level yet in current schema
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestEvaluation
  };
}

/* -------------------------------------------------------------------------- */
/*  Organization Mapping                                                      */
/* -------------------------------------------------------------------------- */

export function mapOrganization(row: DbOrganizationRow): Organization {
  // Convert the two top-level admin roles into unified Administrator[] domain
  const administrators = [
    {
      id: `org-${row.id}-general-director`,
      name: row.general_director_name,
      email: row.general_director_email,
      phone: row.general_director_phone,
      role: 'org-level' as const,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    },
    {
      id: `org-${row.id}-finance`,
      name: row.financial_service_name,
      email: row.financial_service_email,
      phone: row.financial_service_phone,
      role: 'org-level' as const,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  ];

  return {
    id: row.id,
    name: row.name,
    address: '', // DB currently lacks address field; can be extended later
    administrators,
    projectCount: undefined,
    siteCount: undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/* -------------------------------------------------------------------------- */
/*  Project Mapping                                                           */
/* -------------------------------------------------------------------------- */

export interface MapProjectOptions {
  /**
   * Provide pre-grouped monthly progress rows for each site keyed by siteId.
   */
  progressBySite?: Record<string, MonthlyProgress[]>;
  /**
   * If true, each site gets a status snapshot.
   */
  evaluateSites?: boolean;
}

export function mapProject(row: DbProjectRow, options: MapProjectOptions = {}): Project {
  const {
    progressBySite = {},
    evaluateSites = false
  } = options;

  // Map nested sites if present
  const mappedSites: Site[] =
    row.sites?.map(siteRow =>
      mapSite(siteRow, {
        progressRows: progressBySite[siteRow.id],
        evaluateStatus: evaluateSites
      })
    ) ?? [];

  // Map administrators from database
  const administrators = row.project_administrators?.map(pa => ({
    id: pa.administrator.id,
    organizationId: pa.administrator.organization_id,
    name: pa.administrator.name,
    email: pa.administrator.email,
    phone: pa.administrator.phone,
    role: pa.administrator.role,
    position: pa.administrator.position,
    createdAt: pa.administrator.created_at,
    updatedAt: pa.administrator.updated_at
  })) ?? [];

  // Aggregate site statuses for convenience
  const aggregate = buildProjectAggregate(mappedSites, progressBySite);

  return {
    id: row.id,
    name: row.name,
    code: row.code || undefined,
    description: undefined,
    address: undefined,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerPhone: row.owner_phone,
    totalSites: mappedSites.length,
    isActive: row.is_active,
    status: row.status || 'active',
    globalStatus: row.status === 'demobilized' ? 'DEMOBILIZED' : 'ACTIVE',
    organizationId: row.organization_id,
    sites: mappedSites,
    administrators,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    aggregate
  };
}

/* -------------------------------------------------------------------------- */
/*  Aggregation Helpers                                                       */
/* -------------------------------------------------------------------------- */

export interface ProjectAggregate {
  averageTotalProgress?: number;
  criticalSites?: number;
  problematicSites?: number;
  goodSites?: number;
  lastUpdatedAt?: string;
}

export function buildProjectAggregate(
  sites: Site[],
  progressBySite: Record<string, MonthlyProgress[]>
): Project['aggregate'] {
  if (!sites.length) return {};

  let totalSum = 0;
  let totalCount = 0;
  sites.forEach(site => {
    const rows = progressBySite[site.id] || [];
    if (rows.length) {
      const latest = rows.slice().sort((a, b) => a.month.localeCompare(b.month))[rows.length - 1];
      totalSum += latest.totalProgress;
      totalCount += 1;
    }
  });

  return {
    totalSites: sites.length,
    activeSites: sites.filter(s => s.isActive).length,
    completedSites: undefined,
    averageProgress: totalCount ? round(totalSum / totalCount, 1) : undefined
  };
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Construction                                                    */
/* -------------------------------------------------------------------------- */

export function buildProjectDashboard(
  project: Project,
  siteId: string | undefined,
  progressBySite: Record<string, MonthlyProgress[]>
): ProjectDashboard {
  
  // Build site snapshots
  const siteSnapshots: SiteStatusSnapshot[] = project.sites.map(site => {
    const siteProgressRows = progressBySite[site.id] || [];
    return buildSiteStatusSnapshot(siteProgressRows) || {
      siteId: site.id,
      siteName: site.name,
      currentStatus: 'good' as ProgressStatus,
      latestProgress: 0,
      monthlyTrend: 'stable' as const,
      lastUpdated: new Date().toISOString()
    };
  });

  // Build demobilization evaluations
  const demobilizationEvaluations: DemobilizationEvaluation[] = project.sites.map(site => {
    const siteProgressRows = progressBySite[site.id] || [];
    return evaluateSiteStatus({ progressRows: siteProgressRows });
  });

  // Calculate summary
  const totalSites = project.sites.length;
  const activeSites = project.sites.filter(s => s.isActive).length;
  const criticalSites = siteSnapshots.filter(s => s.currentStatus === 'critical').length;
  const problematicSites = siteSnapshots.filter(s => s.currentStatus === 'problematic').length;
  const goodSites = siteSnapshots.filter(s => s.currentStatus === 'good').length;
  const averageProgress = siteSnapshots.length > 0 
    ? siteSnapshots.reduce((sum, s) => sum + s.latestProgress, 0) / siteSnapshots.length 
    : 0;

  return {
    project,
    sites: project.sites,
    siteSnapshots,
    demobilizationEvaluations,
    alerts: [], // TODO: Add alerts logic
    summary: {
      totalSites,
      activeSites,
      criticalSites,
      problematicSites,
      goodSites,
      averageProgress,
      alertCount: 0 // TODO: Add alert count
    }
  };
}

/* -------------------------------------------------------------------------- */
/*  Utility                                                                   */
/* -------------------------------------------------------------------------- */

function round(value: number, decimals = 2): number {
  const p = 10 ** decimals;
  return Math.round(value * p) / p;
}

/* -------------------------------------------------------------------------- */
/*  Bulk Mapping                                                              */
/* -------------------------------------------------------------------------- */

export interface BulkMapProjectsParams {
  projectRows: DbProjectRow[];
  trackingRows?: DbMonthlyProgressRow[];
  /**
   * If true, attach site evaluation snapshots.
   */
  evaluateSites?: boolean;
}

export function bulkMapProjects(params: BulkMapProjectsParams): Project[] {
  const { projectRows, trackingRows = [], evaluateSites = true } = params;
  const grouped = groupMonthlyTrackingBySite(trackingRows);

  return projectRows.map(pr =>
    mapProject(pr, { progressBySite: grouped, evaluateSites })
  );
}

/* -------------------------------------------------------------------------- */
/*  Example (Documentation Only - Not Executed)                               */
/* -------------------------------------------------------------------------- */
/**
 * Example Supabase select you can use with these mappers:
 *
 * const { data: projectRows } = await supabase
 *   .from('projects')
 *   .select(`
 *     *,
 *     sites(*, company_sites(company:companies(*)))
 *   `);
 *
 * const { data: trackingRows } = await supabase
 *   .from('monthly_progress')
 *   .select('*')
 *   .in('site_id', projectRows.flatMap(p => p.sites.map(s => s.id)));
 *
 * const domainProjects = bulkMapProjects({
 *   projectRows,
 *   trackingRows
 * });
 *
 * // Then build a dashboard for a given project + site:
 * const dashboard = buildProjectDashboard(
 *   domainProjects[0],
 *   selectedSiteId,
 *   groupMonthlyTrackingBySite(trackingRows)
 * );
 */
