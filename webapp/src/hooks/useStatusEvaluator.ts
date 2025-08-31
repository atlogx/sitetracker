/**
 * Status & demobilization evaluation logic (pure functions).
 *
 * Business Rules Recap:
 *  - Status (per monthly row) based on monthlyProgress (incremental):
 *      < 30%  => CRITICAL
 *      30%–49.999% => PROBLEMATIC
 *      >= 50% => GOOD
 *
 *  - Demobilization sequence (examines chronological cumulative progress of the
 *    first qualifying months of a project/site's lifecycle):
 *      Month 1: if totalProgress < 50%  -> stage 1 alert
 *      Month 2: if totalProgress < 30%  -> stage 2 pre-demobilization
 *      Month 3: if totalProgress < 30%  -> stage 3 demobilization
 *      Month 4: only if Month 3 totalProgress >= 30% AND Month 4 totalProgress < 50% -> stage 4 demobilization
 *    Demobilized if stage = 3 or 4.
 *
 *  - A demobilized project/site can be reactivated manually (outside logic).
 *
 *  - Missing data alert candidate: if current month (YYYY-MM) has no entry and
 *    today > 5th day of month -> missingData = true.
 *
 * This module does not perform any I/O (pure logic) so it can be used both
 * client and server side. You can wrap it in a React/Vue composable if needed.
 */

import type {
  MonthlyProgress,
  ProgressStatus,
  DemobilizationEvaluation,
  SiteStatusSnapshot,
  YearMonth
} from '@/types/models';

/* -------------------------------------------------------------------------- */
/*  Public API Interface                                                      */
/* -------------------------------------------------------------------------- */

export interface EvaluatedMonthlyRow extends MonthlyProgress {
  evaluatedStatus: ProgressStatus;
}

export interface EvaluateSiteParams {
  progressRows: MonthlyProgress[];
  now?: Date;                 // override for tests
  enforceSort?: boolean;      // if true, sorts by month ascending before evaluation
}

export interface SiteEvaluationResult extends DemobilizationEvaluation {
  latestStatus: ProgressStatus | null;
  latestMonth: YearMonth | undefined;
  totalProgress: number | undefined;
  monthlyProgress: number | undefined;
  missingData: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Core Pure Functions                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Compute the status from a monthly incremental progress percentage.
 */
export function computeStatus(monthlyProgress: number | null | undefined): ProgressStatus {
  if (monthlyProgress == null || isNaN(monthlyProgress)) return 'critical';
  if (monthlyProgress < 30) return 'critical';
  if (monthlyProgress < 50) return 'problematic';
  return 'good';
}

/**
 * Ensure rows are sorted chronologically ascending by their YearMonth string.
 * Accepts 'YYYY-MM'. Invalid formats fall back to lexical compare.
 */
export function sortByMonthAscending<T extends { month: YearMonth }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Derive missing data flag:
 *  - If there is no row for current YYYY-MM and today is > day 5, mark missing.
 */
export function detectMissingCurrentMonth(progressRows: MonthlyProgress[], now = new Date()): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYm: YearMonth = `${currentYear}-${currentMonth}`;
  const hasCurrent = progressRows.some(r => r.month === currentYm);
  if (hasCurrent) return false;
  return now.getDate() > 5;
}

/**
 * Evaluate demobilization stage from an ordered (ascending) list of progress rows.
 * Uses totalProgress for thresholds.
 */
export function evaluateDemobilization(progressHistory: MonthlyProgress[]): DemobilizationEvaluation {
  if (!progressHistory.length) {
    return { demobilizationStage: 0, demobilized: false };
  }

  const firstFour = progressHistory.slice(0, 4);
  let stage: DemobilizationEvaluation['demobilizationStage'] = 0;

  const getTotal = (idx: number) => firstFour[idx]?.totalProgress ?? null;

  const m1 = getTotal(0);
  const m2 = getTotal(1);
  const m3 = getTotal(2);
  const m4 = getTotal(3);

  if (m1 != null && m1 < 50) stage = 1;
  if (m2 != null && m2 < 30) stage = 2;
  if (m3 != null && m3 < 30) stage = 3;
  // Month 4 rule only if Month 3 >= 30
  if (m4 != null && m3 != null && m3 >= 30 && m4 < 50) stage = 4;

  const demobilized = stage === 3 || stage === 4;

  let alertLabel: string | undefined;
  switch (stage) {
    case 1:
      alertLabel = 'Alerte (Rendement insuffisant)';
      break;
    case 2:
      alertLabel = 'Pré-démobilisation';
      break;
    case 3:
    case 4:
      alertLabel = 'Projet démobilisé';
      break;
  }

  return { demobilizationStage: stage, demobilized, alertLabel };
}

/**
 * Evaluate a full site set of rows:
 *  - Sort (optional)
 *  - Compute statuses (if some rows not yet assigned)
 *  - Evaluate demobilization
 *  - Provide snapshot
 */
export function evaluateSiteStatus(params: EvaluateSiteParams): SiteEvaluationResult {
  const { progressRows, now = new Date(), enforceSort = true } = params;

  if (!progressRows.length) {
    return {
      demobilizationStage: 0,
      demobilized: false,
      latestStatus: null,
      latestMonth: undefined,
      totalProgress: undefined,
      monthlyProgress: undefined,
      missingData: detectMissingCurrentMonth(progressRows, now)
    };
  }

  const rows = enforceSort ? sortByMonthAscending(progressRows) : [...progressRows];

  // Normalize status field if missing
  rows.forEach(r => {
    if (!r.status) {
      (r as MonthlyProgress).status = computeStatus(r.monthlyProgress);
    }
  });

  const demob = evaluateDemobilization(rows);
  const latest = rows[rows.length - 1];

  return {
    ...demob,
    latestStatus: latest.status,
    latestMonth: latest.month,
    totalProgress: latest.totalProgress,
    monthlyProgress: latest.monthlyProgress,
    missingData: detectMissingCurrentMonth(rows, now)
  };
}

/* -------------------------------------------------------------------------- */
/*  Hook/Factory Export                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Factory style (mirrors a composable pattern). All functions are pure;
 * this wrapper simply provides a cohesive API surface.
 */
export function useStatusEvaluator() {
  return {
    computeStatus,
    evaluateDemobilization,
    evaluateSiteStatus,
    detectMissingCurrentMonth,
    sortByMonthAscending
  };
}

/* -------------------------------------------------------------------------- */
/*  Convenience for adapting DB rows (year/month integers)                    */
/* -------------------------------------------------------------------------- */

/**
 * Convert separate year + month integers (1-12) into YearMonth format.
 */
export function toYearMonth(year: number, month: number): YearMonth {
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}`;
}

/**
 * Given DB shaped tracking rows with year/month ints, map to MonthlyProgress
 * requiring a 'month' field (YYYY-MM). Provide a projector to integrate quickly.
 */
export interface DbMonthlyTrackingLike {
  id: string;
  site_id: string;
  month: string;  // YYYY-MM format
  total_progress: number | null;
  monthly_progress: number | null;
  target_rate: number | null;
  normal_rate: number | null;
  delay_rate: number | null;
  observations: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Map DB row to domain MonthlyProgress structure.
 * NOTE: Domain uses capitalized status variants; adapt mapping.
 */
export function mapDbTrackingToMonthlyProgress(db: DbMonthlyTrackingLike): MonthlyProgress {
  const mapStatus = (s: DbMonthlyTrackingLike['status']): ProgressStatus => {
    switch (s) {
      case 'critical': return 'critical';
      case 'problematic': return 'problematic';
      case 'good': return 'good';
      default: return 'critical';
    }
  };
  return {
    id: db.id,
    siteId: db.site_id,
    month: db.month,
    monthlyProgress: Number(db.monthly_progress || 0),
    totalProgress: Number(db.total_progress || 0),
    targetRate: Number(db.target_rate || 0),
    normalRate: db.normal_rate ? Number(db.normal_rate) : undefined,
    delayRate: db.delay_rate ? Number(db.delay_rate) : undefined,
    status: mapStatus(db.status),
    observations: db.observations ?? undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/* -------------------------------------------------------------------------- */
/*  Snapshot Helper                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Build a SiteStatusSnapshot directly (useful for caching on a Site object).
 */
export function buildSiteStatusSnapshot(progressRows: MonthlyProgress[], now = new Date()): SiteStatusSnapshot {
  const evalResult = evaluateSiteStatus({ progressRows, now });
  return {
    siteId: progressRows[0]?.siteId ?? '',
    siteName: '',
    currentStatus: evalResult.latestStatus ?? 'critical',
    latestStatus: evalResult.latestStatus ?? 'critical',
    latestProgress: evalResult.totalProgress ?? 0,
    monthlyTrend: 'stable',
    alertLevel: evalResult.demobilized ? 'critical' : 'none',
    lastUpdated: new Date().toISOString()
  };
}