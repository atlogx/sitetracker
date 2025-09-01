'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Building2,
  Users,
  MapPin,
  Plus,
  Edit2,
  Mail,
  Phone,
  Settings,
  Save

} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Project,
  MonthlyProgress,
  YearMonth
} from '@/types/models';

import MonthlyProgressDataTable from '@/components/progress/MonthlyProgressDataTable';
import ProjectSiteSwitcher from '@/components/projects/ProjectSiteSwitcher';
import ProjectAdministratorsManager from '@/components/projects/ProjectAdministratorsManager';
import { SiteForm } from '@/components/sites/SiteForm';
import { SiteCard } from '@/components/sites/SiteCard';
import { SiteStats } from '@/components/sites/SiteStats';

interface Site {
  id: string;
  name: string;
  code?: string;
  address: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  isActive?: boolean;
  projectDurationMonths?: number;
  startMonth?: string;
}

interface SiteFormData {
  name: string;
  code: string;
  address: string;
  project_id: string;
  project_duration_months: string;
  start_month: string;
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
}

interface ProjectInteractiveClientProps {
  project: Project;
  dashboardSiteId: string;
  allMonthly: Record<string, MonthlyProgress[]>;
  onUpdate?: () => void;
}

export default function ProjectInteractiveClient(props: ProjectInteractiveClientProps) {
  const { project, dashboardSiteId, allMonthly } = props;

  const [currentSiteId, setCurrentSiteId] = React.useState(dashboardSiteId);
  const [monthlyBySite, setMonthlyBySite] = React.useState(allMonthly);
  const [sites, setSites] = React.useState<Site[]>(project.sites.map(site => ({
    id: site.id,
    name: site.name,
    code: site.code || '',
    address: site.address || '',
    project_id: project.id,
    created_at: site.createdAt || new Date().toISOString(),
    updated_at: site.updatedAt || new Date().toISOString(),
    isActive: site.isActive,
    projectDurationMonths: site.projectDurationMonths,
    startMonth: site.startMonth
  })));

  // États pour les modales
  const [showProjectEditModal, setShowProjectEditModal] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    name: project.ownerName,
    email: project.ownerEmail,
    phone: project.ownerPhone || ''
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    code: '',
    address: '',
    project_id: project.id,
    project_duration_months: '',
    start_month: '',
    company: {
      name: '',
      address: '',
      email: '',
      phone: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSite = React.useMemo(
    () => sites.find(s => s.id === currentSiteId) || sites[0],
    [sites, currentSiteId]
  );

  const rows = monthlyBySite[currentSite?.id || ''] || [];

  function onChangeSite(siteId: string) {
    setCurrentSiteId(siteId);
  }

  const handleSaveMonthlyData = async (monthData: Partial<MonthlyProgress>) => {
    try {

      const updatedRows = [...rows];
      const existingIndex = updatedRows.findIndex(row => row.month === monthData.month);

      if (existingIndex >= 0) {
        updatedRows[existingIndex] = { ...updatedRows[existingIndex], ...monthData };
      } else {
        const newRow: MonthlyProgress = {
          id: `temp-${Date.now()}`,
          siteId: currentSite.id,
          month: monthData.month as YearMonth,
          totalProgress: monthData.totalProgress || 0,
          monthlyProgress: monthData.monthlyProgress || 0,
          targetRate: monthData.targetRate || 0,
          normalRate: monthData.normalRate || 0,
          delayRate: monthData.delayRate || 0,
          status: monthData.monthlyProgress && monthData.monthlyProgress < 30 ? 'critical' :
                  monthData.monthlyProgress && monthData.monthlyProgress < 50 ? 'problematic' : 'good',
          observations: monthData.observations,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedRows.push(newRow);
      }

      setMonthlyBySite(prev => ({
        ...prev,
        [currentSite.id]: updatedRows
      }));

    } catch (error) {
      console.error('Error saving monthly data:', error);
      throw error;
    }
  };

  // Fonctions de gestion des sites
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      project_id: project.id,
      project_duration_months: '',
      start_month: '',
      company: {
        name: '',
        address: '',
        email: '',
        phone: ''
      }
    });
    setEditingSite(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditDialogOpen(false);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      code: site.code || '',
      address: site.address || '',
      project_id: site.project_id,
      project_duration_months: site.projectDurationMonths?.toString() || '',
      start_month: site.startMonth || '',
      company: {
        name: '',
        address: '',
        email: '',
        phone: ''
      }
    });
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!formData.company.name.trim() || !formData.company.address.trim() ||
        !formData.company.email.trim() || !formData.company.phone.trim()) {
      toast.error("Veuillez remplir toutes les informations de l'entreprise exécutante");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.company.email)) {
      toast.error("Veuillez saisir une adresse email valide pour l'entreprise");
      return;
    }

    if (!editingSite) {
      if (!formData.project_duration_months || Number(formData.project_duration_months) <= 0) {
        toast.error("Veuillez renseigner une durée de chantier valide (en mois)");
        return;
      }
      if (!formData.start_month || !/^(0[1-9]|1[0-2])$/.test(formData.start_month)) {
        toast.error("Veuillez sélectionner un mois de début valide");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const url = '/api/sites';
      const method = editingSite ? 'PUT' : 'POST';
      const body = editingSite
        ? {
            id: editingSite.id,
            name: formData.name,
            address: formData.address,
            code: formData.code,
            company: formData.company
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok) {
        if (!contentType.includes('application/json')) {
          const raw = await response.text();
          throw new Error('Réponse inattendue du serveur (non JSON). Aperçu: ' + raw.slice(0, 200));
        }
        const result = await response.json();
        toast.success(editingSite ? "Site modifié avec succès" : "Site créé avec succès");

        if (editingSite) {
          setSites(prev => prev.map(site =>
            site.id === editingSite.id ? { ...site, ...formData } : site
          ));
        } else {
          setSites(prev => [...prev, {
            id: result.data.id,
            name: result.data.name,
            code: result.data.code || '',
            address: result.data.address || '',
            project_id: result.data.project_id,
            created_at: result.data.created_at,
            updated_at: result.data.updated_at,
            isActive: (result.data.is_active !== undefined ? result.data.is_active : true),
            projectDurationMonths: result.data.project_duration_months,
            startMonth: result.data.start_month
          }]);
        }

        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        resetForm();
      } else {
        let errorMessage = 'Erreur lors de la sauvegarde';
        if (contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
          } catch {
            // ignore json parse error
          }
        } else {
          const raw = await response.text();
          errorMessage = 'Erreur serveur non JSON: ' + raw.slice(0, 200);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      let message = error instanceof Error ? error.message : 'Erreur lors de la sauvegarde';

      if (/fetch failed/i.test(message) || (error instanceof TypeError && message === 'Failed to fetch')) {
        const offline = typeof navigator !== 'undefined' && navigator && navigator.onLine === false;
        if (offline) {
          message = "Connexion réseau interrompue. Vérifiez votre accès internet puis réessayez.";
        } else {
          message = "Impossible de joindre l'API (/api/sites). Le serveur ne répond pas ou une configuration proxy/firewall bloque la requête.";
        }
      } else if (/Configuration Supabase invalide/i.test(message)
        || /Missing SUPABASE_SERVICE_ROLE_KEY/i.test(message)
        || /Missing NEXT_PUBLIC_SUPABASE_URL/i.test(message)
        || /service role key/i.test(message)) {
        message = "Configuration serveur invalide (variables Supabase manquantes). Merci d'informer un administrateur.";
      } else if (message.startsWith('Erreur serveur non JSON')) {
        message = message + " — Le serveur a retourné du HTML (probable crash ou mauvaise variable d'environnement).";
      }

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOwnerUpdate = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_name: ownerForm.name,
          owner_email: ownerForm.email,
          owner_phone: ownerForm.phone
        }),
      });

      if (response.ok) {
        toast.success("Informations du maître d'ouvrage mises à jour");
        setIsEditingOwner(false);
        window.location.reload();
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch {
      toast.error("Erreur lors de la mise à jour du maître d'ouvrage");
    }
  };



  // Statistiques des sites
  const getSiteStatus = (site: Site) => {
    const siteProgress = monthlyBySite[site.id] || [];
    if (siteProgress.length === 0) return 'Non évalué';

    const latestProgress = siteProgress.reduce((latest, current) => {
      const currentDate = new Date(current.month);
      const latestDate = new Date(latest.month);
      return currentDate > latestDate ? current : latest;
    });

    if (latestProgress.monthlyProgress === null ||
        latestProgress.monthlyProgress === undefined ||
        latestProgress.monthlyProgress < 0) {
      return 'Non évalué';
    }

    const statusMap: Record<string, string> = {
      'good': 'Bon',
      'problematic': 'Problématique',
      'critical': 'Critique'
    };

    return statusMap[latestProgress.status] || latestProgress.status;
  };

  const stats = {
    total: sites.length,
    critical: sites.filter(s => getSiteStatus(s) === 'Critique').length,
    problematic: sites.filter(s => getSiteStatus(s) === 'Problématique').length,
    good: sites.filter(s => getSiteStatus(s) === 'Bon').length,
    notEvaluated: sites.filter(s => getSiteStatus(s) === 'Non évalué').length
  };

  return (
    <div className="space-y-6">
      {/* Card principale unique */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status === 'active' ? 'Actif' : 'Démobilisé'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Maître d&apos;ouvrage:</span>
                  <span className="font-medium">{project.ownerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Sites:</span>
                  <span className="font-medium">{sites.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Administrateurs:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{(project.administrators || []).length}</span>
                    {(project.administrators || []).length > 0 && (
                      <div className="flex -space-x-1">
                        {(project.administrators || []).slice(0, 3).map((admin) => (
                          <div
                            key={admin.id}
                            className="w-6 h-6 bg-primary/10 border-2 border-background rounded-full flex items-center justify-center text-xs font-medium"
                            title={`${admin.name} - ${admin.position || 'Administrateur'}`}
                          >
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {(project.administrators || []).length > 3 && (
                          <div className="w-6 h-6 bg-muted border-2 border-background rounded-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                            +{(project.administrators || []).length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setShowProjectEditModal(true)}
            >
              <Settings className="h-4 w-4" />
              Gérer le projet
            </Button>
          </div>

          {/* Onglets */}
          <Tabs defaultValue="tracking" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tracking">Suivi Mensuel</TabsTrigger>
              <TabsTrigger value="sites">Gestion des Sites</TabsTrigger>
            </TabsList>

            {/* Onglet Suivi Mensuel */}
            <TabsContent value="tracking" className="space-y-4 mt-4">
              {sites.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Aucun site pour le suivi mensuel</h3>
                    <p className="text-muted-foreground">
                      Pour commencer le suivi de l&apos;avancement, vous devez d&apos;abord créer un site pour ce projet.
                    </p>
                  </div>
                  <Button onClick={openCreateDialog} size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Créer un Site
                  </Button>
                </div>
              ) : (
                <>
                  <ProjectSiteSwitcher
                    project={project}
                    currentSiteId={currentSiteId}
                    onChangeSite={onChangeSite}
                  />

                  {currentSite && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <h3 className="font-semibold">{currentSite.name}</h3>
                          {currentSite.address && (
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {currentSite.address}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {rows.length} mois saisis
                          </Badge>
                          <Badge variant={currentSite.isActive ? 'default' : 'secondary'} className="text-xs">
                            {currentSite.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                      </div>

                      <MonthlyProgressDataTable
                        key={`${currentSite.id}-${currentSite.projectDurationMonths || 'dur'}-${currentSite.startMonth || 'start'}`}
                        site={{
                          ...currentSite,
                          projectId: currentSite.project_id,
                          createdAt: currentSite.created_at,
                          updatedAt: currentSite.updated_at,
                          companies: [],
                          administrators: [],
                          isActive: currentSite.isActive || false
                        }}
                        data={rows}
                        onSave={handleSaveMonthlyData}
                      />
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Onglet Gestion des Sites */}
            <TabsContent value="sites" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Sites du Projet</h3>
                  <p className="text-sm text-muted-foreground">Gérez les sites de ce projet</p>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Site
                </Button>
              </div>

              <SiteStats stats={stats} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={{
                      ...site,
                      monthly_progress: monthlyBySite[site.id]?.map(progress => ({
                        month: parseInt(progress.month.split('-')[1]),
                        year: parseInt(progress.month.split('-')[0]),
                        physical_progress_total: progress.totalProgress,
                        status: progress.status as 'bon' | 'problematique' | 'critique'
                      })) || []
                    }}
                    projectName={project.name}
                    onEdit={(siteToEdit) => openEditDialog(siteToEdit as Site)}
                    onDelete={(siteToDelete) => {
                      // Logique de suppression simple
                      if (confirm(`Êtes-vous sûr de vouloir supprimer le site "${siteToDelete.name}" ?`)) {
                        fetch(`/api/sites?id=${siteToDelete.id}`, { method: 'DELETE' })
                          .then(response => {
                            if (response.ok) {
                              setSites(prev => prev.filter(s => s.id !== siteToDelete.id));
                              toast.success("Site supprimé avec succès");
                            } else {
                              toast.error("Erreur lors de la suppression");
                            }
                          })
                          .catch(() => toast.error("Erreur lors de la suppression"));
                      }
                    }}
                  />
                ))}
              </div>

              {sites.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Aucun site configuré pour ce projet</p>
                  <Button onClick={openCreateDialog}>
                    Créer le premier site
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de gestion du projet */}
      <Dialog open={showProjectEditModal} onOpenChange={setShowProjectEditModal}>
        <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Gestion du projet
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informations du projet</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nom du projet</label>
                    <p className="text-sm font-medium mt-1">{project.name}</p>
                  </div>
                  {project.code && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Code</label>
                      <p className="text-sm mt-1">{project.code}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Statut</label>
                    <div className="mt-1">
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status === 'active' ? 'Actif' : 'Démobilisé'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Maître d&apos;ouvrage</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingOwner(!isEditingOwner)}
                    className="bg-primary/5 hover:bg-primary/10 border-primary/20"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {isEditingOwner ? 'Annuler' : 'Modifier'}
                  </Button>
                </div>

                {isEditingOwner ? (
                  <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label htmlFor="owner-name">Nom *</Label>
                      <Input
                        id="owner-name"
                        value={ownerForm.name}
                        onChange={(e) => setOwnerForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nom du maître d'ouvrage"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="owner-email">Email *</Label>
                      <Input
                        id="owner-email"
                        type="email"
                        value={ownerForm.email}
                        onChange={(e) => setOwnerForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="nom@example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="owner-phone">Téléphone</Label>
                      <Input
                        id="owner-phone"
                        type="tel"
                        value={ownerForm.phone}
                        onChange={(e) => setOwnerForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+224 622 123 456"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleOwnerUpdate} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingOwner(false);
                          setOwnerForm({
                            name: project.ownerName,
                            email: project.ownerEmail,
                            phone: project.ownerPhone || ''
                          });
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nom</label>
                      <p className="text-sm mt-1">{project.ownerName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm">{project.ownerEmail}</p>
                      </div>
                    </div>
                    {project.ownerPhone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{project.ownerPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <hr className="border-border" />

            <div className="space-y-6">
              <ProjectAdministratorsManager
                projectId={project.id}
                projectName={project.name}
                administrators={project.administrators || []}
                hideTitle={false}
                hideEmptyState={false}
                onAddAdministrator={async (adminData) => {
                  try {
                    // Créer l'administrateur
                    const adminResponse = await fetch('/api/administrators', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        ...adminData,
                        organization_id: project.organizationId || '',
                      }),
                    });

                    if (!adminResponse.ok) {
                      throw new Error('Erreur création administrateur');
                    }

                    const createdAdmin = await adminResponse.json();

                    // Lier au projet
                    const linkResponse = await fetch('/api/project-administrators', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        project_id: project.id,
                        administrator_id: createdAdmin.data.id,
                      }),
                    });

                    if (!linkResponse.ok) {
                      throw new Error('Erreur liaison administrateur');
                    }

                    toast.success('Administrateur ajouté avec succès');
                    if (props.onUpdate) props.onUpdate();
                  } catch (error) {
                    console.error('Erreur:', error);
                    toast.error('Erreur lors de l\'ajout de l\'administrateur');
                  }
                }}
                onUpdateAdministrator={async (adminId, adminData) => {
                  try {
                    const response = await fetch('/api/administrators', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        id: adminId,
                        ...adminData,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error('Erreur mise à jour administrateur');
                    }

                    toast.success('Administrateur mis à jour avec succès');
                    if (props.onUpdate) props.onUpdate();
                  } catch (error) {
                    console.error('Erreur:', error);
                    toast.error('Erreur lors de la mise à jour de l\'administrateur');
                  }
                }}
                onRemoveAdministrator={async (adminId) => {
                  try {
                    // Délier du projet
                    const unlinkResponse = await fetch(`/api/project-administrators?projectId=${project.id}&administratorId=${adminId}`, {
                      method: 'DELETE',
                    });

                    if (!unlinkResponse.ok) {
                      throw new Error('Erreur déliaison administrateur');
                    }

                    // Supprimer l'administrateur
                    const deleteResponse = await fetch(`/api/administrators?id=${adminId}`, {
                      method: 'DELETE',
                    });

                    if (!deleteResponse.ok) {
                      throw new Error('Erreur suppression administrateur');
                    }

                    toast.success('Administrateur supprimé avec succès');
                    if (props.onUpdate) props.onUpdate();
                  } catch (error) {
                    console.error('Erreur:', error);
                    toast.error('Erreur lors de la suppression de l\'administrateur');
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de création de site */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Créer un nouveau site</DialogTitle>
          </DialogHeader>

          <SiteForm
            data={formData}
            projects={[{ id: project.id, name: project.name }]}
            isSubmitting={isSubmitting}
            isEditing={false}
            onSubmit={handleSubmit}
            onChange={setFormData}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de modification de site */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le site</DialogTitle>
          </DialogHeader>

          <SiteForm
            data={formData}
            projects={[{ id: project.id, name: project.name }]}
            isSubmitting={isSubmitting}
            isEditing={true}
            onSubmit={handleSubmit}
            onChange={setFormData}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
