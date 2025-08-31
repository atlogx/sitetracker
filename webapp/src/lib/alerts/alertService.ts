import { getServiceSupabase } from '@/lib/serverSupabase';

interface AlertToCreate {
  project_id: string;
  site_id: string | null;
  type: 'data_entry_delay' | 'problematic' | 'critical' | 'pre_demobilization' | 'demobilization';
  title: string;
  message: string;
  recipients: string[];
  concerned_month?: number;
  concerned_year?: number;
}

export class AlertService {
  private supabase = getServiceSupabase();

  /**
   * Récupère tous les projets disponibles
   */
  async getProjects(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('id, name, client_name, client_email, project_director_email, mission_manager_email')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProjects:', error);
      return [];
    }
  }

  /**
   * Récupère les sites d'un projet
   */
  async getSitesByProject(projectId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('sites')
        .select('id, name, address')
        .eq('project_id', projectId)
        .order('name');

      if (error) {
        console.error('Error fetching sites:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSitesByProject:', error);
      return [];
    }
  }

  /**
   * Créé une alerte manuellement
   */
  async createManualAlert(params: {
    projectId: string;
    siteId: string | null;
    type: 'data_entry_delay' | 'problematic' | 'critical' | 'pre_demobilization' | 'demobilization';
    customMessage?: string;
  }): Promise<{ success: boolean; alertId?: string; error?: string }> {
    try {
      // Récupérer les informations du projet avec tous les emails
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('name, client_email, project_director_email, mission_manager_email')
        .eq('id', params.projectId)
        .single();

      if (projectError || !project) {
        return { success: false, error: 'Projet non trouvé' };
      }

      // Récupérer les informations du site si spécifié
      let siteName = '';
      if (params.siteId) {
        const { data: site } = await this.supabase
          .from('sites')
          .select('name')
          .eq('id', params.siteId)
          .single();
        
        siteName = site?.name || '';
      }

      // Construire le titre et message selon le type
      const { title, message } = this.generateAlertContent(
        params.type,
        project.name,
        siteName,
        params.customMessage
      );

      // Récupérer les destinataires
      const recipients = [
        project.client_email,
        project.project_director_email,
        project.mission_manager_email
      ].filter(email => email && email.trim().length > 0);

      if (recipients.length === 0) {
        recipients.push('admin@sitetracker.com');
      }

      // Créer l'alerte
      const { data, error } = await this.supabase
        .from('alerts')
        .insert({
          project_id: params.projectId,
          site_id: params.siteId,
          type: params.type,
          title,
          message,
          recipients
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating manual alert:', error);
        return { success: false, error: 'Erreur lors de la création de l\'alerte' };
      }

      return { success: true, alertId: data?.id };

    } catch (error) {
      console.error('Error in createManualAlert:', error);
      return { success: false, error: 'Erreur interne' };
    }
  }

  /**
   * Génère le contenu de l'alerte selon le type
   */
  private generateAlertContent(
    type: string,
    projectName: string,
    siteName: string,
    customMessage?: string
  ): { title: string; message: string } {
    const siteText = siteName ? ` - ${siteName}` : '';
    
    if (customMessage) {
      return {
        title: `${this.getTypeLabel(type)}${siteText}`,
        message: customMessage
      };
    }

    switch (type) {
      case 'data_entry_delay':
        return {
          title: `Retard de saisie${siteText}`,
          message: `Les données de progression pour ${siteName ? `le site "${siteName}" du ` : ''}projet "${projectName}" n'ont pas été saisies dans les délais.`
        };
      case 'problematic':
        return {
          title: `⚠️ Statut problématique${siteText}`,
          message: `${siteName ? `Le site "${siteName}" du ` : 'Le '}projet "${projectName}" présente un statut problématique nécessitant une attention particulière.`
        };
      case 'critical':
        return {
          title: `🚨 Statut critique${siteText}`,
          message: `${siteName ? `Le site "${siteName}" du ` : 'Le '}projet "${projectName}" présente un statut critique. Action immédiate requise.`
        };
      case 'pre_demobilization':
        return {
          title: `🚨 Pré-démobilisation${siteText}`,
          message: `${siteName ? `Le site "${siteName}" du ` : 'Le '}projet "${projectName}" est en phase de pré-démobilisation. Action immédiate requise pour éviter la démobilisation.`
        };
      case 'demobilization':
        return {
          title: `🔴 Démobilisation${siteText}`,
          message: `${siteName ? `Le site "${siteName}" du ` : 'Le '}projet "${projectName}" doit être démobilisé en raison de retards répétés.`
        };
      default:
        return {
          title: `Alerte${siteText}`,
          message: `Alerte générée pour ${siteName ? `le site "${siteName}" du ` : ''}projet "${projectName}".`
        };
    }
  }

  /**
   * Retourne le label d'un type d'alerte
   */
  private getTypeLabel(type: string): string {
    switch (type) {
      case 'data_entry_delay': return 'Retard de saisie';
      case 'problematic': return 'Statut problématique';
      case 'critical': return 'Statut critique';
      case 'pre_demobilization': return 'Pré-démobilisation';
      case 'demobilization': return 'Démobilisation';
      default: return 'Alerte';
    }
  }



  /**
   * Traite les alertes en attente
   */
  async processPendingAlerts(): Promise<void> {
    try {
      console.log('Processing pending alerts...');
      
      const { data: alerts, error } = await this.supabase
        .from('alerts')
        .select('*')
        .eq('status', 'pending');

      if (error) {
        console.error('Error fetching pending alerts:', error);
        return;
      }

      console.log(`Found ${alerts?.length || 0} pending alerts`);

      // Pour l'instant, marquer comme envoyées
      for (const alert of alerts || []) {
        await this.supabase
          .from('alerts')
          .update({ status: 'sent' })
          .eq('id', alert.id);
      }

      console.log('Pending alerts processed');
      
    } catch (error) {
      console.error('Error processing pending alerts:', error);
    }
  }

  /**
   * Marque une alerte comme envoyée
   */
  async markAlertAsSent(alertId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('alerts')
        .update({ 
          status: 'sent',
          sent_date: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('Error marking alert as sent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking alert as sent:', error);
      return false;
    }
  }

  /**
   * Récupère toutes les alertes avec pagination
   */
  async getAlerts(options: { 
    status?: 'pending' | 'sent' | 'failed';
    limit?: number;
    offset?: number;
  } = {}): Promise<any[]> {
    try {
      let query = this.supabase
        .from('alerts')
        .select(`
          *,
          projects:project_id(name, client_name),
          sites:site_id(name, address)
        `)
        .order('created_at', { ascending: false });

      if (options.status !== undefined) {
        query = query.eq('status', options.status);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAlerts:', error);
      return [];
    }
  }
}

// Instance singleton du service
export const alertService = new AlertService();