import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables d\'environnement Supabase manquantes. Vérifiez votre fichier .env.local et assurez-vous que NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies.'
  );
}

// Utilisation côté client: createBrowserClient pour synchroniser les cookies (HTTPOnly) et supporter le refresh SSR.
// Utilisation côté serveur (Edge / RSC): fallback sur createClient classique.
const supabase =
  typeof window === 'undefined'
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createBrowserClient(supabaseUrl, supabaseAnonKey, {
        cookieOptions: {
          name: 'sb-auth',
          path: '/',
          sameSite: 'lax'
        }
      });

export { supabase };

// Re-export types from models
import type {
  DatabaseProject,
  DatabaseSite,
  DatabaseMonthlyProgress,
  DatabaseOrganization,
  DatabaseAlert,
  DatabaseCompany,
  DatabaseAdministrator,
  ProjectWithRelations,
  SiteWithRelations,
  AlertWithRelations
} from '@/types/models';

export type {
  DatabaseProject,
  DatabaseSite,
  DatabaseMonthlyProgress,
  DatabaseOrganization,
  DatabaseAlert,
  DatabaseCompany,
  DatabaseAdministrator,
  ProjectWithRelations,
  SiteWithRelations,
  AlertWithRelations
};

// Organizations service
export const organizationsService = {
  async getAll() {
    const response = await fetch('/api/organization');
    if (!response.ok) {
      throw new Error('Failed to fetch organizations');
    }
    const result = await response.json();
    return result.data;
  },

  async getById(id: string) {
    const response = await fetch(`/api/organization?id=${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch organization');
    }
    const result = await response.json();
    return result.data;
  },

  async update(id: string, updates: Partial<Pick<DatabaseOrganization, 'name' | 'address'>>) {
    const response = await fetch('/api/organization', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...updates }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update organization');
    }
    
    const result = await response.json();
    return result.data;
  }
};

// Projects service
export const projectsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*),
        sites(
          *,
          monthly_progress(*)
        ),
        project_administrators(
          administrator:administrators(*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*),
        sites(
          *,
          monthly_progress(*),
          company_sites(
            company:companies(*)
          )
        ),
        project_administrators(
          administrator:administrators(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByOrganization(organizationId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*),
        sites(*),
        project_administrators(
          administrator:administrators(*)
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getBySlug(slug: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*),
        sites(
          *,
          monthly_progress(*),
          company_sites(
            company:companies(*)
          )
        ),
        project_administrators(
          administrator:administrators(*)
        )
      `)
      .eq('slug', slug)
      .single();
    
    if (error) throw error;
    return data;
  },
  async create(
    payload: Pick<DatabaseProject,
      'name' | 'owner_name' | 'owner_email' | 'organization_id' | 'slug'
    > & Partial<Pick<DatabaseProject, 'owner_phone' | 'code'>>
  ): Promise<DatabaseProject> {
    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select()
      .single<DatabaseProject>();
    if (error) throw error;
    return data as DatabaseProject;
  },

  async update(
    id: string,
    payload: Partial<Pick<DatabaseProject,
      'name' | 'owner_name' | 'owner_email' | 'owner_phone' | 'status' | 'is_active' | 'slug' | 'code'
    >>
  ): Promise<DatabaseProject> {
    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .select()
      .single<DatabaseProject>();
    if (error) throw error;
    return data as DatabaseProject;
  }
};

// Sites service
export const sitesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('sites')
      .select(`
        *,
        project:projects(*),
        company_sites(
          company:companies(*)
        ),
        monthly_progress(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('sites')
      .select(`
        *,
        company_sites(
          company:companies(*)
        ),
        monthly_progress(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('sites')
      .select(`
        *,
        project:projects(*),
        company_sites(
          company:companies(*)
        ),
        monthly_progress(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getBySlug(projectSlug: string, siteSlug: string) {
    const { data, error } = await supabase
      .from('sites')
      .select(`
        *,
        project:projects!inner(*),
        company_sites(
          company:companies(*)
        ),
        monthly_progress(*)
      `)
      .eq('slug', siteSlug)
      .eq('project.slug', projectSlug)
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Companies service
export const companiesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};

// Monthly progress service
export const monthlyProgressService = {
  async getAll() {
    const { data, error } = await supabase
      .from('monthly_progress')
      .select(`
        *,
        site:sites(
          *,
          project:projects(*)
        )
      `)
      .order('month', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getBySite(siteId: string) {
    const { data, error } = await supabase
      .from('monthly_progress')
      .select('*')
      .eq('site_id', siteId)
      .order('month', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('monthly_progress')
      .select(`
        *,
        site:sites!inner(*)
      `)
      .eq('site.project_id', projectId)
      .order('month', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByMonth(month: string) {
    const { data, error } = await supabase
      .from('monthly_progress')
      .select(`
        *,
        site:sites(
          *,
          project:projects(*)
        )
      `)
      .eq('month', month)
      .order('total_progress', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async create(progressData: Omit<DatabaseMonthlyProgress, 'id' | 'created_at' | 'updated_at'>) {
    // Convert numbers to strings for database storage
    const dbData = {
      ...progressData,
      total_progress: progressData.total_progress?.toString(),
      monthly_progress: progressData.monthly_progress?.toString(),
      target_rate: progressData.target_rate?.toString(),
      normal_rate: progressData.normal_rate?.toString(),
      delay_rate: progressData.delay_rate?.toString(),
    };

    const { data, error } = await supabase
      .from('monthly_progress')
      .insert(dbData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, progressData: Partial<DatabaseMonthlyProgress>) {
    // Convert numbers to strings for database storage
    const dbData = { ...progressData };
    if (progressData.total_progress !== undefined) {
      dbData.total_progress = progressData.total_progress?.toString();
    }
    if (progressData.monthly_progress !== undefined) {
      dbData.monthly_progress = progressData.monthly_progress?.toString();
    }
    if (progressData.target_rate !== undefined) {
      dbData.target_rate = progressData.target_rate?.toString();
    }
    if (progressData.normal_rate !== undefined) {
      dbData.normal_rate = progressData.normal_rate?.toString();
    }
    if (progressData.delay_rate !== undefined) {
      dbData.delay_rate = progressData.delay_rate?.toString();
    }

    const { data, error } = await supabase
      .from('monthly_progress')
      .update(dbData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async upsert(progressData: {
    site_id: string;
    month: string;
    total_progress?: number | string;
    monthly_progress?: number | string;
    target_rate?: number | string;
    normal_rate?: number | string;
    delay_rate?: number | string;
    status: 'good' | 'problematic' | 'critical';
    observations?: string | null;
  }) {
    // Convert domain types to database types
    const dbData = {
      site_id: progressData.site_id,
      month: progressData.month,
      total_progress: progressData.total_progress?.toString(),
      monthly_progress: progressData.monthly_progress?.toString(),
      target_rate: progressData.target_rate?.toString(),
      normal_rate: progressData.normal_rate?.toString(),
      delay_rate: progressData.delay_rate?.toString(),
      status: progressData.status,
      observations: progressData.observations ?? undefined,
    };

    // First try to find existing record
    const { data: existing, error } = await supabase
      .from('monthly_progress')
      .select('id')
      .eq('site_id', dbData.site_id)
      .eq('month', dbData.month)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (existing) {
      // Update existing record
      return this.update(existing.id, dbData);
    } else {
      // Create new record
      return this.create(dbData as Omit<DatabaseMonthlyProgress, 'id' | 'created_at' | 'updated_at'>);
    }
  }
};

// Alerts service
export const alertsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        project:projects(*),
        site:sites(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        site:sites(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getUnresolved() {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        project:projects(*),
        site:sites(*)
      `)
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

// Administrators service
export const administratorsService = {
  async getAll() {
    const response = await fetch('/api/administrators');
    if (!response.ok) {
      throw new Error('Failed to fetch administrators');
    }
    const result = await response.json();
    return result.data;
  },

  async getById(id: string) {
    const response = await fetch(`/api/administrators?id=${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch administrator');
    }
    const result = await response.json();
    return result.data;
  },

  async getByOrganization(organizationId: string) {
    const response = await fetch(`/api/administrators?organizationId=${encodeURIComponent(organizationId)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch administrators by organization');
    }
    const result = await response.json();
    return result.data;
  },

  async getByProject(projectId: string) {
    const { data, error } = await supabase
      .from('project_administrators')
      .select(`
        administrator:administrators(*)
      `)
      .eq('project_id', projectId);
    
    if (error) throw error;
    return data?.map((item: any) => item.administrator) || [];
  },

  async create(adminData: {
    name: string;
    email: string;
    phone?: string;
    position?: string;
    role: 'org-level' | 'project-level';
    organization_id: string;
  }) {
    const response = await fetch('/api/administrators', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(adminData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to create administrator');
    }
    
    const result = await response.json();
    return result.data;
  },

  async update(id: string, updates: Partial<{
    name: string;
    email: string;
    phone: string;
    position: string;
    role: 'org-level' | 'project-level';
  }>) {
    const response = await fetch('/api/administrators', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...updates }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to update administrator');
    }
    
    const result = await response.json();
    return result.data;
  },

  async delete(id: string) {
    const response = await fetch(`/api/administrators?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to delete administrator');
    }
    
    const result = await response.json();
    return result.data;
  }
};

// Statistics service
export const statisticsService = {
  async getDashboard() {
    // Total projects count
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });

    // Active projects count
    const { count: activeProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Unresolved alerts count
    const { count: pendingAlerts } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);

    // Recent progress data for average
    const { data: recentProgress } = await supabase
      .from('monthly_progress')
      .select('total_progress')
      .order('created_at', { ascending: false })
      .limit(50);

    const averageProgress = recentProgress?.length 
      ? Math.round(
          recentProgress.reduce((sum: number, item: any) => sum + Number(item.total_progress), 0) / 
          recentProgress.length
        )
      : 0;

    return {
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      demobilizedProjects: (totalProjects || 0) - (activeProjects || 0),
      pendingAlerts: pendingAlerts || 0,
      averageProgress
    };
  },

  async getProjectStats(projectId: string) {
    // Get all sites for the project
    const { data: sites } = await supabase
      .from('sites')
      .select(`
        *,
        monthly_progress(*)
      `)
      .eq('project_id', projectId);

    if (!sites) return null;

    // Calculate aggregated stats
    const totalSites = sites.length;
    const activeSites = sites.filter((site: any) => site.is_active).length;

    // Get latest progress for each site
    const siteProgress = sites.map((site: any) => {
      const progressData = site.monthly_progress as DatabaseMonthlyProgress[];
      if (!progressData?.length) return null;
      
      // Sort by month and get latest
      const latest = progressData.sort((a, b) => b.month.localeCompare(a.month))[0];
      return {
        siteId: site.id,
        siteName: site.name,
        latestProgress: Number(latest.total_progress),
        latestStatus: latest.status,
        latestMonth: latest.month
      };
    }).filter(Boolean);

    const averageProgress = siteProgress.length 
      ? Math.round(siteProgress.reduce((sum: number, item: any) => sum + item!.latestProgress, 0) / siteProgress.length)
      : 0;

    const criticalSites = siteProgress.filter((item: any) => item!.latestStatus === 'critical').length;
    const problematicSites = siteProgress.filter((item: any) => item!.latestStatus === 'problematic').length;
    const goodSites = siteProgress.filter((item: any) => item!.latestStatus === 'good').length;

    return {
      totalSites,
      activeSites,
      averageProgress,
      criticalSites,
      problematicSites,
      goodSites,
      siteProgress
    };
  }
};