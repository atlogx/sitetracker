/**
 * Types TypeScript basés sur la vraie structure de la base de données Supabase.
 * Ces types correspondent exactement aux tables et colonnes existantes.
 */

/* -------------------------------------------------------------------------- */
/*  Types de base de données (Raw DB Types)                                  */
/* -------------------------------------------------------------------------- */

export interface DatabaseOrganization {
  id: string;
  name: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProject {
  id: string;
  organization_id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  status: 'active' | 'demobilized' | 'remobilized';
  is_active: boolean;
  status_month?: string;
  status_month_minus_1?: string;
  status_month_minus_2?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSite {
  id: string;
  project_id: string;
  name: string;
  code?: string;
  address?: string;
  project_duration_months?: number;
  start_month?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseMonthlyProgress {
  id: string;
  site_id: string;
  month: string; // Format YYYY-MM
  total_progress: string; // Numeric in DB
  monthly_progress: string; // Numeric in DB
  target_rate: string; // Numeric in DB
  normal_rate: string; // Numeric in DB
  delay_rate: string; // Numeric in DB
  status: 'good' | 'problematic' | 'critical';
  observations?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseCompany {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAdministrator {
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

export interface DatabaseAlert {
  id: string;
  project_id: string;
  site_id: string | null;
  type: 'data_entry_delay' | 'problematic' | 'critical' | 'pre_demobilization' | 'demobilization';
  title: string;
  message: string;
  recipients: string[];
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  sent_date: string | null;
}

export interface DatabaseSiteCompany {
  id: string;
  site_id: string;
  company_id: string;
  created_at: string;
}

export interface DatabaseProjectAdministrator {
  id: string;
  project_id: string;
  administrator_id: string;
  created_at: string;
}

/* -------------------------------------------------------------------------- */
/*  Types enrichis avec relations (pour les requêtes jointures)              */
/* -------------------------------------------------------------------------- */

export interface ProjectWithRelations extends DatabaseProject {
  organization?: DatabaseOrganization;
  sites?: SiteWithRelations[];
}

export interface SiteWithRelations extends DatabaseSite {
  project?: DatabaseProject;
  monthly_progress?: DatabaseMonthlyProgress[];
  site_companies?: {
    company: DatabaseCompany;
  }[];
}

export interface AlertWithRelations extends DatabaseAlert {
  project?: DatabaseProject;
  site?: DatabaseSite;
}

export interface AdministratorWithRelations extends DatabaseAdministrator {
  organization?: DatabaseOrganization;
}

/* -------------------------------------------------------------------------- */
/*  Types de domaine métier (pour l'UI)                                      */
/* -------------------------------------------------------------------------- */

export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  status: 'active' | 'demobilized' | 'remobilized';
  isActive: boolean;
  globalStatus: 'ACTIVE' | 'DEMOBILIZED';
  organizationId: string;
  organizationName?: string;
  createdAt: string;
  updatedAt: string;
  sites: Site[];
  administrators: Administrator[];
  // Stats calculées
  totalSites: number;
  activeSites?: number;
  averageProgress?: number;
  criticalSites?: number;
  problematicSites?: number;
  goodSites?: number;
  // Derniers statuts mensuels (M, M-1, M-2)
  statusMonth?: ProgressStatus;
  statusMonthMinus1?: ProgressStatus;
  statusMonthMinus2?: ProgressStatus;
  // Agrégation
  aggregate?: {
    totalSites?: number;
    activeSites?: number;
    completedSites?: number;
    averageProgress?: number;
  };
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
  code?: string;
  address?: string;
  projectDurationMonths?: number;
  startMonth?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  companies: Company[];
  administrators?: Administrator[];
  monthlyProgress?: MonthlyProgress[];
  // Dernière évaluation
  latestProgress?: MonthlyProgress;
  currentStatus?: ProgressStatus;
  latestEvaluation?: {
    status: ProgressStatus;
    month: string;
    progress: number;
    timestamp: string;
  };
}

export interface MonthlyProgress {
  id: string;
  siteId: string;
  month: string; // YYYY-MM
  totalProgress: number;
  monthlyProgress: number;
  targetRate: number;
  normalRate?: number;
  delayRate?: number;
  status: ProgressStatus;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Administrator {
  id: string;
  organizationId?: string;
  name: string;
  phone?: string;
  email: string;
  role: 'org-level' | 'project-level';
  position?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  projectId: string;
  siteId?: string;
  type: AlertType;
  title: string;
  message: string;
  recipients: string[];
  resolved: boolean;
  createdAt: string;
  resolvedAt?: string;
  // Relations
  projectName?: string;
  siteName?: string;
}

export interface Organization {
  id: string;
  name: string;
  address?: string;
  administrators: Administrator[];
  createdAt: string;
  updatedAt: string;
  // Stats
  projectCount?: number;
  siteCount?: number;
}

/* -------------------------------------------------------------------------- */
/*  Types énumérés                                                           */
/* -------------------------------------------------------------------------- */

export type ProgressStatus = 'good' | 'problematic' | 'critical';

export type ProjectStatus = 'active' | 'demobilized' | 'remobilized';

export type AlertType = 'data_missing' | 'progress_alert' | 'pre_demobilization' | 'demobilization';

export type AdministratorRole = 'org-level' | 'project-level';

/* -------------------------------------------------------------------------- */
/*  Types pour les statistiques et dashboards                               */
/* -------------------------------------------------------------------------- */

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  demobilizedProjects: number;
  pendingAlerts: number;
  averageProgress: number;
}

export interface ProjectStats {
  totalSites: number;
  activeSites: number;
  averageProgress: number;
  criticalSites: number;
  problematicSites: number;
  goodSites: number;
  siteProgress: SiteProgressSummary[];
}

export interface SiteStatusSnapshot {
  siteId: string;
  siteName: string;
  currentStatus: ProgressStatus;
  latestStatus: ProgressStatus;
  latestProgress: number;
  monthlyTrend: 'up' | 'down' | 'stable';
  alertLevel?: 'none' | 'watch' | 'warning' | 'critical';
  lastUpdated: string;
  latestMonth?: string;
  totalProgress?: number;
  monthlyProgress?: number;
  missingData?: boolean;
  demobilizationStage?: number;
  demobilized?: boolean;
  alertLabel?: string;
}

export interface DemobilizationEvaluation {
  siteId?: string;
  siteName?: string;
  demobilizationStage: number;
  demobilized: boolean;
  alertLabel?: string;
  shouldDemobilize?: boolean;
  demobilizationReason?: string;
  monthsInCritical?: number;
  lastThreeMonthsProgress?: number[];
  recommendedAction?: 'continue' | 'warning' | 'pre_demobilization' | 'demobilization';
}

export interface ProjectDashboard {
  project: Project;
  sites: Site[];
  siteSnapshots: SiteStatusSnapshot[];
  demobilizationEvaluations: DemobilizationEvaluation[];
  alerts: Alert[];
  summary: {
    totalSites: number;
    activeSites: number;
    criticalSites: number;
    problematicSites: number;
    goodSites: number;
    averageProgress: number;
    alertCount: number;
  };
}

export interface SiteProgressSummary {
  siteId: string;
  siteName: string;
  latestProgress: number;
  latestStatus: ProgressStatus;
  latestMonth: string;
}

/* -------------------------------------------------------------------------- */
/*  Types utilitaires                                                        */
/* -------------------------------------------------------------------------- */

export type YearMonth = string; // Format: 'YYYY-MM'

/* -------------------------------------------------------------------------- */
/*  Types pour l'évaluation de statut                                        */
/* -------------------------------------------------------------------------- */

export interface EvaluateSiteParams {
  progressRows: MonthlyProgress[];
  now?: Date;
  enforceSort?: boolean;
}

export interface SiteEvaluationResult {
  demobilizationStage: number;
  demobilized: boolean;
  latestStatus: ProgressStatus | null;
  latestMonth: string | undefined;
  totalProgress: number | undefined;
  monthlyProgress: number | undefined;
  missingData: boolean;
  alertLabel?: string;
}

// Type guard pour vérifier le format YearMonth
export function isYearMonth(value: string): value is YearMonth {
  return /^\d{4}-\d{2}$/.test(value);
}

// Fonctions utilitaires pour la conversion des types
export function convertProgressStatus(dbStatus: string): ProgressStatus {
  switch (dbStatus) {
    case 'good':
      return 'good';
    case 'problematic':
      return 'problematic';
    case 'critical':
      return 'critical';
    default:
      return 'good';
  }
}

export function convertProjectStatus(dbStatus: string): ProjectStatus {
  switch (dbStatus) {
    case 'active':
      return 'active';
    case 'demobilized':
      return 'demobilized';
    case 'remobilized':
      return 'remobilized';
    default:
      return 'active';
  }
}

export function convertAlertType(dbType: string): AlertType {
  switch (dbType) {
    case 'data_entry_delay':
      return 'data_missing';
    case 'problematic':
      return 'progress_alert';
    case 'critical':
      return 'progress_alert';
    case 'pre_demobilization':
      return 'pre_demobilization';
    case 'demobilization':
      return 'demobilization';
    default:
      return 'progress_alert';
  }
}

// Fonctions de conversion des données DB vers types métier
export function convertDatabaseToProject(dbProject: ProjectWithRelations, administrators: Administrator[] = []): Project {
  const sites = (dbProject.sites || []).map(convertDatabaseToSite);
  
  // Calcul des stats
  const totalSites = sites.length;
  const activeSites = sites.filter(site => site.isActive).length;
  
  const latestProgressData = sites
    .map(site => site.latestProgress?.totalProgress)
    .filter((progress): progress is number => progress !== undefined);
  
  const averageProgress = latestProgressData.length > 0
    ? Math.round(latestProgressData.reduce((sum, progress) => sum + progress, 0) / latestProgressData.length)
    : undefined;
  
  const criticalSites = sites.filter(site => site.currentStatus === 'critical').length;
  const problematicSites = sites.filter(site => site.currentStatus === 'problematic').length;
  const goodSites = sites.filter(site => site.currentStatus === 'good').length;

  return {
    id: dbProject.id,
    name: dbProject.name,
    ownerName: dbProject.owner_name,
    ownerEmail: dbProject.owner_email,
    ownerPhone: dbProject.owner_phone,
    status: convertProjectStatus(dbProject.status),
    isActive: dbProject.is_active,
    globalStatus: dbProject.status === 'demobilized' ? 'DEMOBILIZED' : 'ACTIVE',
    organizationId: dbProject.organization_id,
    organizationName: dbProject.organization?.name,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
    sites,
    administrators,
    totalSites,
    activeSites,
    averageProgress,
    criticalSites,
    problematicSites,
    goodSites,
    // Mapping des statuts mensuels (si présents en base)
    statusMonth: dbProject.status_month ? convertProgressStatus(dbProject.status_month) : undefined,
    statusMonthMinus1: dbProject.status_month_minus_1 ? convertProgressStatus(dbProject.status_month_minus_1) : undefined,
    statusMonthMinus2: dbProject.status_month_minus_2 ? convertProgressStatus(dbProject.status_month_minus_2) : undefined
  };
}

export function convertDatabaseToSite(dbSite: SiteWithRelations): Site {
  const monthlyProgress = (dbSite.monthly_progress || []).map(convertDatabaseToMonthlyProgress);
  const companies = (dbSite.site_companies || []).map(sc => convertDatabaseToCompany(sc.company));
  
  // Trouver la dernière progression
  const latestProgress = monthlyProgress.length > 0
    ? monthlyProgress.sort((a, b) => b.month.localeCompare(a.month))[0]
    : undefined;
  
  const currentStatus = latestProgress?.status;

  return {
    id: dbSite.id,
    projectId: dbSite.project_id,
    name: dbSite.name,
    code: dbSite.code,
    address: dbSite.address,
    projectDurationMonths: dbSite.project_duration_months,
    startMonth: dbSite.start_month,
    isActive: dbSite.is_active,
    createdAt: dbSite.created_at,
    updatedAt: dbSite.updated_at,
    companies,
    monthlyProgress,
    latestProgress,
    currentStatus
  };
}

export function convertDatabaseToMonthlyProgress(dbProgress: DatabaseMonthlyProgress): MonthlyProgress {
  return {
    id: dbProgress.id,
    siteId: dbProgress.site_id,
    month: dbProgress.month,
    totalProgress: Number(dbProgress.total_progress),
    monthlyProgress: Number(dbProgress.monthly_progress),
    targetRate: Number(dbProgress.target_rate),
    normalRate: Number(dbProgress.normal_rate),
    delayRate: Number(dbProgress.delay_rate),
    status: convertProgressStatus(dbProgress.status),
    observations: dbProgress.observations,
    createdAt: dbProgress.created_at,
    updatedAt: dbProgress.updated_at
  };
}

export function convertDatabaseToCompany(dbCompany: DatabaseCompany): Company {
  return {
    id: dbCompany.id,
    name: dbCompany.name,
    email: dbCompany.email,
    phone: dbCompany.phone,
    address: dbCompany.address,
    createdAt: dbCompany.created_at,
    updatedAt: dbCompany.updated_at
  };
}

export function convertDatabaseToAlert(dbAlert: AlertWithRelations): Alert {
  return {
    id: dbAlert.id,
    projectId: dbAlert.project_id,
    siteId: dbAlert.site_id || undefined,
    type: convertAlertType(dbAlert.type),
    title: dbAlert.title,
    message: dbAlert.message,
    recipients: dbAlert.recipients,
    resolved: dbAlert.status === 'sent',
    createdAt: dbAlert.created_at,
    resolvedAt: dbAlert.sent_date || undefined,
    projectName: dbAlert.project?.name,
    siteName: dbAlert.site?.name
  };
}

export function convertDatabaseToOrganization(dbOrg: DatabaseOrganization, administrators: Administrator[] = []): Organization {
  return {
    id: dbOrg.id,
    name: dbOrg.name,
    address: dbOrg.address,
    administrators,
    createdAt: dbOrg.created_at,
    updatedAt: dbOrg.updated_at
  };
}

/* -------------------------------------------------------------------------- */
/*  Types pour les formulaires d'entrée                                      */
/* -------------------------------------------------------------------------- */

export interface UpsertOrganizationInput {
  name: string;
  address?: string;
}

export interface UpsertAdministratorInput {
  name: string;
  email: string;
  phone?: string;
  position: string;
  role: 'org-level' | 'project-level';
  organizationId?: string;
}

export interface UpsertProjectInput {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string;
  organizationId: string;
}

export interface UpsertSiteInput {
  name: string;
  code?: string;
  address?: string;
  projectId: string;
  projectDurationMonths?: number;
  startMonth?: string;
  company?: UpsertCompanyInput;
}

export interface UpsertCompanyInput {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}