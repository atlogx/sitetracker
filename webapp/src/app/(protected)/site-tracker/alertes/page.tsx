"use client";

import { useState, useEffect } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Building2, 
  MapPin, 
  Mail,
  MailCheck,
  MailX,
  Loader2,
  ExternalLink,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface DatabaseAlert {
  id: string;
  project_id: string;
  site_id?: string;
  type: 'data_missing' | 'progress_alert' | 'pre_demobilization' | 'demobilization';
  title: string;
  message: string;
  recipients: string[];
  resolved: boolean;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  resolved_at?: string;
  sent_at?: string;
  // Relations
  projects?: {
    name: string;
    slug: string;
  };
  sites?: {
    name: string;
    slug: string;
  };
}

const alertTypeConfig = {
  data_missing: {
    label: 'Données manquantes',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertTriangle
  },
  progress_alert: {
    label: 'Alerte progression',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle
  },
  pre_demobilization: {
    label: 'Pré-démobilisation',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: AlertTriangle
  },
  demobilization: {
    label: 'Démobilisation',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle
  }
};

const statusConfig = {
  pending: {
    label: 'En attente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  sent: {
    label: 'Envoyé',
    color: 'bg-green-100 text-green-800',
    icon: MailCheck
  },
  failed: {
    label: 'Échec',
    color: 'bg-red-100 text-red-800',
    icon: MailX
  }
};

export default function AlertesPage() {
  const [alerts, setAlerts] = useState<DatabaseAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('active');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSite, setSelectedSite] = useState('none');
  const [selectedType, setSelectedType] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);



  useEffect(() => {
    fetchAlerts();
  }, []);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/alerts/projects');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded projects:', data);
        setProjects(data);
      } else {
        console.error('Failed to load projects:', response.status);
        toast.error('Erreur lors du chargement des projets');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Erreur lors du chargement des projets');
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadSites = async (projectId: string) => {
    if (!projectId) {
      setSites([]);
      return;
    }
    
    setLoadingSites(true);
    try {
      const response = await fetch(`/api/alerts/sites?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded sites for project', projectId, ':', data);
        setSites(data);
      } else {
        console.error('Failed to load sites:', response.status);
        toast.error('Erreur lors du chargement des sites');
      }
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error('Erreur lors du chargement des sites');
    } finally {
      setLoadingSites(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedSite('none');
    loadSites(projectId);
  };

  const handleCreateAlert = async () => {
    if (!selectedProject || !selectedType) {
      toast.error('Veuillez sélectionner un projet et un type d\'alerte');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/alerts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          siteId: selectedSite && selectedSite !== 'none' ? selectedSite : null,
          type: selectedType,
          customMessage: customMessage || undefined
        })
      });

      if (response.ok) {
        toast.success('Alerte créée avec succès');
        setDialogOpen(false);
        setSelectedProject('');
        setSelectedSite('none');
        setSelectedType('');
        setCustomMessage('');
        await fetchAlerts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Erreur lors de la création de l\'alerte');
    } finally {
      setCreating(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          projects:project_id(name, slug),
          sites:site_id(name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Erreur lors du chargement des alertes');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (alert: DatabaseAlert) => {
    try {
      setSendingEmails(prev => new Set([...prev, alert.id]));

      const payload = {
        alert_id: alert.id,
        type: alert.type,
        project_name: alert.projects?.name || 'Projet inconnu',
        site_name: alert.sites?.name,
        message: alert.message,
        recipients: alert.recipients,
        project_url: `${window.location.origin}/site-tracker/projects/${alert.projects?.slug}`,
        site_url: alert.sites?.slug ? 
          `${window.location.origin}/site-tracker/projects/${alert.projects?.slug}/sites/${alert.sites.slug}` 
          : undefined
      };

      const response = await fetch('/api/functions/send-alert-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }

      toast.success('Email envoyé avec succès');
      await fetchAlerts(); // Refresh data
      
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(alert.id);
        return newSet;
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alerte marquée comme résolue');
      await fetchAlerts();
      
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Erreur lors de la résolution de l\'alerte');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    // Filter by tab
    if (activeTab === 'active' && alert.resolved) return false;
    if (activeTab === 'resolved' && !alert.resolved) return false;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesProject = alert.projects?.name?.toLowerCase().includes(searchLower);
      const matchesSite = alert.sites?.name?.toLowerCase().includes(searchLower);
      const matchesMessage = alert.message.toLowerCase().includes(searchLower);
      
      if (!matchesProject && !matchesSite && !matchesMessage) return false;
    }

    // Filter by type
    if (filterType !== 'all' && alert.type !== filterType) return false;

    // Filter by status
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;

    return true;
  });

  const alertCounts = {
    active: alerts.filter(a => !a.resolved).length,
    resolved: alerts.filter(a => a.resolved).length,
    pending: alerts.filter(a => a.status === 'pending' && !a.resolved).length,
    critical: alerts.filter(a => 
      (a.type === 'pre_demobilization' || a.type === 'demobilization') && !a.resolved
    ).length
  };

  if (loading) {
    return (
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-6 border rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>

          {/* Filters Skeleton */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Tabs Skeleton */}
          <div className="flex space-x-1 p-1 bg-muted rounded-lg w-fit">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>

          {/* Alert Cards Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 border rounded-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Alertes</h1>
            <p className="text-muted-foreground">
              Suivez et gérez les alertes de vos projets
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={loadProjects}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Générer une alerte
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle alerte</DialogTitle>
                <DialogDescription>
                  Sélectionnez le projet, le site (optionnel) et le type d'alerte à générer.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="project">Projet *</Label>
                  <Select value={selectedProject} onValueChange={handleProjectChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingProjects ? (
                        <SelectItem value="loading" disabled>🔄 Chargement des projets...</SelectItem>
                      ) : projects.length === 0 ? (
                        <SelectItem value="no-projects" disabled>Aucun projet disponible</SelectItem>
                      ) : (
                        projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="site">Site (optionnel)</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite} disabled={!selectedProject}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un site" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun site spécifique</SelectItem>
                      {loadingSites ? (
                        <SelectItem value="loading" disabled>🔄 Chargement des sites...</SelectItem>
                      ) : selectedProject && sites.length === 0 ? (
                        <SelectItem value="no-sites" disabled>Aucun site trouvé</SelectItem>
                      ) : (
                        sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">Type d'alerte *</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_entry_delay">Retard de saisie</SelectItem>
                      <SelectItem value="problematic">Statut problématique</SelectItem>
                      <SelectItem value="critical">Statut critique</SelectItem>
                      <SelectItem value="pre_demobilization">Pré-démobilisation</SelectItem>
                      <SelectItem value="demobilization">Démobilisation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="message">Message personnalisé (optionnel)</Label>
                  <Textarea
                    id="message"
                    className="w-full"
                    placeholder="Laisser vide pour utiliser le message par défaut"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleCreateAlert} 
                  disabled={creating || loadingProjects || !selectedProject || !selectedType}
                >
                  {creating ? '🔄 Création...' : 'Créer l\'alerte'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alertes actives</p>
                  <p className="text-2xl font-bold">{alertCounts.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Résolues</p>
                  <p className="text-2xl font-bold">{alertCounts.resolved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En attente</p>
                  <p className="text-2xl font-bold">{alertCounts.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critiques</p>
                  <p className="text-2xl font-bold">{alertCounts.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par projet, site ou message..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type d'alerte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="data_missing">Données manquantes</SelectItem>
                  <SelectItem value="progress_alert">Alerte progression</SelectItem>
                  <SelectItem value="pre_demobilization">Pré-démobilisation</SelectItem>
                  <SelectItem value="demobilization">Démobilisation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut email" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              Alertes actives ({alertCounts.active})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Résolues ({alertCounts.resolved})
            </TabsTrigger>
            <TabsTrigger value="all">Toutes</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredAlerts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune alerte trouvée</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'active' 
                      ? 'Aucune alerte active pour le moment.' 
                      : 'Aucune alerte ne correspond à vos critères.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert) => {
                  const typeConfig = alertTypeConfig[alert.type];
                  const statusConf = statusConfig[alert.status];
                  const IconComponent = typeConfig.icon;
                  const StatusIcon = statusConf.icon;

                  return (
                    <Card key={alert.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <IconComponent className="h-5 w-5 text-muted-foreground" />
                              <Badge className={typeConfig.color}>
                                {typeConfig.label}
                              </Badge>
                              <Badge className={statusConf.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConf.label}
                              </Badge>
                              {alert.resolved && (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Résolue
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-lg font-semibold mb-2">{alert.title}</h3>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                <span>{alert.projects?.name || 'Projet inconnu'}</span>
                              </div>
                              {alert.sites && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{alert.sites.name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {format(new Date(alert.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                </span>
                              </div>
                            </div>

                            <p className="text-muted-foreground mb-4">{alert.message}</p>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span>Destinataires: {alert.recipients.join(', ')}</span>
                            </div>

                            {alert.sent_at && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <MailCheck className="h-4 w-4" />
                                <span>
                                  Envoyé le {format(new Date(alert.sent_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {alert.status === 'pending' && !alert.resolved && (
                              <Button
                                size="sm"
                                onClick={() => sendEmail(alert)}
                                disabled={sendingEmails.has(alert.id)}
                              >
                                {sendingEmails.has(alert.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Mail className="h-4 w-4 mr-2" />
                                )}
                                Envoyer email
                              </Button>
                            )}

                            {!alert.resolved && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marquer résolue
                              </Button>
                            )}

                            {alert.projects && (
                              <Button size="sm" variant="ghost" asChild>
                                <Link href={`/site-tracker/projects/${alert.projects.slug}`}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Voir projet
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}